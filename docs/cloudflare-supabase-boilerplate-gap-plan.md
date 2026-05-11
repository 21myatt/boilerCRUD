# Cloudflare + Supabase Boilerplate Gap Plan

Last updated: 2026-05-11

## Current State

This repo is now materially closer to a reusable Supabase-first boilerplate, but it still needs deployment verification and a final cleanup pass before it should be called fully one-shot.

What works now:

- the web app can deploy to Cloudflare Workers static assets
- Supabase browser auth is wired into the web app
- the web deploy now has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- the bad production fallback to `http://localhost:4000` was removed
- local development can still use `http://localhost:4000` for the API
- repo-level MCP config already exists in [`.mcp.json`](../.mcp.json)
- the role model already exists in [`packages/auth/roles.ts`](../packages/auth/roles.ts)
- the Supabase schema and RLS bootstrap already exist in [`supabase/schema.sql`](../supabase/schema.sql)

What has now changed:

- `apps/web/src/worker.ts` serves the frontend and handles same-origin `/api`
- the shared API client now supports relative bases such as `/api`
- `items`, `categories`, `users`, `diagnostics`, and `audit logs` all have Worker route coverage
- `apps/web/.dev.vars.example` now documents the Worker runtime secret inventory
- `supabase/migrations/20260511044243_baseline_schema.sql` now tracks the baseline schema in source control
- `packages/db` now exposes a real `db:migrate` path through the Supabase CLI
- `apps/web/wrangler.jsonc` now declares environment-specific deploy targets and a required Worker secret

## One-Shot Reality

This repo is not fully one-shot yet.

A new developer still needs to do work in multiple places:

- create a Supabase project
- apply the database schema
- configure Supabase keys and URLs
- configure Cloudflare build env vars
- populate Cloudflare Worker runtime vars and secrets
- validate a real deployed Worker end to end

That means the current setup is reusable and much clearer than before, but still not fully self-validating.

## Main Gap

The remaining gap is no longer route shape. It is rollout confidence and documented operator flow.

The architecture previously assumed a separate backend runtime for:

- `items`
- `categories`
- `users`
- `diagnostics`
- `audit logs`

That is no longer true for the default web deployment path. The remaining question is whether the deployed Worker path has been fully verified and documented enough for other developers to operate it without reverse-engineering the repo.

## Why This Matters

If this repo is meant to be reused by other developers as a Supabase + Cloudflare boilerplate, they should not need to ask:

- where is the backend hosted?
- what is the public API URL?
- why does the frontend still depend on localhost behavior?

The deploy shape needs to be self-explanatory and self-contained.

## Recommended Direction

Preferred direction:

- make Cloudflare the deployed server boundary for the web app
- keep Supabase as the source of truth for auth, storage, and database
- remove the requirement for a separately deployed `apps/api` in normal boilerplate usage

That can be done by moving the necessary server-side behavior behind Cloudflare Worker routes backed by Supabase.

## MCP Compatibility

This repo is intended to work well with both Supabase MCP and Cloudflare MCP.

Expected MCP roles:

- Supabase MCP:
  - inspect schema state
  - apply or verify schema and RLS expectations
  - inspect auth/storage configuration
  - support future entity expansion in a boilerplate clone
- Cloudflare MCP:
  - inspect build triggers and deploy state
  - inspect runtime bindings and Worker settings
  - verify frontend deployment behavior
  - support Worker route rollout and debugging

Target outcome:

- another developer should be able to clone the repo, authenticate MCP, and operate the boilerplate with MCP-assisted setup and verification rather than dashboard-only knowledge

Example MCP-assisted operations:

- use Supabase MCP to verify RLS is enabled on exposed tables before first deploy
- use Supabase MCP to inspect whether `public.profiles` and storage policies match boilerplate expectations
- use Cloudflare MCP to confirm build env vars and Worker secret bindings are present before enabling Worker routes
- use Cloudflare MCP to inspect build failures, active bindings, and deployed versions during rollout

## Immediate Gaps Checklist

