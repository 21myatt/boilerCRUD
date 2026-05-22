import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const rootDir = path.resolve(import.meta.dirname, "..");
const contract = JSON.parse(
  fs.readFileSync(path.join(rootDir, "config/boilerplate-contract.json"), "utf8")
);

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
  "config/boilerplate-contract.json",
  ...contract.required_files,
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
  "Repo MCP config includes GitHub, Supabase, and Cloudflare servers",
  ".mcp.json",
  [
    '"github"',
    "https://api.githubcopilot.com/mcp/",
    '"supabase"',
    "https://mcp.supabase.com/mcp",
    '"cloudflare-api"',
    "https://mcp.cloudflare.com/mcp"
  ]
);

requireText(
  "Codex GitHub MCP example uses official remote server and PAT env var",
  "config/codex-github-mcp.example.toml",
  [
    "[mcp_servers.github]",
    "https://api.githubcopilot.com/mcp/",
    'bearer_token_env_var = "GITHUB_PAT_TOKEN"'
  ]
);

requireText(
  "README documents required build env vars",
  "README.md",
  ["VITE_API_URL=/api", "VITE_APP_ENV", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]
);

requireText(
  "README documents Worker runtime vars and secret",
  "README.md",
  ["SUPABASE_URL", "CORS_ORIGINS", "APP_NAME", "APP_ENV", "SUPABASE_SERVICE_ROLE_KEY"]
);

requireText(
  "README documents deploy env consistency between Supabase URLs",
  "README.md",
  ["SUPABASE_URL must match VITE_SUPABASE_URL"]
);

requireText(
  "Env examples document the Cloudflare-first API base",
  ".env.example",
  ["APP_ENV=development", "VITE_API_URL=/api", "VITE_USE_LOCAL_API=false", "VITE_APP_ENV=development", "CF_API_ORIGIN=http://localhost:4000"]
);

requireText(
  "Tracked local Supabase config exists for local and CI parity",
  "supabase/config.toml",
  ["project_id =", "[api]", "[db]"]
);

requireText(
  "CI boots local Supabase instead of using hosted branching",
  ".github/workflows/ci.yml",
  ["bootstrap:supabase:local", "playwright install --with-deps chromium"]
);

requireText(
  "Local Supabase bootstrap script exists",
  "scripts/bootstrap-supabase-local.mjs",
  ["runSupabase([\"start\"", "runSupabase([\"status\"", "bootstrap:supabase"]
);

requireText(
  "Vitest workspace package exists",
  "packages/tests/package.json",
  ['"test": "vitest run --config ../../vitest.config.ts"']
);

requireText(
  "Playwright smoke app exists",
  "apps/e2e/package.json",
  ['"test": "playwright test --config ../../playwright.config.ts"']
);

requireText(
  "Worker dev vars example documents runtime secrets",
  "apps/web/.dev.vars.example",
  ["APP_ENV=development", "SUPABASE_URL=", "SUPABASE_SERVICE_ROLE_KEY=", "CORS_ORIGINS="]
);

requireText(
  "Mobile env example documents runtime env tag",
  "apps/mobile/.env.example",
  ["EXPO_PUBLIC_APP_ENV=development", "EXPO_PUBLIC_SUPABASE_URL=", "EXPO_PUBLIC_SUPABASE_ANON_KEY="]
);

requireText(
  "Deploy env validation script exists",
  "scripts/validate-web-deploy-env.mjs",
  ["SUPABASE_URL must match VITE_SUPABASE_URL exactly for production deploys", "APP_ENV must match VITE_APP_ENV exactly for deploys", "web deploy env check ok"]
);

requireText(
  "Wrangler config declares named deploy environments",
  "apps/web/wrangler.jsonc",
  ['"staging"', '"production"']
);

const ciWorkflow = read(".github/workflows/ci.yml");
addCheck(
  "CI workflow exposes required status check shape",
  ciWorkflow.includes("name: CI") && ciWorkflow.includes("verify:") && ciWorkflow.includes("pnpm verify:boilerplate"),
  ".github/workflows/ci.yml"
);

const generatedApiContractPath = "docs/api-contract.generated.json";
const generatedApiContract = read(generatedApiContractPath).trim();
const currentApiContract = execFileSync("node", ["scripts/print-api-contract.mjs"], {
  cwd: rootDir,
  encoding: "utf8",
});
addCheck(
  "Generated API contract stays in sync with shared schemas",
  generatedApiContract === currentApiContract.trim(),
  generatedApiContract === currentApiContract.trim() ? generatedApiContractPath : "Run pnpm boilerplate:api-contract to refresh docs/api-contract.generated.json"
);

const deployWorkflowFiles = [
  { path: ".github/workflows/deploy-staging.yml", requiredEnvironment: "staging" },
  { path: ".github/workflows/deploy-production.yml", requiredEnvironment: "production" },
];

for (const { path: relativePath, requiredEnvironment } of deployWorkflowFiles) {
  const source = read(relativePath);
  const missingGithubContract = [
    requiredEnvironment,
    ...contract.github.required_variables,
    ...contract.github.required_secrets,
  ].filter((snippet) => !source.includes(snippet));

  addCheck(
    `Deploy workflow matches boilerplate contract: ${relativePath}`,
    missingGithubContract.length === 0,
    missingGithubContract.length === 0 ? relativePath : `Missing in ${relativePath}: ${missingGithubContract.join(", ")}`
  );
}

const databaseWorkflowFiles = [
  { path: ".github/workflows/deploy-database-staging.yml", requiredEnvironment: "staging" },
  { path: ".github/workflows/deploy-database-production.yml", requiredEnvironment: "production" },
];

for (const { path: relativePath, requiredEnvironment } of databaseWorkflowFiles) {
  const source = read(relativePath);
  const missingDatabaseContract = [
    requiredEnvironment,
    ...contract.database.required_secrets,
  ].filter((snippet) => !source.includes(snippet));

  addCheck(
    `Database workflow matches boilerplate contract: ${relativePath}`,
    missingDatabaseContract.length === 0,
    missingDatabaseContract.length === 0 ? relativePath : `Missing in ${relativePath}: ${missingDatabaseContract.join(", ")}`
  );
}

const apiBaseUrlSource = read("apps/web/src/lib/api-base-url.ts");
addCheck(
  "Production web build defaults to same-origin /api",
  apiBaseUrlSource.includes('useLegacyLocalApi') && apiBaseUrlSource.includes('configuredApiUrl && configuredApiUrl !== "http://localhost:4000" ? configuredApiUrl : "/api"'),
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
      if (entry.name === "node_modules") {
        continue;
      }
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
      source.includes('useLegacyLocalApi') &&
      source.includes('configuredApiUrl && configuredApiUrl !== "http://localhost:4000" ? configuredApiUrl : "/api"');

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

const leakedIdentityHits = [];
for (const relativePath of contract.boilerplate_identity_files) {
  const source = read(relativePath);
  for (const snippet of contract.banned_identity_snippets) {
    if (source.includes(snippet)) {
      leakedIdentityHits.push(`${relativePath}: ${snippet}`);
    }
  }
}

addCheck(
  "Committed boilerplate files contain no leaked prior project identity",
  leakedIdentityHits.length === 0,
  leakedIdentityHits.length === 0 ? "No old project-specific Cloudflare or Supabase identity found" : leakedIdentityHits.join(", ")
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
