const path = require("node:path");
const fs = require("node:fs");
const { defineConfig } = require("@playwright/test");

const repoRoot = __dirname;
const e2eEnvPaths = [
  path.join(repoRoot, ".env.e2e"),
  path.join(repoRoot, "apps/e2e/.env"),
];

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const source = fs.readFileSync(filePath, "utf8");

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const divider = line.indexOf("=");
    if (divider === -1) {
      continue;
    }

    const key = line.slice(0, divider).trim();
    const value = line.slice(divider + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
};

for (const envPath of e2eEnvPaths) {
  loadEnvFile(envPath);
}

const baseURL = process.env.E2E_BASE_URL?.trim() || "http://127.0.0.1:8787";

module.exports = defineConfig({
  testDir: path.join(repoRoot, "apps/e2e/tests"),
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL,
  },
});
