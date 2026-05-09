# IMSys

Current milestone: `v1.3.1`

IMSys is a `pnpm` + Turbo monorepo for a Supabase-first CRUD starter that can also serve as a basic CMS/admin foundation. It is intended to be cloned per project and pointed at different Supabase projects or accounts through environment configuration. The current repo ships three concrete resources: `items`, `categories`, and `assets`.

Supabase is the shared backend for Auth, Postgres, and Storage. The access pattern is split today:

- `apps/web` uses the API for `items` and `categories`, and talks to Supabase directly for auth and asset storage flows.
- `apps/mobile` talks directly to Supabase for auth, `items`, `categories`, and `assets`, with RLS as the access boundary.
- `apps/api` connects straight to Postgres through `DATABASE_URL` and validates Supabase bearer tokens.

Today, the repo is best understood as:

- a simple CRUD app starter by default
- a web/mobile/admin foundation with auth, roles, and media
- a base that can expand into richer CMS patterns later if a project needs them

## Stack

- `pnpm` workspaces
- `turbo` task orchestration
- `apps/web`: Vite + React 19 + TanStack Router + React Query
- `apps/mobile`: Expo + React Native + React Query
- `apps/api`: TypeScript Node service
- `apps/cloudflare`: Optional Cloudflare Worker edge gateway
- `apps/worker`: BullMQ worker
- Supabase Auth, Postgres, and Storage
- Shared workspace packages for auth, DB, API clients, shared client helpers, types, UI, and utilities

## Workspace Layout

```txt
apps/
  api/       Backend API for authenticated CRUD and service logic
  cloudflare Optional Cloudflare Worker edge gateway and deploy scaffold
  mobile/    Expo mobile client
  web/       Admin-style web client
  worker/    BullMQ background worker

packages/
  api-client Shared API client helpers
  auth       Roles, permissions, auth helpers
  client     Shared resource/query helpers
  db         DB client, schema, seed entrypoints
  types      Shared domain and API types
  ui         Reusable UI primitives
  utils      Shared helpers

supabase/
  schema.sql Supabase schema, RLS, grants, and storage setup
```

## Current Resource Coverage

- `items`, `categories`, and `assets` all exist as real resources in web and mobile.
- `assets` stores private files in the `cms-assets` bucket and keeps metadata in `public.assets`.
- `items` can now optionally point at `categories` through `items.category_id`.
- Admin-style auth, permissions, and media flows are already part of the baseline.
- Admin-only user management now exists on the web through the API, backed by Supabase Auth admin endpoints plus `public.profiles`.
- The repo is env-driven, so the same codebase can target different Supabase projects and accounts without code changes.
- Richer relationships and nested content remain roadmap work in [`plan.md`](plan.md).

## Prerequisites

- Node.js 20+
- `pnpm` 9
- A Supabase project
- Redis, only if you plan to run the worker
- Expo Go or a simulator, only if you plan to run the mobile app
- A Cloudflare account, only if you plan to run or deploy the edge gateway

## Install

```bash
pnpm install
```

## Environment

Copy the root env template:

```bash
cp .env.example .env
```

