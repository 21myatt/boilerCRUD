import type {
  ManagedUser,
  ManagedUserCreateInput,
  ManagedUserRole,
  ManagedUserUpdateInput
} from "@imsys/types";
import { getBootstrapCmsRole, isProtectedBootstrapEmail } from "@imsys/auth";
import { AppError } from "@imsys/utils";
import { getSupabaseAdminHeaders, getSupabaseAdminUrl } from "../lib/supabase-admin";
import { writeAuditLog } from "./audit-logs";
import { listProfiles, upsertProfile } from "./profiles";

type SupabaseAdminUser = {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
  last_sign_in_at?: string;
  banned_until?: string;
};

type SupabaseListUsersResponse = {
  users: SupabaseAdminUser[];
};

type SupabaseSingleUserResponse = {
  user: SupabaseAdminUser;
};

const isProductionInviteMode = () => process.env.NODE_ENV === "production";

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
    throw new AppError(
      "Password must be at least 12 characters and include uppercase, lowercase, and number",
      400
    );
  }
};

const getAllowedInviteOrigins = () => {
  const inviteRedirect = process.env.INVITE_REDIRECT_TO;
  const configuredOrigins = (process.env.INVITE_REDIRECT_ORIGINS ?? process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (inviteRedirect) {
    configuredOrigins.push(new URL(inviteRedirect).origin);
  }

  return new Set(configuredOrigins);
};

const validateInviteRedirect = (redirectTo?: string) => {
  if (!redirectTo) {
    return;
  }

  const redirectUrl = new URL(redirectTo);
  const allowedOrigins = getAllowedInviteOrigins();

  if (allowedOrigins.size === 0 || !allowedOrigins.has(redirectUrl.origin)) {
    throw new AppError("Invalid invite redirect URL", 400);
  }
};

const mapManagedUser = (
  user: SupabaseAdminUser,
  profile?: {
    role: ManagedUserRole;
    disabled: boolean;
  }
): ManagedUser => ({
  id: user.id,
  email: user.email ?? "",
  cmsRole: profile?.role
    ?? getBootstrapCmsRole(user.email ?? "")
    ?? "viewer",
  disabled: profile?.disabled ?? Boolean(user.banned_until && user.banned_until !== "none"),
  lastSignInAt: user.last_sign_in_at ?? null,
  createdAt: user.created_at,
  updatedAt: user.updated_at ?? user.created_at,
  protected: isProtectedBootstrapEmail(user.email ?? "")
});

const unwrapUser = (
  payload: SupabaseAdminUser | SupabaseSingleUserResponse
): SupabaseAdminUser => ("user" in payload ? payload.user : payload);

const getUpdateAttributes = (input: ManagedUserUpdateInput) => ({
  ...(input.password ? { password: input.password } : {})
});

const parseResponse = async <T>(response: Response): Promise<T> => {
  const body = await response.json() as T | {
    msg?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok) {
    const errorBody = body as {
      msg?: string;
      error?: string;
      error_description?: string;
    };
    const message = typeof body === "object" && body
      ? errorBody.msg ?? errorBody.error_description ?? errorBody.error
      : undefined;
    throw new Error(message ?? `Supabase admin request failed with ${response.status}`);
  }

  return body as T;
};

export const listUsers = async (): Promise<ManagedUser[]> => {
  const [data, profiles] = await Promise.all([
    fetch(getSupabaseAdminUrl("/admin/users?page=1&per_page=200"), {
      headers: getSupabaseAdminHeaders()
    }).then(parseResponse<SupabaseListUsersResponse>),
    listProfiles()
  ]);
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return data.users
    .map((user) => mapManagedUser(user, profileMap.get(user.id)))
    .sort((left: ManagedUser, right: ManagedUser) => right.createdAt.localeCompare(left.createdAt));
};

export const createUser = async (
  input: ManagedUserCreateInput,
  actorUserId?: string
): Promise<ManagedUser> => {
  if (!input.password && !isProductionInviteMode()) {
    throw new AppError("Password is required outside production invite mode", 400);
  }

  assertPasswordStrength(input.password);
  validateInviteRedirect(input.redirectTo);

  const response = await fetch(
    getSupabaseAdminUrl(isProductionInviteMode() ? "/invite" : "/admin/users"),
    {
      method: "POST",
      headers: getSupabaseAdminHeaders(),
      body: JSON.stringify(
        isProductionInviteMode()
          ? {
              email: input.email,
              data: {
                cmsRole: input.cmsRole
              },
              ...(input.redirectTo ? { redirect_to: input.redirectTo } : {})
            }
          : {
              email: input.email,
              password: input.password,
              email_confirm: true
            }
      )
    }
  );
  const data = await parseResponse<SupabaseAdminUser | SupabaseSingleUserResponse>(response);
  const user = unwrapUser(data);
  const profile = await upsertProfile({
    id: user.id,
    email: user.email ?? input.email,
    role: input.cmsRole,
    disabled: false
  });
  await writeAuditLog({
    actorUserId: actorUserId ?? null,
    action: isProductionInviteMode() ? "invite" : "create",
    resource: "users",
    targetUserId: user.id,
    payload: {
      email: user.email ?? input.email,
      cmsRole: input.cmsRole,
      mode: isProductionInviteMode() ? "invite" : "temporary_password"
    }
  });

  return mapManagedUser(user, profile);
};

export const updateUser = async (
  id: string,
  input: ManagedUserUpdateInput,
  actorUserId?: string
): Promise<ManagedUser | null> => {
  const existingResponse = await fetch(getSupabaseAdminUrl(`/admin/users/${id}`), {
    headers: getSupabaseAdminHeaders()
  });

  if (!existingResponse.ok) {
    if (existingResponse.status === 404) {
      return null;
    }

    await parseResponse(existingResponse);
  }

  const existing = unwrapUser(
    await existingResponse.json() as SupabaseAdminUser | SupabaseSingleUserResponse
  );
  const profiles = await listProfiles();
  const existingProfile = profiles.find((profile) => profile.id === existing.id) ?? null;

  if (isProtectedBootstrapEmail(existing.email ?? "") && (input.cmsRole || input.disabled)) {
    throw new AppError("Protected local users cannot be demoted or suspended", 400);
  }

  assertPasswordStrength(input.password);
  let user = existing;

  if (input.password) {
    const updateResponse = await fetch(getSupabaseAdminUrl(`/admin/users/${id}`), {
      method: "PUT",
      headers: getSupabaseAdminHeaders(),
      body: JSON.stringify(getUpdateAttributes(input))
    });
    const data = await parseResponse<SupabaseAdminUser | SupabaseSingleUserResponse>(updateResponse);
    user = unwrapUser(data);
  }

  const profile = await upsertProfile({
    id: user.id,
    email: user.email ?? existing.email ?? "",
    role: input.cmsRole,
    disabled: typeof input.disabled === "boolean" ? input.disabled : undefined
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
    await writeAuditLog({
      actorUserId: actorUserId ?? null,
      targetUserId: user.id,
      action,
      resource: "users",
      payload: {
        email: user.email ?? existing.email ?? "",
        cmsRole: input.cmsRole ?? profile.role,
        disabled: typeof input.disabled === "boolean" ? input.disabled : profile.disabled
      }
    });
  }

  return mapManagedUser(user, profile);
};
