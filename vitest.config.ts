import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const packagePath = (segment: string) => path.join(repoRoot, segment);

export default defineConfig({
  root: repoRoot,
  resolve: {
    alias: {
      "@imsys/auth": packagePath("packages/auth/index.ts"),
      "@imsys/api-client": packagePath("packages/api-client/index.ts"),
      "@imsys/client": packagePath("packages/client/index.ts"),
      "@imsys/db": packagePath("packages/db/index.ts"),
      "@imsys/types": packagePath("packages/types/index.ts"),
      "@imsys/ui": packagePath("packages/ui/index.ts"),
      "@imsys/utils": packagePath("packages/utils/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["packages/tests/src/**/*.test.ts"],
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
  },
});
