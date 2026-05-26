import { canAccess, getPermissionMapForActor, type CmsRole, normalizeCmsRole } from "@imsys/auth";
import { captureException, withSentry } from "@sentry/cloudflare";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { ZodError } from "zod";
import { normalizeAppEnv } from "./lib/app-env";
import type {
  AuditLogEntry,
  Category,
  CategoryCreateInput,
  CategoryUpdateInput,
  Item,
  ItemCreateInput,
  ItemUpdateInput,
  ManagedUser,
  ManagedUserCreateInput,
  ManagedUserRole,
  ManagedUserUpdateInput,
  Profile,
} from "@imsys/types";
import {
  auditLogListSchema,
  categoryCreateInputSchema,
  categoryListSchema,
  categorySchema,
  categoryUpdateInputSchema,
  diagnosticsResponseSchema,
  itemCreateInputSchema,
  itemListSchema,
  itemSchema,
  itemUpdateInputSchema,
  managedUserCreateInputSchema,
  managedUserListSchema,
  managedUserSchema,
  managedUserUpdateInputSchema,
  schemaStateSchema
} from "@imsys/types";

type AssetBinding = {
  fetch: (request: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

interface Env {
  ASSETS: AssetBinding;
  APP_ENV?: string;
  APP_NAME?: string;
  CORS_ORIGINS?: string;
  INVITE_REDIRECT_ORIGINS?: string;
  INVITE_REDIRECT_TO?: string;
  RATE_LIMIT_ADMIN_MAX?: string;
  RATE_LIMIT_MAX?: string;
  RATE_LIMIT_WINDOW_MS?: string;
  TRACE_ID?: string;
  SENTRY_DSN?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
}

type VerifiedIdentity = {
  id: string;
  email?: string;
  role?: string;
  appMetadata: unknown;
  accessToken: string;
};

declare global {
  var __IMSYS_VERIFY_ACCESS_TOKEN__:
    | ((authorizationHeader: string | null, env: Env) => Promise<VerifiedIdentity>)
    | undefined;
}

type AuthenticatedActor = {
  id: string;
  email?: string;
  cmsRole: CmsRole;
  disabled: boolean;
  accessToken: string;
};

type ApiEnvelope<T> = {
  data?: T;
  error?: string;
};

type SupabaseAuthUser = {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
  last_sign_in_at?: string;
  banned_until?: string | null;
};

type SupabaseAuthUserResponse = {
  user: SupabaseAuthUser;
};

type SupabaseListUsersResponse = {
  users: SupabaseAuthUser[];
};

type DiagnosticsResponse = {
  checkedAt: string;
  checks: Record<string, {
    ok: boolean;
    expected?: string | null;
    actual?: string | null;
  }>;
};

type ItemRow = {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
};

type CategoryRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  email: string;
  role: string;
  disabled: boolean;
  created_at: string;
  updated_at: string;
};

type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  target_user_id: string | null;
  action: string;
  resource: string;
  payload_summary: Record<string, unknown>;
  created_at: string;
};

type SchemaStateRow = {
  singleton_key: string;
  schema_version: string;
  updated_at: string;
};

let jwksByIssuer = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
let rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
let rateLimitCleanupCounter = 0;

const APP_SCHEMA_VERSION = "2026-05-22-env-scoped-data-v1";

class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const assertPasswordStrength = (password?: string) => {
  if (!password) {
    return;
  }

  if (
    password.length < 12
    || !/[A-Z]/.test(password)
    || !/[a-z]/.test(password)
    || !/\d/.test(password)
  ) {
    throw new HttpError(
      "Password must be at least 12 characters and include uppercase, lowercase, and number",
      400
    );
  }
};

const json = (data: unknown, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
};

const getAppEnv = (env: Env) => normalizeAppEnv(env.APP_ENV ?? "production");

const getTraceId = (env: Env) => env.TRACE_ID?.trim() || null;

const logEvent = (
  level: "info" | "warn" | "error",
  message: string,
  env: Env,
  extra?: Record<string, unknown>
) => {
  console[level](JSON.stringify({
    level,
    message,
    trace_id: getTraceId(env),
    service: env.APP_NAME ?? "your-app-web",
    environment: env.APP_ENV ?? "production",
    ...(extra ?? {}),
  }));
};

const getAllowedOrigin = (request: Request, env: Env) => {
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) {
    return null;
  }

  const allowedOrigins = (env.CORS_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0) {
    return requestOrigin;
  }

  return allowedOrigins.includes(requestOrigin) ? requestOrigin : null;
};

