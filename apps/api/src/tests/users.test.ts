import test from "node:test";
import assert from "node:assert/strict";
import { AppError, normalizeAppEnv } from "@imsys/utils";
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
  const originalInviteRedirectTo = process.env.INVITE_REDIRECT_TO;
  const originalInviteRedirectOrigins = process.env.INVITE_REDIRECT_ORIGINS;

  process.env.NODE_ENV = nodeEnv;
  process.env.SUPABASE_URL = SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
  process.env.INVITE_REDIRECT_TO = "http://localhost:5173";
  process.env.INVITE_REDIRECT_ORIGINS = "http://localhost:5173,https://app.example.com";
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
    process.env.INVITE_REDIRECT_TO = originalInviteRedirectTo;
    process.env.INVITE_REDIRECT_ORIGINS = originalInviteRedirectOrigins;
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

test("production invite rejects redirect URLs outside allowlist", async () => {
  await withEnv("production", async () => {
    await assert.rejects(
      () => createUser({
        email: "invite@example.com",
        cmsRole: "editor",
        redirectTo: "https://evil.example.com/claim"
      }),
      (error) => {
        assert.equal(error instanceof AppError, true);
        assert.equal((error as AppError).statusCode, 400);
        assert.equal((error as Error).message, "Invalid invite redirect URL");
        return true;
      }
    );
  });
});

test("production invite accepts redirect URLs from allowlist origins", async () => {
  await withEnv("production", async () => {
    let invited = false;

    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === `${SUPABASE_URL}/auth/v1/invite` && method === "POST") {
        const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
        assert.equal(payload.redirect_to, "https://app.example.com/invite/finish");
        invited = true;

        return jsonResponse({
          user: {
            id: "user-invite-2",
            email: "invite@example.com",
            created_at: "2026-05-08T00:00:00.000Z",
            updated_at: "2026-05-08T00:00:00.000Z",
            banned_until: null
          }
        });
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    }) as typeof fetch;

    await createUser({
      email: "invite@example.com",
      cmsRole: "editor",
      redirectTo: "https://app.example.com/invite/finish"
    });

    assert.equal(invited, true);
  });
});

test("password creation rejects weak passwords", async () => {
  await withEnv("development", async () => {
    await assert.rejects(
      () => createUser({
        email: "weak@example.com",
        cmsRole: "viewer",
        password: "weakpass"
      }),
      (error) => {
        assert.equal(error instanceof AppError, true);
        assert.equal((error as AppError).statusCode, 400);
        assert.equal(
          (error as Error).message,
          "Password must be at least 12 characters and include uppercase, lowercase, and number"
        );
        return true;
      }
    );
  });
});

const createProfileStore = (seed: Array<{
  id: string;
  appEnv?: string;
  email: string;
  role: string;
  disabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}> = []) => {
  const rows = new Map(seed.map((row) => {
    const appEnv = row.appEnv ?? normalizeAppEnv(process.env.NODE_ENV);
    return [`${row.id}:${appEnv}`, {
    ...row,
    appEnv,
    createdAt: row.createdAt ?? new Date("2026-05-08T00:00:00.000Z"),
    updatedAt: row.updatedAt ?? new Date("2026-05-08T00:00:00.000Z")
    }];
  }));

  return {
    getById: async (id: string, appEnv: string) => rows.get(`${id}:${appEnv}`) ?? null,
    list: async (appEnv: string) => [...rows.values()].filter((row) => row.appEnv === appEnv),
    upsert: async (row: {
      id: string;
      appEnv: string;
      email: string;
      role: string;
      disabled: boolean;
      createdAt: Date;
      updatedAt: Date;
    }) => {
      rows.set(`${row.id}:${row.appEnv}`, row);
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
        assert.deepEqual(payload, { password: "TempPassword1" });
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
      password: "TempPassword1"
    });

    assert.equal(user?.cmsRole, "viewer");
    assert.equal(sawPasswordUpdate, true);
  });
});

test("password reset rejects weak passwords", async () => {
  await withEnv("production", async () => {
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

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    }) as typeof fetch;

    await assert.rejects(
      () => updateUser("user-1", {
        password: "shortpass"
      }),
      (error) => {
        assert.equal(error instanceof AppError, true);
        assert.equal((error as AppError).statusCode, 400);
        assert.equal(
          (error as Error).message,
          "Password must be at least 12 characters and include uppercase, lowercase, and number"
        );
        return true;
      }
    );
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
