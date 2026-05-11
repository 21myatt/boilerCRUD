# IMSys

IMSys is a `pnpm` + Turbo monorepo for a Supabase-first CRUD starter with a Cloudflare-hosted web app. The default deployment shape is now:

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
```

## Environment

Root `.env`:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SUPABASE-SERVICE-ROLE-KEY]
SUPABASE_SECRET_KEY=[YOUR-SUPABASE-SECRET-KEY]
INVITE_REDIRECT_TO=http://localhost:5173
API_URL=http://localhost:4000
CORS_ORIGINS=http://localhost:5173,http://localhost:8081,https://[YOUR-WORKER-DOMAIN]
VITE_API_URL=/api
VITE_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR-SUPABASE-ANON-KEY]
```

`apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[YOUR-SUPABASE-ANON-KEY]
```

`apps/web/.dev.vars`:

```env
APP_ENV=development
APP_NAME=imsys-web
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
pnpm verify:boilerplate
pnpm web:edge:release:check
```

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

## Deploy

For the default deployment path:

1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   `VITE_API_URL=/api` is recommended, but the Cloudflare-first production path now defaults to `/api` if it is omitted.
2. Run `pnpm verify:boilerplate`.
3. Run `pnpm web:edge:release:check`.
4. Build `apps/web`.
5. Set Worker runtime vars for `SUPABASE_URL`, `CORS_ORIGINS`, `APP_NAME`, and `APP_ENV`.
6. Set the Worker secret `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`.
7. Deploy with `pnpm web:edge:deploy:staging` or `pnpm web:edge:deploy:production`.

`apps/cloudflare` still exists as a separate generic proxy scaffold, but it is no longer the main boilerplate story.

## MCP

Recommended operator flow:

- Supabase MCP for schema, RLS, storage, and auth inspection
- Cloudflare MCP for Worker config, deploy inspection, and runtime debugging

See [docs/cloudflare-supabase-boilerplate-setup.md](docs/cloudflare-supabase-boilerplate-setup.md) for the Cloudflare-first rollout path and [docs/supabase-project-switching.md](docs/supabase-project-switching.md) for moving the boilerplate between Supabase projects.
Use [docs/cloudflare-supabase-boilerplate-verification.md](docs/cloudflare-supabase-boilerplate-verification.md) as the onboarding and release checklist.
