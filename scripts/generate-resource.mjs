import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const rawName = args[0]?.trim();

if (!rawName) {
  console.error("Usage: pnpm generate:resource <resource-name>");
  process.exit(1);
}

const toKebab = (value) =>
  value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .toLowerCase();

const toPascal = (value) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");

const kebab = toKebab(rawName);
const pascal = toPascal(kebab);
const plural = kebab.endsWith("s") ? kebab : `${kebab}s`;
const pluralPascal = pascal.endsWith("s") ? pascal : `${pascal}s`;
const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "").replace("T", "");

const writeFile = (relativePath, contents) => {
  const absolutePath = path.join(rootDir, relativePath);
  if (fs.existsSync(absolutePath)) {
    throw new Error(`Refusing to overwrite existing file: ${relativePath}`);
  }

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${contents.trimEnd()}\n`);
};

const ensureExport = (relativePath, exportPath) => {
  const absolutePath = path.join(rootDir, relativePath);
  const exportLine = `export * from "${exportPath}";`;
  const source = fs.readFileSync(absolutePath, "utf8");

  if (source.includes(exportLine)) {
    return;
  }

  const nextSource = `${source.trimEnd()}\n${exportLine}\n`;
  fs.writeFileSync(absolutePath, nextSource);
};

writeFile(
  `packages/types/${kebab}.ts`,
  `import type { ID, Timestamped } from "./common";

export type ${pascal} = Timestamped & {
  id: ID;
  name: string;
  updatedAt?: string;
};

export type ${pascal}CreateInput = {
  name: string;
};

export type ${pascal}UpdateInput = Partial<${pascal}CreateInput>;
`
);

writeFile(
  `packages/api-client/${kebab}.ts`,
  `import type { ${pascal}, ${pascal}CreateInput, ${pascal}UpdateInput } from "@imsys/types";
import { requestEnvelope, type RequestOptions } from "./request";

export const get${pluralPascal} = async (baseUrl: string, options?: RequestOptions): Promise<${pascal}[]> => {
  const body = await requestEnvelope<${pascal}[]>(baseUrl, "/${plural}", undefined, options);
  return body.data ?? [];
};

export const create${pascal} = async (
  baseUrl: string,
  input: ${pascal}CreateInput,
  options?: RequestOptions
): Promise<${pascal}> => {
  const body = await requestEnvelope<${pascal}>(baseUrl, "/${plural}", {
    method: "POST",
    body: JSON.stringify(input)
  }, options);

  return body.data;
};

export const update${pascal} = async (
  baseUrl: string,
  id: string,
  input: ${pascal}UpdateInput,
  options?: RequestOptions
): Promise<${pascal}> => {
  const body = await requestEnvelope<${pascal}>(baseUrl, \`/${plural}/\${id}\`, {
    method: "PUT",
    body: JSON.stringify(input)
  }, options);

  return body.data;
};

export const delete${pascal} = async (
  baseUrl: string,
  id: string,
  options?: RequestOptions
): Promise<void> => {
  await requestEnvelope<void>(baseUrl, \`/${plural}/\${id}\`, {
    method: "DELETE"
  }, options);
};

export const create${pascal}Client = (baseUrl: string, options?: RequestOptions) => ({
  get${pluralPascal}: () => get${pluralPascal}(baseUrl, options),
  create${pascal}: (input: ${pascal}CreateInput) => create${pascal}(baseUrl, input, options),
  update${pascal}: (id: string, input: ${pascal}UpdateInput) => update${pascal}(baseUrl, id, input, options),
  delete${pascal}: (id: string) => delete${pascal}(baseUrl, id, options)
});
`
);

writeFile(
  `apps/web/src/features/${kebab}/definition.ts`,
  `import type { ResourceDefinition } from "@imsys/types";
import type { ${pascal} } from "@imsys/types";

export type ${pascal}FormValues = {
  name: string;
};

export const ${plural}Resource: ResourceDefinition<${pascal}, ${pascal}, ${pascal}FormValues> = {
  key: "${plural}",
  labelKey: "resources:${plural}Label",
  pageTitleKey: "resources:${plural}Title",
  descriptionKey: "resources:${plural}Description",
  createLabelKey: "resources:${plural}CreateLabel",
  createPlaceholderKey: "resources:${plural}CreatePlaceholder",
  searchPlaceholderKey: "resources:${plural}Search",
  totalLabelKey: "resources:${plural}Total",
  latestLabelKey: "resources:${plural}LatestUpdate",
  emptyTitleKey: "resources:${plural}EmptyTitle",
  emptyDescriptionKey: "resources:${plural}EmptyDescription",
  routeBase: "/${plural}",
  permissions: ["read", "create", "update", "delete"],
  columns: [
    {
      id: "name",
      headerKey: "resources:${plural}NameColumn",
      accessor: (item) => item.name
    }
  ],
  filters: [
    {
      key: "search",
      labelKey: "resources:${plural}Search",
      type: "text"
    }
  ],
  sorts: [
    {
      key: "newest",
      labelKey: "resources:${plural}LatestUpdate"
    }
  ],
  formFields: [
    {
      key: "name",
      labelKey: "resources:${plural}CreateLabel",
      placeholderKey: "resources:${plural}CreatePlaceholder",
      input: "text",
      required: true
    }
  ],
  detailSections: [],
  bulkActions: []
};
`
);

writeFile(
  `apps/web/src/features/${kebab}/hooks.ts`,
  `import { useMemo } from "react";
import { create${pascal}Client } from "@imsys/api-client";
import { useResourceCollection } from "@imsys/client";
import type { ${pascal}CreateInput, ${pascal}UpdateInput } from "@imsys/types";
import { apiBaseUrl } from "../../lib/api-base-url";

export const use${pluralPascal}Resource = (accessToken: string | null) => {
  const client = useMemo(
    () => create${pascal}Client(apiBaseUrl, { getAccessToken: () => accessToken }),
    [accessToken]
  );

  const {
    resourceQuery: ${kebab}Query,
    createMutation: create${pascal}Mutation,
    updateMutation: update${pascal}Mutation,
    deleteMutation: delete${pascal}Mutation
  } = useResourceCollection({
    resourceKey: "${plural}",
    scopeKey: accessToken,
    enabled: Boolean(accessToken),
    list: async () => client.get${pluralPascal}(),
    create: async (input: ${pascal}CreateInput) => client.create${pascal}(input),
    update: async ({ id, ...input }: { id: string } & ${pascal}UpdateInput) => client.update${pascal}(id, input),
    remove: async (id: string) => client.delete${pascal}(id)
  });

  return {
    ${kebab}Query,
    create${pascal}Mutation,
    update${pascal}Mutation,
    delete${pascal}Mutation
  };
};
`
);

writeFile(
  `apps/web/src/features/${kebab}/index.ts`,
  `export * from "./definition";
export * from "./hooks";
`
);

writeFile(
  `supabase/migrations/${timestamp}_${kebab}.sql`,
  `-- Scaffolded migration for ${plural}
-- Add the ${plural} table, RLS policies, and any supporting indexes here.
`
);

ensureExport("packages/types/index.ts", `./${kebab}`);
ensureExport("packages/api-client/index.ts", `./${kebab}`);

console.log(`Scaffolded ${plural} resource`);
