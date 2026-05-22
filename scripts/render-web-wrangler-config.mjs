import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(rootDir, "apps/web/wrangler.jsonc");

const args = process.argv.slice(2);
const readArg = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
};

const targetEnv = readArg("--env");
const outputPathArg = readArg("--out");

if (!targetEnv || !["staging", "production"].includes(targetEnv)) {
  console.error("Usage: node scripts/render-web-wrangler-config.mjs --env staging|production --out <path>");
  process.exit(1);
}

if (!outputPathArg) {
  console.error("Missing --out <path>");
  process.exit(1);
}

const requiredVars = [
  "CLOUDFLARE_WORKER_NAME",
  "CORS_ORIGINS",
  "SUPABASE_URL",
];

const missing = requiredVars.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error(`Missing required deploy vars: ${missing.join(", ")}`);
  process.exit(1);
}

const source = fs.readFileSync(sourcePath, "utf8");
const config = JSON.parse(source);

config.env ??= {};
config.env[targetEnv] ??= {};
config.env[targetEnv].name = process.env.CLOUDFLARE_WORKER_NAME.trim();
config.env[targetEnv].vars = {
  ...(config.env[targetEnv].vars ?? {}),
  APP_NAME: process.env.APP_NAME?.trim() || "your-app-web",
  APP_ENV: targetEnv,
  CORS_ORIGINS: process.env.CORS_ORIGINS.trim(),
  SUPABASE_URL: process.env.SUPABASE_URL.trim(),
};

const outputPath = path.resolve(rootDir, outputPathArg);
fs.writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Wrote ${path.relative(rootDir, outputPath)} for ${targetEnv}`);
