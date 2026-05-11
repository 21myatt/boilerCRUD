# Cloudflare + Supabase Boilerplate Verification

Use this as the release gate for the Cloudflare-first boilerplate path.

## Static Repo Verification

Run:

```bash
pnpm verify:boilerplate
```

This verifies the repo-level requirements that can be checked without a live deploy:

- tracked Supabase migrations exist
- required Cloudflare and Supabase env vars are documented
- Worker runtime secret names are documented in committed examples
- the web API base requires `VITE_API_URL` outside local development
- frontend source has no unexpected `localhost` network target outside the guarded dev fallback
- the gap plan reflects the completed static verification work

## Local Smoke Test

1. Copy `.env.example`, `apps/mobile/.env.example`, and `apps/web/.dev.vars.example`.
2. Fill in a real Supabase project.
3. Run `pnpm db:migrate`.
4. Run `pnpm bootstrap:supabase`.
5. Run `pnpm --filter @imsys/web build`.
6. Run `pnpm web:edge:dev`.
7. Open the local Wrangler URL and confirm:
   - login works
   - items list loads
   - categories CRUD works
   - admin users page loads for an admin user
   - diagnostics loads
   - audit logs load

## Deployed Smoke Test

Before calling the boilerplate one-shot, complete this against the real Cloudflare deployment:

1. Confirm Cloudflare build vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - optionally `VITE_API_URL=/api`
2. Confirm Worker runtime vars:
   - `SUPABASE_URL`
   - `CORS_ORIGINS`
   - `APP_NAME`
   - `APP_ENV`
3. Confirm Worker secret:
   - `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`
4. Confirm `/health` returns `ok: true`.
5. Log in on the deployed Cloudflare URL.
6. Confirm `items`, `categories`, `users`, `diagnostics`, and `audit logs` all work.
7. Confirm browser network requests do not target `localhost`.

## MCP Verification

Recommended MCP checks:

- Supabase MCP:
  - verify `public.app_schema_state`
  - verify `public.profiles`
  - verify `cms-assets` bucket
  - verify RLS and storage policy expectations
- Cloudflare MCP:
  - verify build env vars
  - verify Worker runtime vars and secret bindings
  - inspect deploy/build state
  - inspect runtime logs if any route fails
