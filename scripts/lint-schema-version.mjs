import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const constantsPath = path.join(rootDir, "packages/utils/constants.ts");
const schemaPath = path.join(rootDir, "supabase/schema.sql");

const constantsSource = fs.readFileSync(constantsPath, "utf8");
const schemaSource = fs.readFileSync(schemaPath, "utf8");

const versionMatch = constantsSource.match(/APP_SCHEMA_VERSION\s*=\s*"([^"]+)"/);

if (!versionMatch) {
  console.error("APP_SCHEMA_VERSION was not found in packages/utils/constants.ts");
  process.exit(1);
}

const expectedVersion = versionMatch[1];
const requiredPatterns = [
  expectedVersion,
  "create table if not exists public.app_schema_state",
  "insert into public.app_schema_state"
];

for (const pattern of requiredPatterns) {
  if (!schemaSource.includes(pattern)) {
    console.error(`Schema lint failed: missing "${pattern}" in supabase/schema.sql`);
    process.exit(1);
  }
}

console.log(`Schema lint passed for version ${expectedVersion}`);
