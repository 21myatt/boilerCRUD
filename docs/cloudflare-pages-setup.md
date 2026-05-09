# Cloudflare Pages Setup

This document explains the practical split between:

- what this boilerplate can prepare in-repo
- what Cloudflare MCP may be able to do
- what you may still need to do manually in Cloudflare or with Wrangler

Use this when hosting [`apps/web`](../apps/web) on Cloudflare Pages.

## Short Answer

For this repo, the setup is split into three layers:

1. Repo preparation
2. Cloudflare account/project setup
3. Post-setup verification

Repo preparation is already mostly handled in this codebase.

Cloudflare-side setup may be partly automatable through MCP, but you should not assume 100% of Pages creation, domain setup, or auth setup will work entirely through MCP in every client/tooling environment.

## What Is Already Prepared In The Repo

These pieces are already in place:

- [`.mcp.json`](../.mcp.json) includes `cloudflare-api`, `cloudflare-builds`, `cloudflare-observability`, and `cloudflare-docs`
- [`apps/web/public/_redirects`](../apps/web/public/_redirects) provides SPA fallback for Pages
- root script `pnpm cf:pages:build` builds the web app
- [`docs/cloudflare-mcp-pages-plan.md`](./cloudflare-mcp-pages-plan.md) defines the rollout plan
- [`docs/cloudflare-mcp-runbook.md`](./cloudflare-mcp-runbook.md) defines the operational flow

That means the codebase itself does not need more basic preparation before a Pages project can be created.

## What MCP Is Good For

Once Cloudflare MCP is authenticated in the client actually being used, MCP is a good fit for:

- inspecting Cloudflare project state
- inspecting build failures through `cloudflare-builds`
- checking whether Pages projects already exist
- verifying deployment state
- inspecting post-deploy logs through `cloudflare-observability`
- reviewing domains or DNS configuration when exposed by the MCP tools
- cross-checking deployed frontend URLs against backend CORS and auth settings
- documenting or auditing repeatable Cloudflare setup flows

In practice, MCP is best treated as the control-plane and verification layer first.

## What May Still Need Manual Cloudflare Or Wrangler Steps

Depending on the MCP client and the Cloudflare account setup, these may still require dashboard or Wrangler work:

- first-time Cloudflare OAuth or login approval
- creating the initial Pages project
- connecting the Git repository in Pages
- selecting production branch behavior
- adding custom domains
- domain ownership or DNS confirmation
- final environment variable entry in the Pages UI

Some of those actions may be possible through MCP in some clients, but this repo should not depend on that assumption.

## Recommended Setup Order

Use this order for a new project clone.

### 1. Prepare The Repo

Already done here:

- build command exists: `pnpm cf:pages:build`
- output directory is `apps/web/dist`
- SPA fallback exists

### 2. Authenticate Cloudflare MCP

Do this in the real MCP client:

1. open the repo
2. trigger a Cloudflare MCP action
3. complete the OAuth/browser approval flow
4. confirm `cloudflare` and `cloudflare-docs` are usable

### 3. Create Or Confirm The Pages Project

Attempt via MCP first if the client supports it cleanly.

If not, do this manually in Cloudflare Pages:

- create the Pages project
- connect the repository
- choose the build command: `pnpm cf:pages:build`
- choose the output directory: `apps/web/dist`

### 4. Set Pages Environment Variables

These are required for the web app:

- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Set preview/staging and production values deliberately. These are build-time inputs, so any change requires a rebuild/redeploy.

### 5. Align Backend And Auth Settings

After Pages URLs exist:

- add the real Pages preview/production origins to API `CORS_ORIGINS`
- confirm Supabase redirect/origin settings match the deployed frontend URLs

### 6. Verify Through MCP

After setup, use MCP to verify:

- the Pages project exists
- the deployment completed
- the correct environment or branch is active
- domains and DNS are correct
- the deployed frontend URLs match backend and auth expectations

## Exact Pages Settings For This Repo

Use these values unless the project architecture changes:

- app: `apps/web`
- build command: `pnpm cf:pages:build`
- output directory: `apps/web/dist`
- framework behavior: Vite SPA with `_redirects`

## Manual Vs MCP Split

Treat this as the default split for this boilerplate:

- Repo code/setup:
  - already handled in source control
- MCP:
  - inspect, verify, audit, and sometimes create/update Cloudflare resources
- Manual dashboard or Wrangler:
  - fallback for initial project creation, repo connection, domain setup, or account-specific interactive steps

## Decision Rule

When enabling hosting for a real project:

1. try MCP first for Cloudflare-side actions
2. if the client does not expose the required write action cleanly, use Pages UI or Wrangler for that step
3. return to MCP for verification and documentation

That keeps the process pragmatic without pretending the entire Cloudflare hosting lifecycle is guaranteed to be MCP-only.
