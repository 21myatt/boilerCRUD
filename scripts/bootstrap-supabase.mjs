import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const rootDir = path.resolve(import.meta.dirname, "..");
const envPath = path.join(rootDir, ".env");
const mobileEnvPath = path.join(rootDir, "apps/mobile/.env");
const constantsPath = path.join(rootDir, "packages/utils/constants.ts");
const packagesDbDir = path.join(rootDir, "packages/db");
const migrateScriptPath = path.join(rootDir, "scripts/supabase-db-push.mjs");

const args = new Set(process.argv.slice(2));
const shouldApply = args.has("--apply");

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

      const key = line.slice(0, divider).trim();
      const value = line.slice(divider + 1).trim();
      return [key, value];
    })
    .filter(Boolean);

  return Object.fromEntries(entries);
};

const rootEnv = {
  ...readEnvFile(envPath),
  ...process.env
};

const mobileEnv = readEnvFile(mobileEnvPath);
const supabaseAdminKey = rootEnv.SUPABASE_SECRET_KEY ?? rootEnv.SUPABASE_SERVICE_ROLE_KEY;

const requiredRootEnv = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY"
];

const requiredMobileEnv = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY"
];

const fail = (message) => {
  console.error(`bootstrap failed: ${message}`);
  process.exit(1);
};

const info = (message) => {
  console.log(`- ${message}`);
};

const runSchemaLint = () => {
  execFileSync("node", [path.join(rootDir, "scripts/lint-schema-version.mjs")], {
    cwd: rootDir,
    stdio: "inherit"
  });
};

const getExpectedSchemaVersion = () => {
  const source = fs.readFileSync(constantsPath, "utf8");
  const match = source.match(/APP_SCHEMA_VERSION\s*=\s*"([^"]+)"/);

  if (!match) {
    fail("APP_SCHEMA_VERSION not found");
  }

  return match[1];
};

const parseJsonResponse = async (response) => {
  const text = await response.text();
  let body;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message = typeof body === "string"
      ? body
      : body?.message ?? body?.msg ?? JSON.stringify(body);
    throw new Error(`${response.status} ${message}`);
  }

  return body;
};

const tryDbScript = (script) => {
  const env = {
    ...process.env,
    ...rootEnv
  };

  try {
    return execFileSync("node", ["-e", script], {
      cwd: packagesDbDir,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    return {
      failed: true,
      stderr: error.stderr?.toString().trim() ?? error.message
    };
  }
};

const getDbConnectionScript = () => {
  return `
    const { Pool } = require('pg');
    const url = new URL(process.env.DATABASE_URL);
    const candidates = [url.toString(), (() => { const copy = new URL(url.toString()); copy.port = '6543'; return copy.toString(); })()];
    (async () => {
      let lastError = null;
      for (const candidate of candidates) {
        const pool = new Pool({ connectionString: candidate, ssl: { rejectUnauthorized: false } });
        try {
          await pool.query('select 1');
          const state = await pool.query(\"select schema_version from public.app_schema_state where singleton_key = 'current'\");
          await pool.end();
          console.log(JSON.stringify({ ok: true, candidate, schemaVersion: state.rows[0]?.schema_version ?? null }));
          return;
        } catch (error) {
          lastError = error;
          await pool.end().catch(() => {});
        }
      }
      console.error(lastError?.stack || lastError?.message || 'database connection failed');
      process.exit(1);
    })();
  `;
};

const runTrackedMigrations = () => {
  execFileSync("node", [migrateScriptPath], {
    cwd: rootDir,
    stdio: "inherit",
    env: {
      ...process.env,
      ...rootEnv,
    },
  });
};

const main = async () => {
  info("Validating root environment");
  for (const key of requiredRootEnv) {
    if (!rootEnv[key]) {
      fail(`missing ${key} in .env or process env`);
    }
  }
  if (!supabaseAdminKey) {
    fail("missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY in .env or process env");
  }

  info("Validating mobile environment");
  for (const key of requiredMobileEnv) {
    if (!mobileEnv[key]) {
      fail(`missing ${key} in apps/mobile/.env`);
    }
  }

  info("Running schema version lint");
  runSchemaLint();

  info("Checking Supabase auth admin access");
  const authResponse = await fetch(`${rootEnv.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/admin/users?page=1&per_page=1`, {
    headers: {
      apikey: supabaseAdminKey,
      authorization: `Bearer ${supabaseAdminKey}`
    }
  });
  await parseJsonResponse(authResponse);

  info("Checking storage bucket access");
  const storageResponse = await fetch(`${rootEnv.SUPABASE_URL.replace(/\/$/, "")}/storage/v1/bucket`, {
    headers: {
      apikey: supabaseAdminKey,
      authorization: `Bearer ${supabaseAdminKey}`
    }
  });
  const buckets = await parseJsonResponse(storageResponse);
  if (!Array.isArray(buckets) || !buckets.some((bucket) => bucket.id === "cms-assets")) {
    fail("cms-assets bucket not found");
  }

  if (shouldApply) {
    info("Applying tracked Supabase migrations");
    runTrackedMigrations();
  }

  info("Checking direct Postgres reachability");
  const dbResultRaw = tryDbScript(getDbConnectionScript());
  if (typeof dbResultRaw !== "string") {
    fail(dbResultRaw.stderr);
  }

  const dbResult = JSON.parse(dbResultRaw);
  if (!dbResult.ok) {
    fail("database check failed");
  }

  const expectedSchemaVersion = getExpectedSchemaVersion();
  if (dbResult.schemaVersion !== expectedSchemaVersion) {
    fail(`schema version mismatch: expected ${expectedSchemaVersion}, got ${dbResult.schemaVersion ?? "null"}`);
  }

  info(`Database reachable through ${dbResult.candidate}`);
  info(`Schema version matches ${expectedSchemaVersion}`);
  console.log(`bootstrap ok${shouldApply ? " (schema applied)" : ""}`);
};

await main();
