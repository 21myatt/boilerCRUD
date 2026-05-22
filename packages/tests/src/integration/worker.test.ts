import { beforeEach, describe, expect, it, vi } from "vitest";

let workerModule: typeof import("../../../../apps/web/src/worker.ts");

const workerEnv = {
  ASSETS: {
    fetch: vi.fn(async () => new Response("asset")),
  },
  APP_ENV: "staging",
  APP_NAME: "your-app-web",
  CORS_ORIGINS: "http://localhost:5173",
  SUPABASE_URL: "https://supabase.example",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });

const mockSupabaseFetch = vi.fn(async (input: RequestInfo | URL) => {
  const url = input instanceof Request ? input.url : String(input);

  if (url.includes("/rest/v1/profiles") && url.includes("id=eq.user-1") && url.includes("app_env=eq.staging")) {
    return jsonResponse([
      {
        id: "user-1",
        email: "person@example.com",
        role: "admin",
        disabled: false,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
      },
    ]);
  }

  if (url.includes("/rest/v1/items") && url.includes("user_id=eq.user-1") && url.includes("app_env=eq.staging")) {
    return jsonResponse([
      {
        id: "item-1",
        user_id: "user-1",
        category_id: "category-1",
        name: "First item",
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
      },
    ]);
  }

  if (url.includes("/rest/v1/app_schema_state")) {
    return jsonResponse([
      {
        singleton_key: "current",
        schema_version: "2026-05-22-env-scoped-data-v1",
        updated_at: "2024-01-01T00:00:00.000Z",
      },
    ]);
  }

  if (url.includes("/auth/v1/admin/users?page=1&per_page=1")) {
    return jsonResponse({ users: [] });
  }

  if (url.includes("/storage/v1/bucket")) {
    return jsonResponse([{ id: "cms-assets", name: "cms-assets" }]);
  }

  if (url.includes("/rest/v1/profiles?app_env=eq.staging&select=id&limit=1")) {
    return jsonResponse([{ id: "user-1" }]);
  }

  return jsonResponse([]);
});

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("__IMSYS_VERIFY_ACCESS_TOKEN__", async () => ({
    id: "user-1",
    email: "person@example.com",
    role: "authenticated",
    appMetadata: {},
    accessToken: "access-token",
  }));

  mockSupabaseFetch.mockClear();
  vi.stubGlobal("fetch", mockSupabaseFetch);

  return import("../../../../apps/web/src/worker.ts").then((module) => {
    workerModule = module;
  });
});

describe("worker fetch handler", () => {
  it("rejects protected api routes without a bearer token", async () => {
    const response = await workerModule.default.fetch(
      new Request("https://example.test/api/items"),
      workerEnv as never
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns items from the api route after auth", async () => {
    const response = await workerModule.default.fetch(
      new Request("https://example.test/api/items", {
        headers: {
          authorization: "Bearer access-token",
        },
      }),
      workerEnv as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: "item-1",
          name: "First item",
          categoryId: "category-1",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    });
  });

  it("returns diagnostics through the api route after auth", async () => {
    const response = await workerModule.default.fetch(
      new Request("https://example.test/api/admin/diagnostics", {
        headers: {
          authorization: "Bearer access-token",
        },
      }),
      workerEnv as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        checks: {
          database: { ok: true },
          storageBucket: { ok: true },
          schemaVersion: {
            ok: true,
            expected: "2026-05-22-env-scoped-data-v1",
          },
        },
      },
    });
  });
});
