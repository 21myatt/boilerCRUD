import fs from "node:fs";
import path from "node:path";

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
  "APP_NAME",
  "APP_ENV",
  "CLOUDFLARE_WORKER_NAME",
  "CORS_ORIGINS",
  "SUPABASE_URL",
  "VITE_APP_ENV",
  "VITE_SUPABASE_URL",
];

const missing = required.filter((key) => !env[key]?.trim());

if (missing.length > 0) {
  console.error(`web deploy env check failed: missing ${missing.join(", ")}`);
  process.exit(1);
}

const normalizedSupabaseUrl = env.SUPABASE_URL.trim().replace(/\/$/, "");
const normalizedViteSupabaseUrl = env.VITE_SUPABASE_URL.trim().replace(/\/$/, "");

if (normalizedSupabaseUrl !== normalizedViteSupabaseUrl) {
  console.error(
    "web deploy env check failed: SUPABASE_URL must match VITE_SUPABASE_URL exactly for production deploys"
  );
  process.exit(1);
}

const normalizedAppEnv = env.APP_ENV.trim();
const normalizedViteAppEnv = env.VITE_APP_ENV.trim();

if (normalizedAppEnv !== normalizedViteAppEnv) {
  console.error(
    "web deploy env check failed: APP_ENV must match VITE_APP_ENV exactly for deploys"
  );
  process.exit(1);
}

if (env.VITE_USE_LOCAL_API?.trim() === "true") {
  console.error("web deploy env check failed: VITE_USE_LOCAL_API cannot be enabled for deploys");
  process.exit(1);
}

if (env.VITE_API_URL?.trim() && env.VITE_API_URL.trim() !== "/api") {
  console.error(
    `web deploy env check failed: VITE_API_URL must be /api for the Cloudflare-first deploy path, got ${env.VITE_API_URL}`
  );
  process.exit(1);
}

console.log("web deploy env check ok");