Copy the mobile env template:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Root `.env`:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SUPABASE-SERVICE-ROLE-KEY]
SUPABASE_SECRET_KEY=[YOUR-SUPABASE-SECRET-KEY]
API_URL=http://localhost:4000
CORS_ORIGINS=http://localhost:5173,http://localhost:8081
VITE_API_URL=http://localhost:4000
VITE_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR-SUPABASE-ANON-KEY]
```

`apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[YOUR-SUPABASE-ANON-KEY]
```

Notes:

- The API reads `DATABASE_URL` for Postgres and `SUPABASE_URL` for token issuer validation.
- The API reads `CORS_ORIGINS` to allow browser access only from explicit frontend origins.
- The API reads `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` for admin-only user management against Supabase Auth.
- The web app reads `VITE_API_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`.
- The mobile app reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- `CF_API_ORIGIN` and `CF_CORS_ORIGINS` are optional root references for the Cloudflare template and should be copied into `apps/cloudflare/.dev.vars` if you enable the edge gateway.

## Cloudflare Edge Setup

This repo now includes an optional Worker app in [`apps/cloudflare`](apps/cloudflare) so future cloned projects can reuse the same Cloudflare setup flow without replacing the current Supabase-first architecture.

Default Worker behavior:

- serves `GET /` with a small JSON manifest
- serves `GET /health` for edge health checks
- proxies `/api/*` to a configurable upstream API origin
- applies edge CORS headers from a comma-separated allowlist

Initial setup:

```bash
cp apps/cloudflare/.dev.vars.example apps/cloudflare/.dev.vars
pnpm install
pnpm cf:dev
```

Set the local proxy target in `apps/cloudflare/.dev.vars`:

```env
API_ORIGIN=http://localhost:4000
CORS_ORIGINS=http://localhost:5173,http://localhost:8081
```

One-time Cloudflare auth for deploys:

```bash
npx wrangler login
```

Deploy commands:

```bash
pnpm cf:deploy:staging
pnpm cf:deploy
```

For each new client project, the normal reuse points are:

- rename the Worker entries in [`apps/cloudflare/wrangler.jsonc`](apps/cloudflare/wrangler.jsonc)
- point `API_ORIGIN` at the project-specific API
- tighten `CORS_ORIGINS` to the frontend domains for that project
- extend [`apps/cloudflare/src/index.ts`](apps/cloudflare/src/index.ts) for custom edge routing, caching, webhooks, auth checks, or redirects

Cloudflare MCP should be treated as the default operational workflow for frontend hosting in the same way Supabase MCP is the default operational workflow for backend setup and verification.

For this repo, the recommended Cloudflare MCP flow is:

- `cloudflare-api` for broad account and project operations
- `cloudflare-builds` for build/deploy inspection and Workers Builds troubleshooting
- `cloudflare-observability` for post-deploy logs and runtime debugging
- `cloudflare-docs` for current Cloudflare product reference

## Supabase Setup

This repo expects Supabase-hosted Postgres, Auth, and Storage.

Supabase MCP is the recommended way to inspect, repair, and verify a project using this boilerplate. The codebase still uses [`supabase/schema.sql`](supabase/schema.sql) as the bootstrap source of truth, but MCP is the preferred operational workflow for:

- checking schema drift
- applying or reconciling bootstrap expectations
- verifying RLS and storage policies
- checking advisors after schema changes

Before local development:

1. Create a Supabase project.
2. Apply [`supabase/schema.sql`](supabase/schema.sql).
3. Create at least one Auth user in Supabase Auth.
4. Fill in `.env` and `apps/mobile/.env` with values from that project.
5. Repeat the same env/project mapping for any other Supabase account or client project you want this starter to manage.

`supabase/schema.sql` currently bootstraps:

- `public.items`, `public.categories`, and `public.assets`
- `public.profiles` for role/status resolution
- the shared `public.set_updated_at()` trigger function
- a profile sync trigger from `auth.users` into `public.profiles`
- user-scoped RLS policies on all three tables
- self-read RLS for `public.profiles`
- explicit `authenticated` grants for direct Supabase CRUD on `items` and `categories`
- the private `cms-assets` bucket
- storage object policies for user-owned asset paths

Caveats:

- Mobile CRUD depends on the direct Supabase tables and policies being present. If your project already drifted from `supabase/schema.sql`, reconcile that drift before relying on mobile resource flows.
- The root `db:migrate` and `db:seed` scripts exist at the Turbo layer, but this repo does not yet wire package-level migration or seed scripts into a complete local workflow. Treat `supabase/schema.sql` as the bootstrap source of truth for now.
- `admin@local.dev` and `viewer@local.dev` still exist as protected bootstrap users, but everyday role/status resolution now comes from `public.profiles` rather than JWT `app_metadata`.
- The same codebase can be reused across different Supabase tenants as long as each environment is configured with its own URL, keys, and database connection.

## Run Apps

Open local apps in separate Terminal windows arranged in a 2x2 grid:

```bash
./run
```

List detected apps:

```bash
./run list
```

Run selected apps only:

```bash
./run api web
./run worker
./run mobile
```

Expected local endpoints:

- API: `http://localhost:4000`
- Web: `http://localhost:5173`
- Mobile: Expo dev server output in the terminal

## Common Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm test
pnpm typecheck
pnpm db:migrate
pnpm db:seed
pnpm worker:start
pnpm cf:dev
pnpm cf:deploy:staging
pnpm cf:deploy
```

## App Responsibilities

### Web

- Signs users in with Supabase Auth
- Uses the API for `items` and `categories`
- Uses the API for admin-only user management
- Uses direct Supabase access for asset metadata, upload, delete, and signed URL retrieval
- Acts as the current admin-style interface for the shared Supabase project

### Mobile

- Signs users in with Supabase Auth
- Uses direct Supabase access for `items`, `categories`, and `assets`
- Depends on Supabase RLS and table grants rather than the Node API

### API

- Runs on port `4000`
- Validates Supabase bearer tokens
- Resolves user role/status from `public.profiles`
- Uses Drizzle with a direct Postgres connection for `items` and `categories`

### Cloudflare

- Runs as an optional edge gateway in front of the existing API
- Proxies `/api/*` to `API_ORIGIN`
- Adds deployable staging and production Worker environments through Wrangler
- Serves as the reusable Cloudflare extension point for future cloned projects
- Uses the Supabase service role key for admin-only user management against Supabase Auth
- Is the right place for future service-role-backed operations

### Worker

- BullMQ-based background worker scaffold
- Includes example queues, processors, and job handlers
- Requires Redis to run locally
- Is a future fit for optional media processing or background CMS workflows

## Shared Packages

- `@imsys/auth`: roles, permissions, JWT/password helpers, React bindings
- `@imsys/db`: schema, DB client, seed entrypoint
- `@imsys/api-client`: API resource helpers
- `@imsys/client`: shared client-side resource/query helpers
- `@imsys/types`: shared domain and API contracts
- `@imsys/ui`: reusable UI components
- `@imsys/utils`: helpers, constants, errors, logger, dates

## Testing

Run the workspace test suite:

```bash
pnpm test
```

The API package contains explicit tests around auth and permission behavior, and some shared packages include targeted tests.

## Security Checklist

See also [`SECURITY.md`](SECURITY.md).

Before sharing, deploying, or cloning this starter into a new client project:

1. Scan the repo for personal paths, emails, tokens, and project-specific secrets.
2. Remove any absolute machine paths like `/Users/...` and replace them with repo-relative links.
3. Confirm `.env` and `apps/mobile/.env` point at the intended Supabase project only.
4. Verify `CORS_ORIGINS` contains only the approved frontend origins.
5. Ensure Supabase Auth leaked password protection is enabled in the dashboard.
6. Re-check RLS, Storage policies, and `public.profiles` after any schema change.

## Troubleshooting

`DATABASE_URL is required`

- The root `.env` file is missing or incomplete.

`SUPABASE_URL is required`

- Backend auth configuration is missing.

`VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is required

- Web env configuration is missing.

Mobile sign-in fails because Supabase env is missing

- Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `apps/mobile/.env`.

Mobile resource CRUD fails after sign-in

- Re-apply [`supabase/schema.sql`](supabase/schema.sql) or verify that `items`, `categories`, `assets`, and the `cms-assets` storage policies still match it.

`401` responses from protected API routes

- The user is not signed in.
- The bearer token is missing.
- `SUPABASE_URL` does not match the project that issued the token.

Worker fails to start

- Redis is not available.
- The worker Redis connection settings still need to match your local environment.
