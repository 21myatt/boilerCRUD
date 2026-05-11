import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");

const read = (relativePath) =>
  fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const exists = (relativePath) =>
  fs.existsSync(path.join(rootDir, relativePath));

const checks = [];

const addCheck = (label, ok, details) => {
  checks.push({ label, ok, details });
};

const requireText = (label, relativePath, snippets) => {
  const source = read(relativePath);
  const missing = snippets.filter((snippet) => !source.includes(snippet));
  addCheck(label, missing.length === 0, missing.length === 0 ? relativePath : `Missing in ${relativePath}: ${missing.join(", ")}`);
};

const requiredFiles = [
  "docs/cloudflare-supabase-boilerplate-setup.md",
  "apps/web/.dev.vars.example",
  "scripts/supabase-db-push.mjs",
];

for (const relativePath of requiredFiles) {
  addCheck(`Required file present: ${relativePath}`, exists(relativePath), relativePath);
}

const migrationsDir = path.join(rootDir, "supabase/migrations");
const migrationFiles = exists("supabase/migrations")
  ? fs.readdirSync(migrationsDir).filter((entry) => entry.endsWith(".sql"))
  : [];
addCheck(
  "Tracked Supabase migrations exist",
  migrationFiles.length > 0,
  migrationFiles.length > 0 ? migrationFiles.join(", ") : "No .sql files found in supabase/migrations"
);

requireText(
  "README documents required build env vars",
  "README.md",
  ["VITE_API_URL=/api", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]
);

requireText(
  "README documents Worker runtime vars and secret",
  "README.md",
  ["SUPABASE_URL", "CORS_ORIGINS", "APP_NAME", "APP_ENV", "SUPABASE_SERVICE_ROLE_KEY"]
);

requireText(
  "Setup guide documents MCP workflow",
  "docs/cloudflare-supabase-boilerplate-setup.md",
  ["Supabase MCP", "Cloudflare MCP", "Recommended verification pass before deploy"]
);

requireText(
  "Env examples document the Cloudflare-first API base",
  ".env.example",
  ["VITE_API_URL=/api", "CF_API_ORIGIN=http://localhost:4000"]
);

requireText(
  "Worker dev vars example documents runtime secrets",
  "apps/web/.dev.vars.example",
  ["SUPABASE_URL=", "SUPABASE_SERVICE_ROLE_KEY=", "CORS_ORIGINS="]
);

requireText(
  "Wrangler config declares required secret and named deploy environments",
  "apps/web/wrangler.jsonc",
  ['"secrets"', '"required": ["SUPABASE_SERVICE_ROLE_KEY"]', '"staging"', '"production"']
);

const apiBaseUrlSource = read("apps/web/src/lib/api-base-url.ts");
addCheck(
  "Production web build defaults to same-origin /api",
  apiBaseUrlSource.includes('configuredApiUrl || (import.meta.env.DEV ? "http://localhost:4000" : "/api")'),
  "apps/web/src/lib/api-base-url.ts"
);

const webSourceFiles = [
  "apps/web/src",
  "packages/api-client",
];

const collectFiles = (directory) => {
  const absoluteDir = path.join(rootDir, directory);
  const result = [];
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const absolutePath = path.join(absoluteDir, entry.name);
    const stats = fs.statSync(absolutePath);
    if (stats.isDirectory()) {
      result.push(...collectFiles(path.relative(rootDir, absolutePath)));
    } else if (stats.isFile()) {
      result.push(path.relative(rootDir, absolutePath));
    }
  }
  return result;
};

const localhostHits = [];
for (const directory of webSourceFiles) {
  for (const relativePath of collectFiles(directory)) {
    const source = read(relativePath);
    if (!source.includes("localhost")) {
      continue;
    }

    const allowedDevFallback =
      relativePath === "apps/web/src/lib/api-base-url.ts" &&
      source.includes('configuredApiUrl || (import.meta.env.DEV ? "http://localhost:4000" : "/api")');

    if (!allowedDevFallback) {
      localhostHits.push(relativePath);
    }
  }
}

addCheck(
  "Frontend source has no unexpected localhost network targets",
  localhostHits.length === 0,
  localhostHits.length === 0
    ? "Only the guarded dev fallback remains in apps/web/src/lib/api-base-url.ts"
    : localhostHits.join(", ")
);

const gapPlan = read("docs/cloudflare-supabase-boilerplate-gap-plan.md");
const expectedCheckedItems = [
  "No required production env var is undocumented",
  "Another developer can clone the repo and follow one documented setup path",
  "Another developer can use MCP to inspect and validate the setup state",
  "Verification can be used both as an onboarding smoke test and as a contributor release checklist",
];

const uncheckedStaticItems = expectedCheckedItems.filter(
  (item) => !gapPlan.includes(`- [x] ${item}`)
);

addCheck(
  "Gap plan reflects completed static verification work",
  uncheckedStaticItems.length === 0,
  uncheckedStaticItems.length === 0 ? "docs/cloudflare-supabase-boilerplate-gap-plan.md" : uncheckedStaticItems.join(", ")
);

const passed = checks.filter((check) => check.ok).length;
const failed = checks.filter((check) => !check.ok);

for (const check of checks) {
  const marker = check.ok ? "PASS" : "FAIL";
  console.log(`[${marker}] ${check.label}`);
  console.log(`       ${check.details}`);
}

console.log(`\n${passed}/${checks.length} checks passed`);

if (failed.length > 0) {
  process.exit(1);
}
