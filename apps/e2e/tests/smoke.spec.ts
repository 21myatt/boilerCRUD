import { expect, test } from "@playwright/test";

const requiredEnv = [
  "E2E_BASE_URL",
  "E2E_SUPABASE_URL",
  "E2E_SUPABASE_ANON_KEY",
  "E2E_USER_EMAIL",
  "E2E_USER_PASSWORD",
];

const missing = requiredEnv.filter((key) => !process.env[key]?.trim());
test.skip(missing.length > 0, `Missing E2E env: ${missing.join(", ")}. Copy apps/e2e/.env.example to apps/e2e/.env or set CI environment variables.`);

test("login -> create -> read on the staging worker", async ({ request }) => {
  const baseUrl = process.env.E2E_BASE_URL!.trim().replace(/\/$/, "");
  const supabaseUrl = process.env.E2E_SUPABASE_URL!.trim().replace(/\/$/, "");
  const anonKey = process.env.E2E_SUPABASE_ANON_KEY!.trim();
  const email = process.env.E2E_USER_EMAIL!.trim();
  const password = process.env.E2E_USER_PASSWORD!.trim();

  const tokenResponse = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: {
      apikey: anonKey,
      "content-type": "application/json",
    },
    data: {
      email,
      password,
    },
  });

  expect(tokenResponse.ok()).toBeTruthy();
  const tokenBody = await tokenResponse.json() as { access_token?: string };
  expect(tokenBody.access_token).toBeTruthy();

  const authHeaders = {
    authorization: `Bearer ${tokenBody.access_token}`,
    "content-type": "application/json",
  };

  const createResponse = await request.post(`${baseUrl}/api/items`, {
    headers: authHeaders,
    data: {
      name: `E2E Item ${Date.now()}`,
    },
  });

  expect(createResponse.ok()).toBeTruthy();
  const createBody = await createResponse.json() as { data?: { id?: string } };
  expect(createBody.data?.id).toBeTruthy();

  const listResponse = await request.get(`${baseUrl}/api/items`, {
    headers: authHeaders,
  });

  expect(listResponse.ok()).toBeTruthy();
  const listBody = await listResponse.json() as { data?: Array<{ id: string }> };
  expect(listBody.data?.some((item) => item.id === createBody.data?.id)).toBe(true);

  await request.delete(`${baseUrl}/api/items/${createBody.data!.id}`, {
    headers: authHeaders,
  });
});
