# Cloudflare + Supabase Boilerplate Setup

This is the default deployment path for the repo.

- `apps/web` is the primary Cloudflare-hosted frontend and Worker boundary.
- `apps/web/src/worker.ts` serves static assets and same-origin `/api/*` routes.
- Supabase remains the source of truth for Auth, Postgres, Storage, and RLS.
- `apps/api` remains available for local compatibility work and non-Cloudflare deployments, but it is not the default public backend for the boilerplate.

## Required Variables

Build-time variables for the web app:

- `VITE_API_URL=/api`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If `VITE_API_URL` is omitted in the Cloudflare-first production path, the web app now defaults to same-origin `/api`.

Worker runtime vars and secrets for `apps/web`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORS_ORIGINS`
- `APP_NAME`
- `APP_ENV`

Local file for Worker runtime development:

- copy `apps/web/.dev.vars.example` to `apps/web/.dev.vars`

## Local Development Modes

Preferred Cloudflare-first local mode:

1. Set `VITE_API_URL=/api` in root `.env`.
2. Build the web app once with `pnpm --filter @imsys/web build`.
3. Run the Worker with `pnpm web:edge:dev`.
4. Open the Wrangler URL, usually `http://localhost:8787`.

This gives the web app the same `/api` contract used in deployment.

Compatibility mode during migration:

1. Leave `VITE_API_URL` unset or set it to `http://localhost:4000`.
2. Run `apps/api` and `apps/web` separately.
3. Use this only if you need the legacy Node API path.

## Supabase Migrations

The canonical schema rollout path is now:

- tracked SQL files in `supabase/migrations/`
- `pnpm db:migrate` for remote rollout against `DATABASE_URL`
- `pnpm bootstrap:supabase` for verification
- `pnpm bootstrap:supabase -- --apply` when you want verification plus migration apply

`supabase/schema.sql` remains in the repo as a readable snapshot of the current baseline, but migrations are the authoritative rollout path.

## CORS

Browser calls from the deployed web app are same-origin when `VITE_API_URL=/api`, so browser CORS is much simpler than the old split-origin setup.

`CORS_ORIGINS` still matters for:

- local Vite-to-API development
- mobile or other non-browser callers hitting the Worker directly
- any legacy split-origin compatibility flow

Recommended policy:

- keep production Worker origins explicit
- include local origins only for local development
- do not use `*` for authenticated admin routes

## MCP Workflow

Expected operator workflow:

- Supabase MCP: inspect schema, RLS, storage, and auth state
- Cloudflare MCP: inspect Worker config, deploy status, and runtime behavior

Recommended verification pass before deploy:

1. Confirm `supabase/migrations/` contains the expected baseline and latest deltas.
2. Confirm Cloudflare build vars include `VITE_API_URL=/api`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`.
3. Confirm Worker runtime includes `SUPABASE_URL` and the service-role secret.
4. Confirm `CORS_ORIGINS` contains only approved callers.
5. Load `/health` and exercise `/api/users`, `/api/admin/diagnostics`, and `/api/admin/audit-logs` with a valid admin token.

## Deploy Commands

Recommended release order:

```bash
pnpm verify:boilerplate
pnpm web:edge:release:check
pnpm --filter @imsys/web build
pnpm web:edge:deploy:staging
```

Then promote to production:

```bash
pnpm web:edge:deploy:production
```

Set the required Worker secret per environment with Wrangler:

```bash
pnpm --dir apps/web exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config wrangler.jsonc --env staging
pnpm --dir apps/web exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config wrangler.jsonc --env production
```

The `apps/web/wrangler.jsonc` file now declares `secrets.required`, so deploy will fail if the production Worker is missing that secret.
