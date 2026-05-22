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
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
];

const missing = required.filter((key) => !env[key]?.trim());

if (missing.length > 0) {
  console.error(`web edge release check failed: missing ${missing.join(", ")}`);
  process.exit(1);
}

if (env.VITE_USE_LOCAL_API?.trim() === "true") {
  if (env.VITE_API_URL?.trim() && env.VITE_API_URL.trim() !== "http://localhost:4000") {
    console.error(`web edge release check failed: VITE_API_URL must be http://localhost:4000 when VITE_USE_LOCAL_API=true, got ${env.VITE_API_URL}`);
    process.exit(1);
  }
} else if (env.VITE_API_URL?.trim() && env.VITE_API_URL.trim() !== "/api") {
  console.error(`web edge release check failed: VITE_API_URL must be /api for the Cloudflare-first deploy path, got ${env.VITE_API_URL}`);
  process.exit(1);
}

console.log("web edge release check ok");
