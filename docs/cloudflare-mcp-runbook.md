# Cloudflare MCP Runbook

This runbook is the operational companion to [`cloudflare-mcp-pages-plan.md`](./cloudflare-mcp-pages-plan.md).

For the manual-vs-MCP setup split, also see [`cloudflare-pages-setup.md`](./cloudflare-pages-setup.md).

Use it when bringing a new project clone onto Cloudflare.

## Purpose

This repo uses Cloudflare in three distinct ways:

1. MCP for inspection and verification
2. Pages for static hosting of `apps/web`
3. Workers for the optional edge gateway in `apps/cloudflare`

Do not blur these roles together when documenting or operating a project.

## Repo Preconditions

Before doing Cloudflare setup, confirm these repo-level pieces exist:

- [`.mcp.json`](../.mcp.json) contains the Cloudflare MCP server entries
- [`apps/cloudflare`](../apps/cloudflare) exists
- [`apps/web`](../apps/web) builds successfully
- root scripts include `pnpm cf:dev` and deploy commands

## First-Use MCP Flow

1. Open the repo in the MCP-capable client your team actually uses.
2. Confirm the client reads [`.mcp.json`](../.mcp.json).
3. Trigger a Cloudflare MCP call.
4. Complete the Cloudflare OAuth flow on first use.
5. Confirm `cloudflare-api`, `cloudflare-builds`, `cloudflare-observability`, and `cloudflare-docs` are available after auth.

Expected result:

- the repo has live Cloudflare inspection capability without hand-editing client config

## Pages Setup Flow

Use this flow for the frontend only.

1. Build target:
   - app: [`apps/web`](../apps/web)
   - output: `apps/web/dist`
   - framework: Vite SPA
   - build command: `pnpm cf:pages:build`
2. Create or connect the Pages project.
3. Configure the Pages build command as `pnpm cf:pages:build`.
4. Set Pages environment variables:
   - `VITE_API_URL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Ensure SPA fallback is configured for the chosen host:
   - for the current Worker-assets path, keep `assets.not_found_handling = "single-page-application"` in `apps/web/wrangler.jsonc`
   - if you later deploy `apps/web` to Cloudflare Pages instead, add `_redirects` at that time
6. Deploy a preview or staging build first.
7. Verify the deployed routes and auth behavior.

## Worker Setup Flow

Use this flow only if the project needs the optional edge Worker.

1. Copy:

```bash
cp apps/cloudflare/.dev.vars.example apps/cloudflare/.dev.vars
```

2. Set:

```env
API_ORIGIN=http://localhost:4000
CORS_ORIGINS=http://localhost:5173,http://localhost:8081
```

3. Authenticate:

```bash
npx wrangler login
```

4. Run locally:

```bash
pnpm cf:dev
```

5. Deploy staging or production:

```bash
pnpm cf:deploy:staging
pnpm cf:deploy
```

## MCP Verification Flow

After Pages or Worker setup, use MCP to verify:

1. the correct Cloudflare project or Worker exists
2. the active deployment is healthy
3. the intended environment is the one receiving traffic
4. custom domain or DNS records match the target project
5. preview and production URLs align with backend CORS and Supabase auth expectations

Preferred server split:

- `cloudflare-api` for broad account/project inspection
- `cloudflare-builds` for build/deploy failures and deployment status
- `cloudflare-observability` for logs and runtime verification
- `cloudflare-docs` for current Cloudflare reference while operating the project

This verification should happen:

- after first project setup
- after a staging rollout
- after a production rollout
- after any domain or environment rename

## Config Ownership Map

Use this split consistently:

- Pages owns:
  - `VITE_API_URL`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Worker owns:
  - `API_ORIGIN`
  - `CORS_ORIGINS`
  - `APP_NAME`
  - `APP_ENV`
- API owns:
  - backend `CORS_ORIGINS`
  - service-role and database secrets
- Supabase owns:
  - Auth configuration
  - Postgres schema and RLS
  - Storage bucket and policies

## Functional Verification

Verify all of these against the deployed frontend:

- sign-in
- `items`
- `categories`
- `assets`
- user admin
- diagnostics
- audit logs

Do not treat a successful static deploy as “done” until these runtime paths are checked.

## Common Failure Modes

- Preview domain is not added to API CORS.
- Pages env values are changed without a rebuild/redeploy.
- SPA fallback is not configured for the active hosting path, so deep links 404 on refresh.
- Supabase redirect/origin settings still point at old domains.
- Worker project names or domains still contain the previous client/project naming.

## Handoff Notes For New Client Projects

Before handing off a cloned project:

1. rename any generic Worker names in `wrangler.jsonc`
2. record the real Pages project name
3. record the production and staging domains
4. record the backend API origin
5. verify the MCP client can still auth cleanly against the new Cloudflare account