const withCorsHeaders = (response: Response, request: Request, env: Env) => {
  const headers = new Headers(response.headers);
  const origin = getAllowedOrigin(request, env);

  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
  }

  headers.set("access-control-allow-methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
  headers.set("access-control-allow-headers", "Authorization,Content-Type");
  headers.set("access-control-max-age", "86400");
  headers.set("x-edge-runtime", "cloudflare-workers");
  if (getTraceId(env)) {
    headers.set("x-trace-id", getTraceId(env) as string);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const apiResponse = <T>(request: Request, env: Env, data: T, status = 200) =>
  withCorsHeaders(json({ data } satisfies ApiEnvelope<T>, { status }), request, env);

const apiError = (request: Request, env: Env, status: number, error: string) =>
  withCorsHeaders(json({ error }, { status }), request, env);

const getSupabaseUrl = (env: Env) => {
  const supabaseUrl = env.SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is required");
  }

  return supabaseUrl.replace(/\/$/, "");
};

const getServiceRoleKey = (env: Env) => {
  const value = env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!value) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is required");
  }

  return value;
};

const getAllowedInviteOrigins = (env: Env) => {
  const configuredOrigins = (env.INVITE_REDIRECT_ORIGINS ?? env.CORS_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (env.INVITE_REDIRECT_TO?.trim()) {
    configuredOrigins.push(new URL(env.INVITE_REDIRECT_TO.trim()).origin);
  }

  return new Set(configuredOrigins);
};

const validateInviteRedirect = (env: Env, redirectTo?: string) => {
  if (!redirectTo) {
    return;
  }

  const allowedOrigins = getAllowedInviteOrigins(env);
  const redirectUrl = new URL(redirectTo);

  if (allowedOrigins.size === 0 || !allowedOrigins.has(redirectUrl.origin)) {
    throw new HttpError("Invalid invite redirect URL", 400);
  }
};

const getAdminHeaders = (env: Env, extras?: HeadersInit) => ({
  apikey: getServiceRoleKey(env),
  authorization: `Bearer ${getServiceRoleKey(env)}`,
  "content-type": "application/json",
  "x-app-env": getAppEnv(env),
  ...(getTraceId(env) ? { "x-trace-id": getTraceId(env) as string } : {}),
  ...(extras ?? {}),
});

const getRestUrl = (env: Env, pathname: string) =>
  `${getSupabaseUrl(env)}/rest/v1${pathname}`;

const getAuthUrl = (env: Env, pathname: string) =>
  `${getSupabaseUrl(env)}/auth/v1${pathname}`;

type ErrorPayload = {
  message?: string;
  msg?: string;
  error?: string;
  error_description?: string;
};

const getErrorMessage = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const payload = value as ErrorPayload;
  return payload.message ?? payload.msg ?? payload.error_description ?? payload.error;
};

const parseJson = async <T>(response: Response): Promise<T> => {
  const body = await response.json() as T | ErrorPayload;
  if (!response.ok) {
    const message = getErrorMessage(body);
    throw new Error(message ?? `Request failed with ${response.status}`);
  }
  return body as T;
};

const getJwtSet = (supabaseUrl: string) => {
  const issuer = `${supabaseUrl}/auth/v1`;
  const existing = jwksByIssuer.get(issuer);
  if (existing) {
    return existing;
  }

  const next = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  jwksByIssuer.set(issuer, next);
  return next;
};

const verifyAccessToken = async (authorizationHeader: string | null, env: Env): Promise<VerifiedIdentity> => {
  const testHook = globalThis.__IMSYS_VERIFY_ACCESS_TOKEN__;
  if (typeof testHook === "function" && authorizationHeader) {
    return testHook(authorizationHeader, env);
  }

  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new HttpError("Unauthorized", 401);
  }

  const accessToken = authorizationHeader.slice("Bearer ".length).trim();
  const supabaseUrl = getSupabaseUrl(env);
  const issuer = `${supabaseUrl}/auth/v1`;
  let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"];

  try {
    ({ payload } = await jwtVerify(accessToken, getJwtSet(supabaseUrl), { issuer }));
  } catch {
    throw new HttpError("Unauthorized", 401);
  }

  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new HttpError("Unauthorized", 401);
  }

  return {
    id: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    role: typeof payload.role === "string" ? payload.role : undefined,
    appMetadata: typeof payload.app_metadata === "object" ? payload.app_metadata : null,
    accessToken,
  };
};

