import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const rootDir = path.resolve(import.meta.dirname, "..");
const envPath = path.join(rootDir, ".env");
const mobileEnvPath = path.join(rootDir, "apps/mobile/.env");
const webDevVarsPath = path.join(rootDir, "apps/web/.dev.vars");

const runSupabase = (args, options = {}) =>
  execFileSync("npx", ["--yes", "supabase", ...args], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      CI: process.env.CI ?? "true",
    },
  });

const parseStatus = (output) => {
  const patterns = {
    apiUrl: /API URL:\s*(.+)/,
    dbUrl: /DB URL:\s*(.+)/,
    anonKey: /anon key:\s*(.+)/i,
    serviceRoleKey: /service_role key:\s*(.+)/i,
  };

  const values = {};

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = output.match(pattern);
    if (!match) {
      throw new Error(`Unable to parse Supabase status output for ${key}`);
    }

    values[key] = match[1].trim();
  }

  return values;
};

const writeFile = (filePath, contents) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${contents}\n`);
};

const main = () => {
  console.log("- starting local Supabase stack");
  runSupabase(["start", "--workdir", "supabase", "--ignore-health-check"], { stdio: "inherit" });

  console.log("- reading local Supabase status");
  const statusOutput = runSupabase(["status", "--workdir", "supabase"]);
  const { apiUrl, dbUrl, anonKey, serviceRoleKey } = parseStatus(statusOutput);

  const rootEnv = [
    "APP_ENV=development",
    `DATABASE_URL=${dbUrl}`,
    `SUPABASE_URL=${apiUrl}`,
    `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`,
    `SUPABASE_SECRET_KEY=${serviceRoleKey}`,
    "INVITE_REDIRECT_TO=http://localhost:5173",
    "INVITE_REDIRECT_ORIGINS=http://localhost:5173",
    "SUPABASE_AUTH_SITE_URL=http://localhost:5173",
    "SUPABASE_AUTH_URI_ALLOW_LIST=http://localhost:5173,http://localhost:5173/**",
    "API_URL=http://localhost:4000",
    "CORS_ORIGINS=http://localhost:5173,http://localhost:8081,http://localhost:8787",
    "VITE_API_URL=/api",
    "VITE_APP_ENV=development",
    `VITE_SUPABASE_URL=${apiUrl}`,
    `VITE_SUPABASE_ANON_KEY=${anonKey}`,
  ].join("\n");

  const mobileEnv = [
    `EXPO_PUBLIC_SUPABASE_URL=${apiUrl}`,
    `EXPO_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
    "EXPO_PUBLIC_APP_ENV=development",
  ].join("\n");

  const webDevVars = [
    "APP_ENV=development",
    "APP_NAME=your-app-web",
    `SUPABASE_URL=${apiUrl}`,
    `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`,
    "CORS_ORIGINS=http://localhost:5173,http://localhost:8081,http://localhost:8787",
  ].join("\n");

  writeFile(envPath, rootEnv);
  writeFile(mobileEnvPath, mobileEnv);
  writeFile(webDevVarsPath, webDevVars);

  console.log("- running Supabase bootstrap checks against local stack");
  execFileSync("pnpm", ["bootstrap:supabase", "--", "--apply"], {
    cwd: rootDir,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
      SUPABASE_URL: apiUrl,
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      SUPABASE_SECRET_KEY: serviceRoleKey,
      VITE_SUPABASE_URL: apiUrl,
      VITE_SUPABASE_ANON_KEY: anonKey,
      EXPO_PUBLIC_SUPABASE_URL: apiUrl,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    },
  });

  console.log("- local Supabase bootstrap complete");
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
}
