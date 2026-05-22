import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

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

const args = process.argv.slice(2);
const readArg = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
};

const targetEnv = readArg("--env");
const allowProduction = args.includes("--force");

if (!targetEnv || !["staging", "production"].includes(targetEnv)) {
  console.error("Usage: node scripts/cleanup-app-env-data.mjs --env staging|production [--force]");
  process.exit(1);
}

if (targetEnv === "production" && !allowProduction) {
  console.error("Refusing to purge production data without --force");
  process.exit(1);
}

const supabaseUrl = env.SUPABASE_URL?.trim();
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim() || env.SUPABASE_SECRET_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.error("cleanup failed: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}

const normalizedSupabaseUrl = supabaseUrl.replace(/\/$/, "");
const appEnv = targetEnv;

const supabase = createClient(normalizedSupabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const restHeaders = {
  apikey: supabaseKey,
  authorization: `Bearer ${supabaseKey}`,
  "content-type": "application/json",
  "x-app-env": appEnv,
};

const fetchJson = async (pathname, init = {}) => {
  const response = await fetch(`${normalizedSupabaseUrl}${pathname}`, {
    ...init,
    headers: {
      ...restHeaders,
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${response.status} ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }

  return body;
};

const deleteRows = async (table, query = "") => {
  const suffix = query ? `?${query}` : "";
  await fetchJson(`/rest/v1/${table}${suffix}`, {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal",
    },
  });
};

const listRows = async (table, select = "*") => {
  const pageSize = 1000;
  const rows = [];

  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchJson(
      `/rest/v1/${table}?app_env=eq.${encodeURIComponent(appEnv)}&select=${encodeURIComponent(select)}&order=created_at.asc&limit=${pageSize}&offset=${offset}`
    );

    if (!Array.isArray(page) || page.length === 0) {
      break;
    }

    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }
  }

  return rows;
};

const main = async () => {
  console.log(`- purging app data for ${appEnv}`);

  const assets = await listRows("assets", "bucket_id,path");
  const storagePathsByBucket = new Map();

  for (const asset of assets) {
    const bucketId = asset.bucket_id;
    const bucketPaths = storagePathsByBucket.get(bucketId) ?? [];
    bucketPaths.push(asset.path);
    storagePathsByBucket.set(bucketId, bucketPaths);
  }

  for (const [bucketId, paths] of storagePathsByBucket.entries()) {
    if (paths.length === 0) {
      continue;
    }

    const chunkSize = 100;
    for (let index = 0; index < paths.length; index += chunkSize) {
      const chunk = paths.slice(index, index + chunkSize);
      const { error } = await supabase.storage.from(bucketId).remove(chunk);
      if (error) {
        throw error;
      }
    }
  }

  await deleteRows("audit_logs", `app_env=eq.${encodeURIComponent(appEnv)}`);
  await deleteRows("assets", `app_env=eq.${encodeURIComponent(appEnv)}`);
  await deleteRows("items", `app_env=eq.${encodeURIComponent(appEnv)}`);
  await deleteRows("categories", `app_env=eq.${encodeURIComponent(appEnv)}`);
  await deleteRows("profiles", `app_env=eq.${encodeURIComponent(appEnv)}`);

  console.log(`- purge complete for ${appEnv}`);
};

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