const isProtectedBootstrapEmail = (_email?: string | null) => false;

const mapProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  email: row.email,
  role: normalizeCmsRole(row.role) ?? "viewer",
  disabled: Boolean(row.disabled),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getProfileById = async (env: Env, id: string): Promise<Profile | null> => {
  const response = await fetch(
    `${getRestUrl(env, "/profiles")}?id=eq.${encodeURIComponent(id)}&app_env=eq.${encodeURIComponent(getAppEnv(env))}&select=*`,
    {
      headers: getAdminHeaders(env),
    }
  );
  const rows = await parseJson<ProfileRow[]>(response);
  return rows[0] ? mapProfile(rows[0]) : null;
};

const listProfiles = async (env: Env): Promise<Profile[]> => {
  const response = await fetch(
    `${getRestUrl(env, "/profiles")}?app_env=eq.${encodeURIComponent(getAppEnv(env))}&select=*&order=created_at.desc`,
    { headers: getAdminHeaders(env) }
  );
  const rows = await parseJson<ProfileRow[]>(response);
  return rows.map(mapProfile);
};

const getAuthUserSnapshot = async (env: Env, id: string): Promise<SupabaseAuthUser | null> => {
  const response = await fetch(getAuthUrl(env, `/admin/users/${id}`), {
    headers: getAdminHeaders(env),
  });

  if (response.status === 404) {
    return null;
  }

  const payload = await parseJson<SupabaseAuthUserResponse>(response);
  return payload.user;
};

const upsertProfile = async (
  env: Env,
  input: { id: string; email: string; role?: ManagedUserRole; disabled?: boolean }
): Promise<Profile> => {
  const existing = await getProfileById(env, input.id);
  const role = input.role ?? existing?.role ?? "viewer";
  const disabled = input.disabled ?? existing?.disabled ?? false;
  const createdAt = existing?.createdAt ?? new Date().toISOString();
  const updatedAt = new Date().toISOString();

  const response = await fetch(`${getRestUrl(env, "/profiles")}?on_conflict=id,app_env`, {
    method: "POST",
    headers: getAdminHeaders(env, {
      Prefer: "resolution=merge-duplicates,return=representation",
    }),
    body: JSON.stringify({
      id: input.id,
      app_env: getAppEnv(env),
      email: input.email,
      role,
      disabled,
      created_at: createdAt,
      updated_at: updatedAt,
    }),
  });

  const rows = await parseJson<ProfileRow[]>(response);
  if (!rows[0]) {
    throw new Error("Profile upsert did not return a row");
  }

  return mapProfile(rows[0]);
};

const ensureProfileForIdentity = async (env: Env, identity: VerifiedIdentity): Promise<Profile> => {
  const existing = await getProfileById(env, identity.id);
  if (existing) {
    return existing;
  }

  const authUser = await getAuthUserSnapshot(env, identity.id);
  return upsertProfile(env, {
    id: identity.id,
    email: authUser?.email ?? identity.email ?? "",
    role: "viewer",
    disabled: Boolean(authUser?.banned_until && authUser.banned_until !== "none"),
  });
};

const requireActor = async (request: Request, env: Env): Promise<AuthenticatedActor> => {
  const identity = await verifyAccessToken(request.headers.get("authorization"), env);
  const profile = await ensureProfileForIdentity(env, identity);

  return {
    id: identity.id,
    email: identity.email,
    cmsRole: profile.role,
    disabled: profile.disabled,
    accessToken: identity.accessToken,
  };
};

const requirePermission = (actor: AuthenticatedActor, resource: "items" | "categories" | "users", action: "read" | "create" | "update" | "delete") => {
  const permissionMap = getPermissionMapForActor({
    role: actor.cmsRole,
    disabled: actor.disabled,
  });

  if (!canAccess(permissionMap, resource, action)) {
    throw new HttpError("Forbidden", 403);
  }
};

const getRateLimitWindowMs = (env: Env) => Number(env.RATE_LIMIT_WINDOW_MS ?? "60000");
const getRateLimitMax = (env: Env, pathname: string) => Number(
  pathname.startsWith("/api/admin/") || pathname.startsWith("/api/users")
    ? env.RATE_LIMIT_ADMIN_MAX ?? "20"
    : env.RATE_LIMIT_MAX ?? "120"
);

const getClientAddress = (request: Request) =>
  request.headers.get("cf-connecting-ip")
  ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  ?? "unknown";

