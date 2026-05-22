import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const fileDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(fileDir, "../../../..");

const getGeneratedMigration = (resourceKey: string, before: Set<string>) => {
  const entries = fs.readdirSync(path.join(rootDir, "supabase/migrations"));
  const nextEntry = entries.find((entry) => entry.endsWith(`_${resourceKey}.sql`) && !before.has(entry));

  if (!nextEntry) {
    throw new Error(`Missing generated migration for ${resourceKey}`);
  }

  return `supabase/migrations/${nextEntry}`;
};

const toPascal = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");

describe("resource generator", () => {
  it("scaffolds a resource that matches the existing repo shape", () => {
    const resourceKey = `scaffold-check-${Date.now()}`;
    const kebabKey = resourceKey;
    const pascalKey = toPascal(kebabKey);
    const pluralPascalKey = pascalKey.endsWith("s") ? pascalKey : `${pascalKey}s`;
    const beforeMigrations = new Set(fs.readdirSync(path.join(rootDir, "supabase/migrations")));
    let generatedMigrationPath: string | null = null;

    try {
      execFileSync("node", ["scripts/generate-resource.mjs", resourceKey], {
        cwd: rootDir,
        stdio: "pipe",
      });

      const generatedFiles = [
        `packages/types/${kebabKey}.ts`,
        `packages/api-client/${kebabKey}.ts`,
        `apps/web/src/features/${kebabKey}/definition.ts`,
        `apps/web/src/features/${kebabKey}/hooks.ts`,
        `apps/web/src/features/${kebabKey}/index.ts`,
      ];
      generatedMigrationPath = getGeneratedMigration(kebabKey, beforeMigrations);
      generatedFiles.push(generatedMigrationPath);

      for (const relativePath of generatedFiles) {
        expect(fs.existsSync(path.join(rootDir, relativePath))).toBe(true);
      }

      expect(fs.readFileSync(path.join(rootDir, "packages/types/index.ts"), "utf8")).toContain(`export * from "./${kebabKey}";`);
      expect(fs.readFileSync(path.join(rootDir, "packages/api-client/index.ts"), "utf8")).toContain(`export * from "./${kebabKey}";`);
      expect(fs.readFileSync(path.join(rootDir, `packages/types/${kebabKey}.ts`), "utf8")).toContain(`export type ${pascalKey}`);
      expect(fs.readFileSync(path.join(rootDir, `packages/api-client/${kebabKey}.ts`), "utf8")).toContain(`create${pascalKey}Client`);
      expect(fs.readFileSync(path.join(rootDir, `apps/web/src/features/${kebabKey}/hooks.ts`), "utf8")).toContain(`use${pluralPascalKey}Resource`);
    } finally {
      const cleanupTargets = [
        `packages/types/${kebabKey}.ts`,
        `packages/api-client/${kebabKey}.ts`,
        `apps/web/src/features/${kebabKey}`,
        generatedMigrationPath,
      ];

      for (const relativePath of cleanupTargets) {
        if (!relativePath) {
          continue;
        }
        fs.rmSync(path.join(rootDir, relativePath), { recursive: true, force: true });
      }

      for (const relativePath of ["packages/types/index.ts", "packages/api-client/index.ts"]) {
        const absolutePath = path.join(rootDir, relativePath);
        const source = fs.readFileSync(absolutePath, "utf8");
        const cleanedSource = source
          .split("\n")
          .filter((line) => line.trim() !== `export * from "./${kebabKey}";`)
          .join("\n")
          .replace(/\n{3,}/g, "\n\n")
          .trimEnd();
        fs.writeFileSync(absolutePath, `${cleanedSource}\n`);
      }
    }
  });
});
