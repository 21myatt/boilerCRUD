import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

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

      const key = line.slice(0, divider).trim();
      const value = line.slice(divider + 1).trim();
      return [key, value];
    })
    .filter(Boolean);

  return Object.fromEntries(entries);
};

const env = {
  ...readEnvFile(envPath),
  ...process.env,
};

const databaseUrl = env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error("db:migrate failed: missing DATABASE_URL in .env or process env");
  process.exit(1);
}

const commands = [
  ["supabase", ["db", "push", "--db-url", databaseUrl]],
  ["npx", ["--yes", "supabase", "db", "push", "--db-url", databaseUrl]],
];

let lastError;

for (const [command, args] of commands) {
  try {
    execFileSync(command, args, {
      cwd: rootDir,
      stdio: "inherit",
      env: {
        ...process.env,
        ...env,
      },
    });
    process.exit(0);
  } catch (error) {
    lastError = error;
  }
}

const message = lastError instanceof Error ? lastError.message : "unknown error";
console.error(`db:migrate failed: ${message}`);
console.error("Install the Supabase CLI or allow `npx supabase` to run in this environment.");
process.exit(1);
