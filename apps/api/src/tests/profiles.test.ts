import test from "node:test";
import assert from "node:assert/strict";
import { ensureProfileForIdentity, setProfileStoreForTests } from "../services/profiles";

const SUPABASE_URL = "https://example.supabase.co";
const SERVICE_KEY = "service-role-key";

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json"
    },
    ...init
  });

const createProfileStore = (seed: Array<{
  id: string;
  email: string;
  role: string;
  disabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}> = []) => {
  const rows = new Map(seed.map((row) => [row.id, {
    ...row,
    createdAt: row.createdAt ?? new Date("2026-05-08T00:00:00.000Z"),
    updatedAt: row.updatedAt ?? new Date("2026-05-08T00:00:00.000Z")
  }]));

  return {
    getById: async (id: string) => rows.get(id) ?? null,
    list: async () => [...rows.values()],
    upsert: async (row: {
      id: string;
      email: string;
      role: string;
      disabled: boolean;
      createdAt: Date;
      updatedAt: Date;
    }) => {
      rows.set(row.id, row);
    }
  };
};

test("repairs missing profiles from authenticated identity using safe defaults", async () => {
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  process.env.NODE_ENV = "production";
  process.env.SUPABASE_URL = SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
  setProfileStoreForTests(createProfileStore());

  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url === `${SUPABASE_URL}/auth/v1/admin/users/user-1` && method === "GET") {
      return jsonResponse({
        user: {
          email: "person@example.com",
          banned_until: "2099-01-01T00:00:00.000Z"
        }
      });
    }

    throw new Error(`Unexpected fetch: ${method} ${url}`);
  }) as typeof fetch;

  try {
    const profile = await ensureProfileForIdentity({
      id: "user-1",
      email: "person@example.com",
      appMetadata: null
    });

    assert.equal(profile.email, "person@example.com");
    assert.equal(profile.role, "viewer");
    assert.equal(profile.disabled, true);
  } finally {
    setProfileStoreForTests(null);
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
    process.env.SUPABASE_URL = originalSupabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
  }
});

test("normalizes bootstrap profiles only in development-style environments", async () => {
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  process.env.NODE_ENV = "development";
  process.env.SUPABASE_URL = SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
  setProfileStoreForTests(createProfileStore([{
    id: "user-2",
    email: "admin@local.dev",
    role: "viewer",
    disabled: false
  }]));

  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    throw new Error(`Unexpected fetch: ${method} ${url}`);
  }) as typeof fetch;

  try {
    const profile = await ensureProfileForIdentity({
      id: "user-2",
      email: "admin@local.dev",
      appMetadata: null
    });

    assert.equal(profile.role, "admin");
    assert.equal(profile.email, "admin@local.dev");
  } finally {
    setProfileStoreForTests(null);
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
    process.env.SUPABASE_URL = originalSupabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
  }
});