const enforceRateLimit = (request: Request, env: Env, pathname: string) => {
  const now = Date.now();
  rateLimitCleanupCounter += 1;

  if (rateLimitCleanupCounter % 100 === 0) {
    for (const [key, bucket] of rateLimitBuckets.entries()) {
      if (bucket.resetAt <= now) {
        rateLimitBuckets.delete(key);
      }
    }
  }

  const clientAddress = getClientAddress(request);
  const routeGroup = pathname.startsWith("/api/admin/") || pathname.startsWith("/api/users")
    ? "admin"
    : "default";
  const key = `${clientAddress}:${routeGroup}`;
  const current = rateLimitBuckets.get(key);
  const windowMs = getRateLimitWindowMs(env);
  const limit = getRateLimitMax(env, pathname);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return;
  }

  if (current.count >= limit) {
    throw new HttpError("Too many requests", 429);
  }

  current.count += 1;
};

const mapItem = (row: ItemRow): Item => ({
  id: row.id,
  name: row.name,
  categoryId: row.category_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapManagedUser = (user: SupabaseAuthUser, profile?: Profile): ManagedUser => ({
  id: user.id,
  email: user.email ?? "",
  cmsRole: profile?.role ?? "viewer",
  disabled: profile?.disabled ?? Boolean(user.banned_until && user.banned_until !== "none"),
  lastSignInAt: user.last_sign_in_at ?? null,
  createdAt: user.created_at,
  updatedAt: user.updated_at ?? user.created_at,
  protected: isProtectedBootstrapEmail(user.email ?? ""),
});

const mapAuditLog = (row: AuditLogRow): AuditLogEntry => ({
  id: row.id,
  actorUserId: row.actor_user_id,
  targetUserId: row.target_user_id,
  action: row.action,
  resource: row.resource,
  payloadSummary: row.payload_summary ?? {},
  createdAt: row.created_at,
});

const readJson = async <T>(request: Request): Promise<T> => {
  const body = await request.json() as T;
  return body;
};

const getCategoryForUser = async (env: Env, userId: string, categoryId: string) => {
  const appEnv = getAppEnv(env);
  const response = await fetch(
    `${getRestUrl(env, "/categories")}?id=eq.${encodeURIComponent(categoryId)}&user_id=eq.${encodeURIComponent(userId)}&app_env=eq.${encodeURIComponent(appEnv)}&select=*`,
    { headers: getAdminHeaders(env) }
  );
  const rows = await parseJson<CategoryRow[]>(response);
  return rows[0] ?? null;
};

const getItemForUser = async (env: Env, userId: string, itemId: string) => {
  const appEnv = getAppEnv(env);
  const response = await fetch(
    `${getRestUrl(env, "/items")}?id=eq.${encodeURIComponent(itemId)}&user_id=eq.${encodeURIComponent(userId)}&app_env=eq.${encodeURIComponent(appEnv)}&select=*`,
    { headers: getAdminHeaders(env) }
  );
  const rows = await parseJson<ItemRow[]>(response);
  return rows[0] ?? null;
};

const getItems = async (env: Env, userId: string): Promise<Item[]> => {
  const appEnv = getAppEnv(env);
  const response = await fetch(
    `${getRestUrl(env, "/items")}?user_id=eq.${encodeURIComponent(userId)}&app_env=eq.${encodeURIComponent(appEnv)}&select=*&order=created_at.desc`,
    { headers: getAdminHeaders(env) }
  );
  const rows = await parseJson<ItemRow[]>(response);
  return itemListSchema.parse(rows.map(mapItem));
};

const createItem = async (env: Env, userId: string, input: ItemCreateInput): Promise<Item> => {
  const appEnv = getAppEnv(env);
  if (input.categoryId) {
    const category = await getCategoryForUser(env, userId, input.categoryId);
    if (!category) {
      throw new HttpError("Category not found", 404);
    }
  }

  const response = await fetch(getRestUrl(env, "/items"), {
    method: "POST",
    headers: getAdminHeaders(env, {
      Prefer: "return=representation",
    }),
    body: JSON.stringify({
      app_env: appEnv,
      user_id: userId,
      category_id: input.categoryId ?? null,
      name: input.name,
    }),
  });
  const rows = await parseJson<ItemRow[]>(response);
  return itemSchema.parse(mapItem(rows[0]));
};

const updateItem = async (env: Env, userId: string, itemId: string, input: ItemUpdateInput): Promise<Item | null> => {
  const appEnv = getAppEnv(env);
  const existing = await getItemForUser(env, userId, itemId);
  if (!existing) {
    return null;
  }

  const categoryId = input.categoryId === undefined ? existing.category_id : input.categoryId;
  if (categoryId) {
    const category = await getCategoryForUser(env, userId, categoryId);
    if (!category) {
      throw new HttpError("Category not found", 404);
    }
  }

  const response = await fetch(
    `${getRestUrl(env, "/items")}?id=eq.${encodeURIComponent(itemId)}&user_id=eq.${encodeURIComponent(userId)}&app_env=eq.${encodeURIComponent(appEnv)}`,
    {
      method: "PATCH",
      headers: getAdminHeaders(env, {
        Prefer: "return=representation",
      }),
      body: JSON.stringify({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.categoryId !== undefined ? { category_id: input.categoryId } : {}),
      }),
    }
  );
  const rows = await parseJson<ItemRow[]>(response);
  return rows[0] ? itemSchema.parse(mapItem(rows[0])) : null;
};

const deleteItem = async (env: Env, userId: string, itemId: string): Promise<boolean> => {
  const appEnv = getAppEnv(env);
  const existing = await getItemForUser(env, userId, itemId);
  if (!existing) {
    return false;
  }

  await fetch(
    `${getRestUrl(env, "/items")}?id=eq.${encodeURIComponent(itemId)}&user_id=eq.${encodeURIComponent(userId)}&app_env=eq.${encodeURIComponent(appEnv)}`,
    {
      method: "DELETE",
      headers: getAdminHeaders(env),
    }
  );
  return true;
};

const getCategories = async (env: Env, userId: string): Promise<Category[]> => {
  const appEnv = getAppEnv(env);
  const response = await fetch(
    `${getRestUrl(env, "/categories")}?user_id=eq.${encodeURIComponent(userId)}&app_env=eq.${encodeURIComponent(appEnv)}&select=*&order=created_at.desc`,
    { headers: getAdminHeaders(env) }
  );
  const rows = await parseJson<CategoryRow[]>(response);
  return categoryListSchema.parse(rows.map(mapCategory));
};

const getCategoryById = async (env: Env, userId: string, categoryId: string) => {
  const appEnv = getAppEnv(env);
  const response = await fetch(
    `${getRestUrl(env, "/categories")}?id=eq.${encodeURIComponent(categoryId)}&user_id=eq.${encodeURIComponent(userId)}&app_env=eq.${encodeURIComponent(appEnv)}&select=*`,
    { headers: getAdminHeaders(env) }
  );
  const rows = await parseJson<CategoryRow[]>(response);
  return rows[0] ?? null;
};

const createCategory = async (env: Env, userId: string, input: CategoryCreateInput): Promise<Category> => {
  const appEnv = getAppEnv(env);
  const response = await fetch(getRestUrl(env, "/categories"), {
    method: "POST",
    headers: getAdminHeaders(env, {
      Prefer: "return=representation",
    }),
    body: JSON.stringify({
      app_env: appEnv,
      user_id: userId,
      name: input.name,
    }),
  });
  const rows = await parseJson<CategoryRow[]>(response);
  return categorySchema.parse(mapCategory(rows[0]));
};

const updateCategory = async (env: Env, userId: string, categoryId: string, input: CategoryUpdateInput): Promise<Category | null> => {
  const appEnv = getAppEnv(env);
  const existing = await getCategoryById(env, userId, categoryId);
  if (!existing) {
    return null;
  }

  const response = await fetch(
    `${getRestUrl(env, "/categories")}?id=eq.${encodeURIComponent(categoryId)}&user_id=eq.${encodeURIComponent(userId)}&app_env=eq.${encodeURIComponent(appEnv)}`,
    {
      method: "PATCH",
      headers: getAdminHeaders(env, {
        Prefer: "return=representation",
      }),
      body: JSON.stringify({
        ...(input.name !== undefined ? { name: input.name } : {}),
      }),
    }
  );
  const rows = await parseJson<CategoryRow[]>(response);
  return rows[0] ? categorySchema.parse(mapCategory(rows[0])) : null;
};

const deleteCategory = async (env: Env, userId: string, categoryId: string): Promise<boolean> => {
  const appEnv = getAppEnv(env);
  const existing = await getCategoryById(env, userId, categoryId);
  if (!existing) {
    return false;
  }

  await fetch(
    `${getRestUrl(env, "/categories")}?id=eq.${encodeURIComponent(categoryId)}&user_id=eq.${encodeURIComponent(userId)}&app_env=eq.${encodeURIComponent(appEnv)}`,
    {
      method: "DELETE",
      headers: getAdminHeaders(env),
    }
  );
  return true;
};

const writeAuditLog = async (
  env: Env,
  payload: {
    actorUserId?: string | null;
    targetUserId?: string | null;
    action: string;
    resource: string;
    payloadSummary?: Record<string, unknown>;
  }
) => {
  await fetch(getRestUrl(env, "/audit_logs"), {
    method: "POST",
    headers: getAdminHeaders(env),
    body: JSON.stringify({
      app_env: getAppEnv(env),
      actor_user_id: payload.actorUserId ?? null,
      target_user_id: payload.targetUserId ?? null,
      action: payload.action,
      resource: payload.resource,
      payload_summary: payload.payloadSummary ?? {},
    }),
  });
};

const listUsers = async (env: Env): Promise<ManagedUser[]> => {
  const [usersResponse, profiles] = await Promise.all([
    fetch(getAuthUrl(env, "/admin/users?page=1&per_page=200"), {
      headers: getAdminHeaders(env),
    }).then(parseJson<SupabaseListUsersResponse>),
    listProfiles(env),
  ]);
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return usersResponse.users
    .map((user) => mapManagedUser(user, profileMap.get(user.id)))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

const createUser = async (env: Env, input: ManagedUserCreateInput, actorUserId?: string) => {
  assertPasswordStrength(input.password);
  validateInviteRedirect(env, input.redirectTo);
  const path = input.password ? "/admin/users" : "/invite";
  const response = await fetch(getAuthUrl(env, path), {
    method: "POST",
    headers: getAdminHeaders(env),
    body: JSON.stringify(
      input.password
        ? {
            email: input.email,
            password: input.password,
            email_confirm: true,
          }
        : {
            email: input.email,
            data: {
              cmsRole: input.cmsRole,
            },
            ...(input.redirectTo ? { redirect_to: input.redirectTo } : {}),
          }
    ),
  });
  const payload = await parseJson<SupabaseAuthUser | SupabaseAuthUserResponse>(response);
  const user = "user" in payload ? payload.user : payload;
  const profile = await upsertProfile(env, {
    id: user.id,
    email: user.email ?? input.email,
    role: input.cmsRole,
    disabled: false,
  });

  await writeAuditLog(env, {
    actorUserId: actorUserId ?? null,
    targetUserId: user.id,
    action: input.password ? "create" : "invite",
    resource: "users",
    payloadSummary: {
      email: user.email ?? input.email,
      cmsRole: input.cmsRole,
      mode: input.password ? "temporary_password" : "invite",
    },
  });

  return managedUserSchema.parse(mapManagedUser(user, profile));
};

const updateUser = async (env: Env, id: string, input: ManagedUserUpdateInput, actorUserId?: string) => {
  const existingResponse = await fetch(getAuthUrl(env, `/admin/users/${id}`), {
    headers: getAdminHeaders(env),
  });
  if (existingResponse.status === 404) {
    return null;
  }

  const existingPayload = await parseJson<SupabaseAuthUserResponse>(existingResponse);
  const existing = existingPayload.user;
  const existingProfile = await getProfileById(env, id);

  assertPasswordStrength(input.password);
  let user = existing;
  if (input.password) {
    const updateResponse = await fetch(getAuthUrl(env, `/admin/users/${id}`), {
      method: "PUT",
      headers: getAdminHeaders(env),
      body: JSON.stringify({ password: input.password }),
    });
    const updatedPayload = await parseJson<SupabaseAuthUser | SupabaseAuthUserResponse>(updateResponse);
    user = "user" in updatedPayload ? updatedPayload.user : updatedPayload;
  }

  const profile = await upsertProfile(env, {
    id: user.id,
    email: user.email ?? existing.email ?? "",
    role: input.cmsRole,
    disabled: input.disabled,
  });

  const auditActions: string[] = [];
  if (typeof input.cmsRole === "string" && input.cmsRole !== (existingProfile?.role ?? profile.role)) {
    auditActions.push("role_change");
  }
  if (typeof input.disabled === "boolean") {
    auditActions.push(input.disabled ? "disable" : "reactivate");
  }
  if (input.password) {
    auditActions.push("password_reset");
  }
  if (auditActions.length === 0) {
    auditActions.push("update");
  }

  for (const action of auditActions) {
    await writeAuditLog(env, {
      actorUserId: actorUserId ?? null,
      targetUserId: user.id,
      action,
      resource: "users",
      payloadSummary: {
        email: user.email ?? existing.email ?? "",
        cmsRole: input.cmsRole ?? profile.role,
        disabled: typeof input.disabled === "boolean" ? input.disabled : profile.disabled,
      },
    });
  }

  return managedUserSchema.parse(mapManagedUser(user, profile));
};

const getDiagnostics = async (env: Env): Promise<DiagnosticsResponse> => {
  const checkedAt = new Date().toISOString();
  const [schemaRowsResponse, authResponse, bucketsResponse, profilesResponse] = await Promise.all([
    fetch(`${getRestUrl(env, "/app_schema_state")}?singleton_key=eq.current&select=*`, {
      headers: getAdminHeaders(env),
    }),
    fetch(getAuthUrl(env, "/admin/users?page=1&per_page=1"), {
      headers: getAdminHeaders(env),
    }),
    fetch(`${getSupabaseUrl(env)}/storage/v1/bucket`, {
      headers: getAdminHeaders(env, { accept: "application/json" }),
    }),
    fetch(`${getRestUrl(env, "/profiles")}?app_env=eq.${encodeURIComponent(getAppEnv(env))}&select=id&limit=1`, {
      headers: getAdminHeaders(env),
    }),
  ]);

  const schemaRows = schemaStateSchema.array().parse(await parseJson<SchemaStateRow[]>(schemaRowsResponse));
  await parseJson<SupabaseListUsersResponse>(authResponse);
  const buckets = await parseJson<Array<{ id: string; name: string }>>(bucketsResponse);
  const profilesRows = await parseJson<Array<{ id: string }>>(profilesResponse);
  const currentVersion = schemaRows[0]?.schema_version ?? null;

  return diagnosticsResponseSchema.parse({
    checkedAt,
    checks: {
      database: {
        ok: schemaRowsResponse.ok,
      },
      authAdmin: {
        ok: true,
      },
      storageBucket: {
        ok: buckets.some((bucket) => bucket.id === "cms-assets"),
      },
      profilesTable: {
        ok: Array.isArray(profilesRows),
      },
      schemaVersion: {
        ok: currentVersion === APP_SCHEMA_VERSION,
        expected: APP_SCHEMA_VERSION,
        actual: currentVersion,
      },
    },
  });
};

const listAuditLogs = async (env: Env): Promise<AuditLogEntry[]> => {
  const response = await fetch(
    `${getRestUrl(env, "/audit_logs")}?app_env=eq.${encodeURIComponent(getAppEnv(env))}&select=*&order=created_at.desc&limit=25`,
    { headers: getAdminHeaders(env) }
  );
  const rows = await parseJson<AuditLogRow[]>(response);
  return auditLogListSchema.parse(rows.map(mapAuditLog));
};

const handleApiRequest = async (request: Request, env: Env, url: URL) => {
  const pathname = url.pathname.replace(/^\/api/, "") || "/";
  const actor = await requireActor(request, env);

  if (pathname === "/items" && request.method === "GET") {
    requirePermission(actor, "items", "read");
    return apiResponse(request, env, itemListSchema.parse(await getItems(env, actor.id)));
  }

  if (pathname === "/items" && request.method === "POST") {
    requirePermission(actor, "items", "create");
    const body = itemCreateInputSchema.parse(await readJson(request));
    return apiResponse(request, env, itemSchema.parse(await createItem(env, actor.id, body)), 201);
  }

  const itemMatch = pathname.match(/^\/items\/([^/]+)$/);
  if (itemMatch && request.method === "PUT") {
    requirePermission(actor, "items", "update");
    const item = await updateItem(env, actor.id, itemMatch[1], itemUpdateInputSchema.parse(await readJson(request)));
    if (!item) {
      return apiError(request, env, 404, "Item not found");
    }
    return apiResponse(request, env, itemSchema.parse(item));
  }

  if (itemMatch && request.method === "DELETE") {
    requirePermission(actor, "items", "delete");
    const removed = await deleteItem(env, actor.id, itemMatch[1]);
    if (!removed) {
      return apiError(request, env, 404, "Item not found");
    }
    return apiResponse(request, env, true);
  }

  if (pathname === "/categories" && request.method === "GET") {
    requirePermission(actor, "categories", "read");
    return apiResponse(request, env, categoryListSchema.parse(await getCategories(env, actor.id)));
  }

  if (pathname === "/categories" && request.method === "POST") {
    requirePermission(actor, "categories", "create");
    const body = categoryCreateInputSchema.parse(await readJson(request));
    return apiResponse(request, env, categorySchema.parse(await createCategory(env, actor.id, body)), 201);
  }

  const categoryMatch = pathname.match(/^\/categories\/([^/]+)$/);
  if (categoryMatch && request.method === "PUT") {
    requirePermission(actor, "categories", "update");
    const category = await updateCategory(env, actor.id, categoryMatch[1], categoryUpdateInputSchema.parse(await readJson(request)));
    if (!category) {
      return apiError(request, env, 404, "Category not found");
    }
    return apiResponse(request, env, categorySchema.parse(category));
  }

  if (categoryMatch && request.method === "DELETE") {
    requirePermission(actor, "categories", "delete");
    const removed = await deleteCategory(env, actor.id, categoryMatch[1]);
    if (!removed) {
      return apiError(request, env, 404, "Category not found");
    }
    return apiResponse(request, env, true);
  }

  if (pathname === "/users" && request.method === "GET") {
    requirePermission(actor, "users", "read");
    return apiResponse(request, env, managedUserListSchema.parse(await listUsers(env)));
  }

  if (pathname === "/users" && request.method === "POST") {
    requirePermission(actor, "users", "create");
    const body = managedUserCreateInputSchema.parse(await readJson(request));
    return apiResponse(request, env, managedUserSchema.parse(await createUser(env, body, actor.id)), 201);
  }

  const userMatch = pathname.match(/^\/users\/([^/]+)$/);
  if (userMatch && request.method === "PUT") {
    requirePermission(actor, "users", "update");
    const user = await updateUser(env, userMatch[1], managedUserUpdateInputSchema.parse(await readJson(request)), actor.id);
    if (!user) {
      return apiError(request, env, 404, "User not found");
    }
    return apiResponse(request, env, managedUserSchema.parse(user));
  }

  if (pathname === "/admin/diagnostics" && request.method === "GET") {
    requirePermission(actor, "users", "read");
    return apiResponse(request, env, diagnosticsResponseSchema.parse(await getDiagnostics(env)));
  }

  if (pathname === "/admin/audit-logs" && request.method === "GET") {
    requirePermission(actor, "users", "read");
    return apiResponse(request, env, auditLogListSchema.parse(await listAuditLogs(env)));
  }

  return apiError(request, env, 404, "Not found");
};

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const tracedEnv: Env = {
      ...env,
      TRACE_ID: crypto.randomUUID(),
    };

    logEvent("info", "Request start", tracedEnv, {
      method: request.method,
      path: url.pathname,
    });

    if (request.method === "OPTIONS") {
      const response = withCorsHeaders(new Response(null, { status: 204 }), request, tracedEnv);
      logEvent("info", "Request complete", tracedEnv, {
        method: request.method,
        path: url.pathname,
        status: response.status,
      });
      return response;
    }

    if (url.pathname === "/health") {
      const response = apiResponse(request, tracedEnv, {
        ok: true,
        service: env.APP_NAME ?? "your-app-web",
        environment: env.APP_ENV ?? "production",
        timestamp: new Date().toISOString(),
      });
      logEvent("info", "Request complete", tracedEnv, {
        method: request.method,
        path: url.pathname,
        status: response.status,
      });
      return response;
    }

    if (url.pathname.startsWith("/api/")) {
      try {
        enforceRateLimit(request, tracedEnv, url.pathname);
        const response = await handleApiRequest(request, tracedEnv, url);
        logEvent("info", "Request complete", tracedEnv, {
          method: request.method,
          path: url.pathname,
          status: response.status,
        });
        return response;
      } catch (error) {
        const status = error instanceof HttpError
          ? error.status
          : error instanceof ZodError
            ? 400
            : 500;
        const message = error instanceof HttpError
          ? error.message
          : error instanceof ZodError
            ? "Invalid request payload"
            : "Internal server error";

        if (status >= 500) {
          captureException(error);
        }
        logEvent("error", "Request failed", tracedEnv, {
          method: request.method,
          path: url.pathname,
          status,
          error: message,
        });
        return apiError(request, tracedEnv, status, message);
      }
    }

    const response = await tracedEnv.ASSETS.fetch(request);
    logEvent("info", "Request complete", tracedEnv, {
      method: request.method,
      path: url.pathname,
      status: response.status,
    });
    return response;
  },
};

export default withSentry(
  (env: Env) => (env.SENTRY_DSN?.trim() ? {
    dsn: env.SENTRY_DSN.trim(),
    environment: env.APP_ENV ?? "production",
    enabled: true,
    tracesSampleRate: 0
  } : undefined),
  worker
);
