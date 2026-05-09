import test from "node:test";
import assert from "node:assert/strict";
import { setWriteAuditLogForTests } from "../services/audit-logs";
import { setProfileStoreForTests } from "../services/profiles";
import { createUser, updateUser } from "../services/users";

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

const withEnv = async (nodeEnv: string, callback: () => Promise<void>) => {
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  process.env.NODE_ENV = nodeEnv;
  process.env.SUPABASE_URL = SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
  setProfileStoreForTests(createProfileStore());
  setWriteAuditLogForTests(() => undefined);

  try {
    await callback();
  } finally {
    setWriteAuditLogForTests(null);
    setProfileStoreForTests(null);
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
    process.env.SUPABASE_URL = originalSupabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
  }
};

test("production user creation uses invite flow without requiring a password", async () => {
  await withEnv("production", async () => {
    let invited = false;

    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === `${SUPABASE_URL}/auth/v1/invite` && method === "POST") {
        const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
        assert.equal(payload.email, "invite@example.com");
        assert.equal((payload.data as Record<string, unknown>)?.cmsRole, "editor");
        invited = true;

        return jsonResponse({
          user: {
            id: "user-invite",
            email: "invite@example.com",
            created_at: "2026-05-08T00:00:00.000Z",
            updated_at: "2026-05-08T00:00:00.000Z",
            banned_until: null
          }
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    }) as typeof fetch;

    const user = await createUser({
      email: "invite@example.com",
      cmsRole: "editor"
    });

    assert.equal(invited, true);
    assert.equal(user.email, "invite@example.com");
    assert.equal(user.cmsRole, "editor");
  });
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

test("role and disabled updates write through profiles without calling auth admin update", async () => {
  await withEnv("production", async () => {
    const requests: Array<{ url: string; method: string; body?: string }> = [];

    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      requests.push({ url, method });

      if (url === `${SUPABASE_URL}/auth/v1/admin/users/user-1` && method === "GET") {
        return jsonResponse({
          user: {
            id: "user-1",
            email: "person@example.com",
            created_at: "2026-05-08T00:00:00.000Z",
            updated_at: "2026-05-08T00:00:00.000Z",
            banned_until: null
          }
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    }) as typeof fetch;

    const user = await updateUser("user-1", {
      cmsRole: "editor",
      disabled: true
    });

    assert.equal(user?.cmsRole, "editor");
    assert.equal(user?.disabled, true);
    assert.equal(
      requests.some(({ url, method }) => url === `${SUPABASE_URL}/auth/v1/admin/users/user-1` && method === "PUT"),
      false
    );
  });
});

test("password updates still call auth admin update", async () => {
  await withEnv("production", async () => {
    let sawPasswordUpdate = false;

    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === `${SUPABASE_URL}/auth/v1/admin/users/user-1` && method === "GET") {
        return jsonResponse({
          user: {
            id: "user-1",
            email: "person@example.com",
            created_at: "2026-05-08T00:00:00.000Z",
            updated_at: "2026-05-08T00:00:00.000Z",
            banned_until: null
          }
        });
      }

      if (url === `${SUPABASE_URL}/auth/v1/admin/users/user-1` && method === "PUT") {
        const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
        assert.deepEqual(payload, { password: "temp-pass" });
        sawPasswordUpdate = true;

        return jsonResponse({
          user: {
            id: "user-1",
            email: "person@example.com",
            created_at: "2026-05-08T00:00:00.000Z",
            updated_at: "2026-05-08T00:01:00.000Z",
            banned_until: null
          }
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    }) as typeof fetch;

    const user = await updateUser("user-1", {
      password: "temp-pass"
    });

    assert.equal(user?.cmsRole, "viewer");
    assert.equal(sawPasswordUpdate, true);
  });
});

test("bootstrap email protections do not apply outside development", async () => {
  await withEnv("production", async () => {
    setProfileStoreForTests(createProfileStore([{
      id: "user-2",
      email: "admin@local.dev",
      role: "admin",
      disabled: false
    }]));

    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === `${SUPABASE_URL}/auth/v1/admin/users/user-2` && method === "GET") {
        return jsonResponse({
          user: {
            id: "user-2",
            email: "admin@local.dev",
            created_at: "2026-05-08T00:00:00.000Z",
            updated_at: "2026-05-08T00:00:00.000Z",
            banned_until: null
          }
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    }) as typeof fetch;

    const user = await updateUser("user-2", { cmsRole: "viewer" });
    assert.equal(user?.cmsRole, "viewer");
  });
});
