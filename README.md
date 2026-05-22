# CRUD Starter

CRUD Starter is a `pnpm` + Turbo monorepo for a Supabase-first CRUD starter with a Cloudflare-hosted web app. The default deployment shape is now:

- `apps/web` on Cloudflare Workers for the frontend and same-origin `/api`
- Supabase for Auth, Postgres, Storage, and RLS
- `apps/api` kept as a local compatibility path or alternate backend, not the default public server

The repo currently ships `items`, `categories`, `assets`, admin user management, diagnostics, and audit logs.

## Stack

- `apps/web`: Vite + React 19 + TanStack Router
- `apps/mobile`: Expo + React Native
- `apps/api`: optional Node compatibility backend
- `apps/cloudflare`: optional generic edge proxy scaffold
- Supabase Auth, Postgres, Storage
- Cloudflare Workers static assets + Worker routes

## Default Architecture

- Web auth and asset storage use Supabase directly.
- Web admin and compatibility CRUD routes go through `apps/web/src/worker.ts` on `/api/*`.
- Mobile talks directly to Supabase with RLS.
- Supabase schema rollout is tracked in `supabase/migrations/`.

## Prerequisites

- Node.js 20+
- `pnpm` 9
- Supabase CLI available either globally as `supabase` or through `npx supabase`
- a Supabase project
- a Cloudflare account for the default web deployment path
- Redis only if you plan to run `apps/worker`

## Install

```bash
pnpm install
cp .env.example .env
cp apps/mobile/.env.example apps/mobile/.env
cp apps/web/.dev.vars.example apps/web/.dev.vars
cp apps/e2e/.env.example apps/e2e/.env # optional, only for live smoke checks
```

## Environment

Root `.env`:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
APP_ENV=development
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SUPABASE-SERVICE-ROLE-KEY]
SUPABASE_SECRET_KEY=[YOUR-SUPABASE-SECRET-KEY]
SUPABASE_ACCESS_TOKEN=[YOUR-SUPABASE-MANAGEMENT-API-TOKEN]
INVITE_REDIRECT_TO=http://localhost:5173
SUPABASE_AUTH_SITE_URL=http://localhost:5173
SUPABASE_AUTH_URI_ALLOW_LIST=http://localhost:5173,http://localhost:5173/**,https://[YOUR-WORKER-DOMAIN],https://[YOUR-WORKER-DOMAIN]/**
API_URL=http://localhost:4000
CORS_ORIGINS=http://localhost:5173,http://localhost:8081,https://[YOUR-WORKER-DOMAIN]
VITE_API_URL=/api
VITE_USE_LOCAL_API=false
VITE_APP_ENV=development
VITE_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR-SUPABASE-ANON-KEY]
```

`apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[YOUR-SUPABASE-ANON-KEY]
EXPO_PUBLIC_APP_ENV=development
```

`apps/web/.dev.vars`:

```env
APP_ENV=development
APP_NAME=your-app-web
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SUPABASE-SERVICE-ROLE-KEY]
CORS_ORIGINS=http://localhost:5173,http://localhost:8081,http://localhost:8787
```

## Supabase Schema Workflow

The canonical schema path is:

1. Keep tracked SQL files in `supabase/migrations/`.
2. Apply them with `pnpm db:migrate`.
3. Verify setup with `pnpm bootstrap:supabase`.

Useful commands:

```bash
pnpm db:migrate
pnpm bootstrap:supabase
pnpm bootstrap:supabase -- --apply
pnpm supabase:auth:harden
pnpm verify:boilerplate
pnpm web:edge:release:check
```

`pnpm supabase:auth:harden` uses the Supabase Management API to patch password policy and auth URL config. By default it derives `site_url` and `uri_allow_list` from `INVITE_REDIRECT_TO`, `INVITE_REDIRECT_ORIGINS`, and `CORS_ORIGINS`; set `SUPABASE_AUTH_SITE_URL` or `SUPABASE_AUTH_URI_ALLOW_LIST` when you need an explicit override.

`supabase/schema.sql` remains as a readable baseline snapshot, but migrations are the source of truth for rollout.

## Local Development

Preferred Cloudflare-first mode:

```bash
pnpm --filter @imsys/web build
pnpm web:edge:dev
```

Open the Wrangler URL, usually `http://localhost:8787`. This uses the same `/api` contract as production.

