# Cloudflare MCP + Pages Checklist

Use this checklist when enabling Cloudflare on a new project clone of this boilerplate.

Status legend:

- `[x]` done in repo
- `[ ]` still needs implementation or per-project setup

## Phase 1: MCP Baseline

- [x] Keep Cloudflare MCP servers in [`.mcp.json`](../.mcp.json).
- [x] Use `cloudflare-api` and `cloudflare-docs` as the standard server names.
- [ ] Verify first-use OAuth from the actual MCP client used by the project team.
- [ ] Record the MCP verification screenshots or notes for the target project if client handoff requires them.
- [x] Keep a repo-local Cloudflare MCP plan in [`docs/cloudflare-mcp-pages-plan.md`](./cloudflare-mcp-pages-plan.md).
- [x] Keep a repo-local Cloudflare MCP runbook in [`docs/cloudflare-mcp-runbook.md`](./cloudflare-mcp-runbook.md).
- [x] Keep a repo-local setup guide for the manual-vs-MCP split in [`docs/cloudflare-pages-setup.md`](./cloudflare-pages-setup.md).

## Phase 2: Worker Baseline

- [x] Keep the optional Worker scaffold in [`apps/cloudflare`](../apps/cloudflare).
- [x] Keep `wrangler.jsonc` with separate staging and production environments.
- [x] Keep the root scripts for `pnpm cf:dev`, `pnpm cf:deploy:staging`, `pnpm cf:deploy`, and `pnpm cf:typegen`.
- [ ] Rename Worker project names in [`apps/cloudflare/wrangler.jsonc`](../apps/cloudflare/wrangler.jsonc) for the real client project.
- [ ] Copy `apps/cloudflare/.dev.vars.example` to `apps/cloudflare/.dev.vars` before local Worker development.
- [ ] Set `API_ORIGIN` and `CORS_ORIGINS` per target project.
- [ ] Run `npx wrangler login` for the deploying operator account.

## Phase 3: Pages Deployment Contract

- [ ] Create the Cloudflare Pages project for `apps/web`.
- [ ] Confirm Pages is used for frontend hosting only.
- [ ] Keep the Node API as a separate runtime unless a later migration is explicitly approved.
- [ ] Keep Supabase as the owner of Auth, Postgres, and Storage.
- [ ] Record the real Pages project name and domain in project handoff docs.

## Phase 4: SPA Routing and Build

- [x] Add SPA fallback handling for the active Cloudflare hosting path.
- [x] Keep the Worker-assets fallback in `apps/web/wrangler.jsonc` via `assets.not_found_handling = "single-page-application"`.
- [x] Confirm the Pages build command used by this monorepo: `pnpm cf:pages:build`.
- [x] Confirm the Pages output directory is `apps/web/dist`.
- [ ] Verify refresh/deep-link behavior for `/items`, `/categories`, `/assets`, `/users`, `/diagnostics`, and `/audit-logs`.

## Phase 5: Environment Mapping

- [ ] Set `VITE_API_URL` in Pages.
- [ ] Set `VITE_SUPABASE_URL` in Pages.
- [ ] Set `VITE_SUPABASE_ANON_KEY` in Pages.
- [ ] Keep secret or non-browser values out of Pages build variables.
- [ ] Set preview/staging values separately from production values.
- [ ] Keep API `CORS_ORIGINS` aligned with preview and production frontend domains.
- [ ] Re-check Supabase auth redirect and origin settings if the deployed frontend URL changes.

## Phase 6: MCP Verification

- [ ] Use MCP to verify the Pages project exists and is bound to the intended branch/environment flow.
- [ ] Use MCP to verify the active deployment status after each environment rollout.
- [ ] Use MCP to verify custom domains and DNS state when domains are part of launch.
- [ ] Use MCP to cross-check deployed URLs against API CORS config.
- [ ] Use MCP to verify no stale project names, domains, or environments remain after a clone is retargeted.

## Phase 7: Functional Verification

- [ ] Verify sign-in works on the deployed frontend.
- [ ] Verify `items` CRUD works.
- [ ] Verify `categories` CRUD works.
- [ ] Verify asset upload, list, signed URL retrieval, and delete flows work.
- [ ] Verify admin user listing and management flows work.
- [ ] Verify diagnostics and audit-log screens load successfully.

## Phase 8: Production Readiness

- [ ] Confirm staging is validated before production rollout.
- [ ] Confirm preview and production branch mapping is documented.
- [ ] Confirm production domain resolution matches the intended Pages deployment.
- [ ] Confirm no local/dev domains remain in CORS or auth settings.
- [ ] Record Cloudflare-specific caveats in `docs/` for the target project.
