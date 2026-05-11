# Cloudflare MCP + Pages Plan

Current milestone: `v1.3.1`

This document turns the Cloudflare track into an implementation plan that matches the code currently in this repo.

It covers two separate but related concerns:

- Cloudflare MCP as the operational control plane
- Cloudflare Pages as the preferred static-hosting target for `apps/web`

It does not assume the Node API or BullMQ worker will move to Cloudflare immediately.

## Current Baseline

What already exists in the repo:

- repo MCP config includes `cloudflare-api`, `cloudflare-builds`, `cloudflare-observability`, and `cloudflare-docs` in [`.mcp.json`](../.mcp.json)
- an optional Worker scaffold exists in [`apps/cloudflare`](../apps/cloudflare)
- root scripts exist for `pnpm cf:dev`, `pnpm cf:deploy:staging`, `pnpm cf:deploy`, and `pnpm cf:typegen`
- the web app is a Vite SPA in [`apps/web`](../apps/web)
- the current Worker-assets deployment path uses SPA fallback from [`apps/web/wrangler.jsonc`](../apps/web/wrangler.jsonc)
- a root Pages build command exists: `pnpm cf:pages:build`
- the current backend remains a separate Node API in [`apps/api`](../apps/api)

What does not exist yet:

- no committed Pages project resource yet
- no branch-to-environment deployment convention recorded in `docs/`

## Goals

- Make Cloudflare onboarding repeatable for any future boilerplate clone.
- Keep the Cloudflare workflow auditable through MCP rather than dashboard memory.
- Host the web app on Pages without changing the current Supabase-first backend ownership.
- Keep an optional Worker path available for edge routing, CORS, redirects, and future webhooks.
- Support clean staging and production environments.

## Architecture Boundary

The intended Cloudflare boundary for this repo is:

- `apps/web` deploys to Cloudflare Pages
- `apps/cloudflare` remains an optional Worker entrypoint
- `apps/api` remains a separate backend runtime
- Supabase remains the source of truth for Auth, Postgres, and Storage

That split keeps the current architecture stable while still making the boilerplate Cloudflare-ready.

## Phase 1: MCP Baseline

Goal: make Cloudflare access part of the normal repo bootstrap.

Implementation:

- Keep [`.mcp.json`](../.mcp.json) as the repo-local MCP source of truth.
- Standardize on these servers:
  - `cloudflare-api` -> `https://mcp.cloudflare.com/mcp`
  - `cloudflare-builds` -> `https://builds.mcp.cloudflare.com/mcp`
  - `cloudflare-observability` -> `https://observability.mcp.cloudflare.com/mcp`
  - `cloudflare-docs` -> `https://docs.mcp.cloudflare.com/mcp`
- Document the first-use OAuth expectation for local MCP clients.
- Add a Cloudflare MCP runbook under `docs/` that future projects can follow.

Exit criteria:

- A developer can open the repo, connect the Cloudflare MCP servers, and understand the first authorization step without using tribal knowledge.

## Phase 2: Pages Deployment Contract

Goal: define exactly what Pages is responsible for.

Implementation:

- Deploy only `apps/web` to Cloudflare Pages.
- Treat the app as a static SPA built by `vite build`.
- Use `apps/web/dist` as the output directory.
- Keep API traffic pointed at the deployed Node API through `VITE_API_URL`.
- Keep Supabase browser config in Pages environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

Exit criteria:

- Pages owns frontend hosting only, and the repo docs describe that boundary clearly.

## Phase 3: SPA Routing and Build Wiring

Goal: make the current web router behave correctly on Pages.

Implementation:

- Keep SPA fallback aligned with the active hosting path:
  - for the current Worker-assets path, use `apps/web/wrangler.jsonc`
  - if a Pages project is introduced later, add `_redirects` for that target
- Use the root Pages build command for this workspace:
  - `pnpm cf:pages:build`
- Record the expected Pages project settings:
  - root directory: repo root or `apps/web`, depending on chosen Pages setup
  - build command: `pnpm cf:pages:build`
  - output directory: `apps/web/dist`
- Verify refresh behavior on app routes such as:
  - `/items`
  - `/categories`
  - `/assets`
  - `/users`
  - `/diagnostics`
  - `/audit-logs`

Exit criteria:

- Deep links and browser refreshes work on deployed Pages environments.

## Phase 4: Environment Mapping

Goal: make environment ownership explicit across Cloudflare, API, and Supabase.

Implementation:

- Define Pages build-time variables:
  - `VITE_API_URL`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Keep Worker runtime variables in `apps/cloudflare/.dev.vars` for local work and Wrangler-managed variables/secrets for deploys:
  - `API_ORIGIN`
  - `CORS_ORIGINS`
  - `APP_NAME`
  - `APP_ENV`
- Keep backend CORS allowlists aligned with real Pages preview and production origins.
- Record which values must differ between preview, staging, and production.

Exit criteria:

- A new project clone can point the same codebase at different Supabase and backend targets through configuration alone.

## Phase 5: MCP Verification Workflow

Goal: replace “check the dashboard manually” with a repeatable MCP flow.

Implementation:

- Use Cloudflare MCP to inspect:
  - Pages project existence
  - current deployment state
  - branch or environment mapping
  - custom domains
  - DNS records when relevant
- Use `cloudflare-builds` as the default typed server for build failure and deployment-state inspection.
- Use `cloudflare-observability` as the default typed server for runtime debugging after deployment.
- Cross-check deployed frontend URLs against:
  - `CORS_ORIGINS` in the Node API
  - Supabase allowed redirect/origin settings when auth flows depend on them
- Record a standard verification sequence for:
  - first setup
  - post-deploy verification
  - debugging drift

Exit criteria:

- The Cloudflare state for a project can be inspected and verified from MCP with a stable checklist.

## Phase 6: Reusable Rollout Template

Goal: make this boilerplate easy to clone into another client project.

Implementation:

- Keep Cloudflare-specific configuration names easy to rename:
  - Worker names in [`apps/cloudflare/wrangler.jsonc`](../apps/cloudflare/wrangler.jsonc)
  - Pages project name in the setup docs
  - custom domains in the setup docs, not hardcoded in source
- Keep Cloudflare docs in `docs/` project-agnostic.
- Avoid coupling Cloudflare setup to a single Supabase project or a single API hostname.
- Add a project setup order that new clones can follow.

Exit criteria:

- A new project can reuse the same Cloudflare flow with renaming plus env changes only.

## Recommended Delivery Order

1. Keep MCP docs and repo MCP config in place.
2. Keep SPA fallback aligned with the active hosting target.
3. Document exact Pages build settings.
4. Stand up a staging Pages project.
5. Verify staging through MCP.
6. Align CORS and auth redirect settings.
7. Stand up production Pages.
8. Keep the optional Worker path for edge-specific extensions.

## Risks

- Pages env vars are build-time inputs, so dashboard edits require a rebuild/redeploy.
- Preview domains can break backend CORS if they are not added deliberately.
- The optional Worker can create confusion if the docs imply it replaces the API today.
- MCP inspection helps verification, but initial Cloudflare account/project creation may still involve some dashboard or CLI steps depending on client capability.

## Done vs Next

Done already:

- repo-level Cloudflare MCP entries exist
- optional Worker scaffold exists
- root Cloudflare scripts exist
- root Pages build script exists
- SPA fallback exists for the current Worker-assets deployment path
- root and README-level Cloudflare setup notes exist

Next implementation steps:

- convert the checklist into status-driven work
- document branch-to-environment mapping for real Pages projects
