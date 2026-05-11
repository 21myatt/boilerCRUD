import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const rootDir = path.resolve(import.meta.dirname, "..");
const envPath = path.join(rootDir, ".env");

const readEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const source = fs.readFileSync(filePath, "utf8");
  const entries = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const divider = line.indexOf("=");
      if (divider === -1) {
        return null;
      }

      return [line.slice(0, divider).trim(), line.slice(divider + 1).trim()];
    })
    .filter(Boolean);

  return Object.fromEntries(entries);
};

const env = {
  ...readEnvFile(envPath),
  ...process.env,
};

const required = [
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "VITE_SUPABASE_ANON_KEY",
];

const missing = required.filter((key) => !env[key]?.trim());
if (missing.length > 0) {
  console.error(`missing env: ${missing.join(", ")}`);
  process.exit(1);
}

const workerBaseUrl = process.argv[2]?.trim() || "https://boilercrud-imsys.amh-myat.workers.dev";
const supabaseUrl = env.SUPABASE_URL.replace(/\/$/, "");
const serviceKey = env.SUPABASE_SECRET_KEY;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

const randomSuffix = crypto.randomBytes(6).toString("hex");
const email = `codex-check-${randomSuffix}@example.com`;
const password = `Temp-${randomSuffix}-Pass1!`;

const adminHeaders = {
  apikey: serviceKey,
  authorization: `Bearer ${serviceKey}`,
  "content-type": "application/json",
};

const anonHeaders = {
  apikey: anonKey,
  "content-type": "application/json",
};

const request = async (url, init, label) => {
  const response = await fetch(url, init);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(`${label} failed with ${response.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }

  return body;
};

let createdUserId = null;
let categoryId = null;
let itemId = null;

const cleanup = async () => {
  if (!createdUserId) {
    return;
  }

  try {
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${createdUserId}`, {
      method: "DELETE",
      headers: adminHeaders,
    });
  } catch {
    // Best-effort cleanup only.
  }
};

try {
  const createdUser = await request(
    `${supabaseUrl}/auth/v1/admin/users`,
    {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
      }),
    },
    "create temp user"
  );

  createdUserId = createdUser.user?.id ?? createdUser.id;
  if (!createdUserId) {
    throw new Error("create temp user did not return an id");
  }

  await request(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(createdUserId)}`,
    {
      method: "PATCH",
      headers: {
        ...adminHeaders,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        role: "admin",
        disabled: false,
      }),
    },
    "promote temp user profile"
  );

  const signIn = await request(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: anonHeaders,
      body: JSON.stringify({
        email,
        password,
      }),
    },
    "sign in temp user"
  );

  const accessToken = signIn.access_token;
  if (!accessToken) {
    throw new Error("sign in did not return access_token");
  }

  const workerHeaders = {
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
  };

  const getEnvelope = async (pathName, init, label) => {
    return request(`${workerBaseUrl}${pathName}`, {
      ...init,
      headers: {
        ...workerHeaders,
        ...(init?.headers ?? {}),
      },
    }, label);
  };

  const users = await getEnvelope("/api/users", undefined, "list users");
  const diagnostics = await getEnvelope("/api/admin/diagnostics", undefined, "load diagnostics");
  const auditLogs = await getEnvelope("/api/admin/audit-logs", undefined, "load audit logs");

  const createdCategory = await getEnvelope(
    "/api/categories",
    {
      method: "POST",
      body: JSON.stringify({ name: `Codex Category ${randomSuffix}` }),
    },
    "create category"
  );
  categoryId = createdCategory.data?.id;

  const updatedCategory = await getEnvelope(
    `/api/categories/${categoryId}`,
    {
      method: "PUT",
      body: JSON.stringify({ name: `Codex Category ${randomSuffix} Updated` }),
    },
    "update category"
  );

  const categoriesAfterCreate = await getEnvelope("/api/categories", undefined, "list categories");

  const createdItem = await getEnvelope(
    "/api/items",
    {
      method: "POST",
      body: JSON.stringify({ name: `Codex Item ${randomSuffix}`, categoryId }),
    },
    "create item"
  );
  itemId = createdItem.data?.id;

  const updatedItem = await getEnvelope(
    `/api/items/${itemId}`,
    {
      method: "PUT",
      body: JSON.stringify({ name: `Codex Item ${randomSuffix} Updated`, categoryId }),
    },
    "update item"
  );

  const itemsAfterCreate = await getEnvelope("/api/items", undefined, "list items");

  await getEnvelope(
    `/api/items/${itemId}`,
    { method: "DELETE" },
    "delete item"
  );

  await getEnvelope(
    `/api/categories/${categoryId}`,
    { method: "DELETE" },
    "delete category"
  );

  console.log(JSON.stringify({
    ok: true,
    workerBaseUrl,
    tempEmail: email,
    verified: {
      users: Array.isArray(users.data),
      diagnostics: Boolean(diagnostics.data?.checks),
      auditLogs: Array.isArray(auditLogs.data),
      categoriesList: Array.isArray(categoriesAfterCreate.data),
      itemsList: Array.isArray(itemsAfterCreate.data),
      categoryUpdated: updatedCategory.data?.name,
      itemUpdated: updatedItem.data?.name,
    },
  }, null, 2));
} finally {
  await cleanup();
}