- [x] Remove production fallback to `http://localhost:4000`
- [x] Make deployed web builds require `VITE_API_URL` outside local development
- [x] Set `VITE_SUPABASE_URL` in Cloudflare build env
- [x] Set `VITE_SUPABASE_ANON_KEY` in Cloudflare build env
- [x] Automate Supabase schema rollout through tracked migration workflow, not only manual SQL application
- [x] Document Cloudflare secret and variable setup
- [x] Define the deployed server boundary for API-backed web features
- [x] Decide whether `apps/api` will be deployed publicly or replaced for web usage
- [x] Decide the final disposition of `apps/api` before route migration proceeds further
- [x] Stop requiring developers to discover or invent a production API URL manually
- [x] Keep MCP setup and operational flow visible in the actual rollout plan
- [x] Document local development parity for the Cloudflare-first path
- [x] Document the CORS strategy for web and possible mobile callers

## Implementation Plan

### Phase 0: Schema and Secret Automation

Before calling this boilerplate one-shot, reduce dashboard-only setup.

Needed work:

- establish a tracked Supabase migration workflow for the current schema, not only a standalone bootstrap SQL file
- document the secret inventory for both Cloudflare and Supabase-backed server flows
- keep Worker secret names and env var names explicit in source control
- make it obvious which values belong in build env, Worker runtime env, and local `.env`

Canonical tooling decision:

- use Supabase CLI migrations in `supabase/migrations/` as the canonical schema rollout path
- use Wrangler as the canonical Cloudflare Worker dev and deploy tool
- use MCP for inspection, verification, and assisted operations around both systems

Developer prerequisites:

- Supabase CLI available globally or through `npx supabase`, and authenticated as needed for schema work
- Wrangler installed and authenticated for local Worker dev and deployment
- MCP-capable client authenticated against Supabase MCP and Cloudflare MCP if using the assisted workflow

Minimum automation target:

- Supabase schema can be applied through a repeatable migration workflow
- Cloudflare runtime and build variables are documented in one place

### Phase 1: Decide the production backend shape

Choose one path explicitly:

- Path A: deploy `apps/api` publicly and keep `VITE_API_URL`
- Path B: move web-facing backend routes to Cloudflare Worker and use same-origin `/api`

Recommendation:

- choose Path B for this boilerplate

Reason:

- it gives other developers one Cloudflare-hosted frontend/server boundary
- it avoids requiring a separate Node hosting platform just to use the boilerplate

At the same time, decide the disposition of `apps/api`:

- `legacy`
- `local-dev-only`
- `optional alternate backend`
- `still first-class`

Recommendation:

- treat `apps/api` as `local-dev-only` or `optional alternate backend` once the Cloudflare path is complete

This decision should happen here, not later, so developers do not see two competing backend stories during migration.

### Phase 2: Make web API access same-origin friendly

- centralize web API base URL logic
- support `/api` as a valid base path
- ensure the shared API client handles prefixed routes correctly
- ensure the API client supports relative paths like `/api` instead of requiring absolute URLs

### Phase 3: Add Cloudflare Worker API routes

Recommended split:

- CRUD resource flows that already fit Supabase RLS well should move toward direct frontend-to-Supabase access where possible
- admin and sensitive flows should go through a secure Cloudflare Worker boundary

Suggested breakdown:

- direct frontend + Supabase target flows:
  - `items`
  - `categories`
- secure Worker proxy candidate flows:
  - `users`
  - `diagnostics`
  - `audit logs`

Interim migration position:

- during migration, `items` and `categories` may remain behind the Worker for compatibility
- post-migration target, `items` and `categories` should use direct frontend-to-Supabase access backed by RLS

That keeps the inherited state and the desired end state explicit for developers cloning the repo.

Implement Worker-side routes for the web app paths currently handled by `apps/api` where a Worker boundary is still needed:

- `/api/users`
- `/api/admin/diagnostics`
- `/api/admin/audit-logs`

Worker responsibilities:

- validate Supabase access tokens
- enforce role/permission checks
- call Supabase/Postgres/admin APIs as needed
- return the same response shape the current web app expects

Server-side Supabase pattern:

- keep `SUPABASE_URL` as a Worker env var
- store `SUPABASE_SERVICE_ROLE_KEY` as a Worker secret binding
- use Supabase-compatible server-side calls from the Worker context for admin or privileged behavior
- prefer direct Supabase REST/PostgREST or server-side Supabase client usage from the Worker rather than inventing a second auth system

Auth pattern:

- verify bearer access tokens against Supabase JWKS, matching the current approach in [`packages/auth/middleware.ts`](../packages/auth/middleware.ts)
- resolve role and disabled state from `public.profiles`, matching the current profile-driven role model in [`supabase/schema.sql`](../supabase/schema.sql) and [`packages/auth/roles.ts`](../packages/auth/roles.ts)
- enforce permissions through the existing role/permission model rather than per-route ad hoc checks