Legacy compatibility mode:

```bash
./run api web
# or choose any other set of up to 4 apps
```

Use this only when you need the standalone Node API path. `./run` opens a 2x2 Terminal grid and supports up to 4 selected apps at once, so use `./run list` first instead of calling it with no arguments in this repo.

## Clean Clone Verification

For a starter-quality sanity check from a fresh clone:

```bash
pnpm install
pnpm verify:boilerplate
pnpm typecheck
pnpm test
pnpm build
```

Expected result:

- `pnpm verify:boilerplate`, `pnpm typecheck`, and `pnpm test` should pass without external services.
- `pnpm build` should pass for the monorepo, including `apps/mobile`.
- `pnpm bootstrap:supabase:local` requires Docker access plus the Supabase CLI and validates the local database/auth/storage path.
- `pnpm --filter @imsys/e2e test` only runs the live smoke test when `E2E_*` env vars are present; otherwise it skips intentionally.

If you want a local live smoke run, copy `apps/e2e/.env.example` to `apps/e2e/.env` and point it at a deployed Worker plus a real Supabase test user.

## Deploy

For the default deployment path:

1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   `VITE_API_URL=/api` is recommended, but the Cloudflare-first production path now defaults to `/api` if it is omitted.
2. Run `pnpm verify:boilerplate`.
3. Run `pnpm web:edge:release:check`.
4. Run `pnpm web:edge:deploy:check`.
5. Build `apps/web`.
6. Set Worker runtime vars for `SUPABASE_URL`, `CORS_ORIGINS`, `APP_NAME`, and `APP_ENV`.
   Set build vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_APP_ENV` to the same target environment.
   `SUPABASE_URL` must match `VITE_SUPABASE_URL`.
   `SUPABASE_URL` must match `VITE_SUPABASE_URL`.
   `SUPABASE_URL` must match `VITE_SUPABASE_URL` exactly, or the Worker will verify JWTs against the wrong Supabase issuer.
   SUPABASE_URL must match VITE_SUPABASE_URL.
   Leave `VITE_USE_LOCAL_API=false` unless you explicitly want the legacy `http://localhost:4000` backend.
7. Set the Worker secret `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`.
8. Deploy with `pnpm web:edge:deploy:staging` or `pnpm web:edge:deploy:production`.

If you are using one Supabase project for both staging and production, purge staging app data with:

```bash
pnpm db:cleanup:app-env -- --env staging
```

That deletes env-scoped app rows and asset objects, but it does not touch `auth.users`.

`apps/cloudflare` still exists as a separate generic proxy scaffold, but it is no longer the main boilerplate story.

## MCP

Recommended operator flow:

- GitHub MCP for repositories, pull requests, issues, and Actions context
- Supabase MCP for schema, RLS, storage, and auth inspection
- Cloudflare MCP for Worker config, deploy inspection, and runtime debugging

Tracked MCP bootstrap:

- shared repo MCP endpoints live in [.mcp.json](.mcp.json)
- Codex GitHub MCP example lives in [config/codex-github-mcp.example.toml](config/codex-github-mcp.example.toml)
- set `GITHUB_PAT_TOKEN` locally if your MCP host uses PAT auth instead of OAuth

## Starter Notes

- The current package scope remains `@imsys/*`. That is internal workspace naming, not a deployment requirement, but most downstream projects will want to rename it during adoption.
- User-facing defaults have been reduced to generic placeholders such as `your-app-web`, but you should still replace placeholder app names, domains, and Supabase refs before first deployment.

## GitHub CI/CD Contract

Boilerplate deploy contract is enforced in tracked repo files, not internal docs:

- GitHub `develop` -> staging deploy
- GitHub `main` -> production deploy
- required GitHub env vars and secrets live in [config/boilerplate-contract.json](config/boilerplate-contract.json)
- GitHub environment value template lives in [config/github-environments.template.json](config/github-environments.template.json)
- GitHub branch protection template lives in [config/github-branch-protection.template.json](config/github-branch-protection.template.json)
- inspect current contract with `pnpm boilerplate:contract`
- inspect GitHub bootstrap commands with `pnpm boilerplate:github`
- `pnpm verify:boilerplate` fails if old Cloudflare or Supabase project identity leaks back into committed boilerplate files