Role/permission model note:

- the repo already uses `admin`, `editor`, `reviewer`, and `viewer`
- profile role and disabled state live in `public.profiles`
- the current permission checks already exist in [`apps/api/src/middleware/role-permission-check.ts`](../apps/api/src/middleware/role-permission-check.ts)
- the Worker migration should preserve that model unless an explicit auth redesign is approved

### Phase 4: Reduce Node API dependency

- keep `apps/api` only if it is still needed for local-only tooling or non-Cloudflare deployment modes
- document whether `apps/api` is optional, legacy, or still first-class
- avoid making the default boilerplate path depend on a separate Node host

### Phase 5: Finalize deploy defaults

- set Cloudflare build env for `VITE_API_URL=/api` if same-origin Worker routing is adopted
- configure Worker runtime bindings and vars needed for server-side Supabase access
- verify that the deployed frontend works without any localhost references

Local development parity:

- local developers should be able to run the same `/api` contract through Wrangler in dev mode
- if local Node API support remains during migration, document that it is a temporary compatibility path
- preferred end state is:
  - local frontend talks to local Worker
  - local Worker talks to Supabase and any needed local services
  - production frontend talks to deployed Worker

CORS note:

- if the Worker becomes the web server boundary, web CORS complexity should reduce for same-origin browser calls
- if mobile or other external clients call the Worker directly, document the Worker CORS policy explicitly
- align this with the existing `CORS_ORIGINS` story so developers do not have to reverse-engineer caller rules

## Verification Checklist

- [x] Web login works on deployed Cloudflare URL
- [x] Items list works on deployed Cloudflare URL
- [x] Categories CRUD works on deployed Cloudflare URL
- [ ] Users admin screen works on deployed Cloudflare URL
- [ ] Diagnostics screen works on deployed Cloudflare URL
- [ ] Audit log screen works on deployed Cloudflare URL
- [x] No frontend network request points to `localhost`
- [x] No required production env var is undocumented
- [x] Another developer can clone the repo and follow one documented setup path
- [x] Another developer can use MCP to inspect and validate the setup state
- [x] Verification can be used both as an onboarding smoke test and as a contributor release checklist

## Live Verification Progress

Verified on 2026-05-11 against:

- `https://boilercrud-imsys.amh-myat.workers.dev`
- Worker version `a80f811b-9d90-4514-b25a-2eea38459d64`

Verified live:

- root HTML returns `200`
- deployed HTML references `index-lI9BI_KA.js`, which is the fixed bundle
- `/health` returns `ok: true`
- `/api/users` returns `401 Missing bearer token` without auth, which confirms the live Worker route boundary is active
- the old startup crash string `VITE_API_URL is required outside local development` is no longer present in the deployed bundle
- the web app production API base now defaults to same-origin `/api`
- authenticated live API verification passed using a temporary admin user
- authenticated `/api/users`, `/api/admin/diagnostics`, and `/api/admin/audit-logs` all returned successful responses
- authenticated category create, update, list, and delete passed on the live Worker
- authenticated item create, update, list, and delete passed on the live Worker
- browser verification on `/items` showed same-origin requests to `https://boilercrud-imsys.amh-myat.workers.dev/api/items`
- browser verification on `/items` showed authenticated `GET /api/items` = `200` and authenticated `POST /api/items` = `201`
- browser verification confirmed login success on local web and production web for all tested users
- browser verification confirmed CRUD success on local web and production web for `assets`, `categories`, and `items`
- browser verification confirmed frontend network traffic targets Supabase URLs and the Cloudflare Worker URL rather than `localhost`

Important note:

- the deployed bundle still contains `http://localhost` strings from third-party library internals, but not from the app's API base logic
- explicit browser-level verification for `users`, `diagnostics`, and `audit logs` is still required before calling the rollout complete
- the remaining open items require a real browser session and are not fully automatable from the current terminal-only workspace

## Current Safe Interpretation

Today this repo should be described as:

- a Supabase-first monorepo with a Cloudflare-first web deployment path
- a repo where the default public server boundary is `apps/web`
- a repo where `apps/api` is local compatibility infrastructure, not the default production story
- a boilerplate that still needs final browser-level admin-screen verification before being called fully one-shot

## Next Recommended Task

Next concrete implementation task:

- complete browser-level verification for deployed `users`, `diagnostics`, and `audit log` screens
That is now the remaining release gate.
