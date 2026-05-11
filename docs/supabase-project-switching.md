# Supabase Project Switching

This boilerplate can be reused across different Supabase projects.

## What Changes Per Project

Update environment values for the target project:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- mobile env values in `apps/mobile/.env`

## MCP Setup

The repo MCP config in [`.mcp.json`](../.mcp.json) points to the shared Supabase MCP server, not to one fixed project.

That means:

- the repo config is reusable
- the actual project depends on the MCP auth/session you connect with
- switching projects is mainly an auth/selection step in MCP, not a repo code change

## Recommended Project Switch Flow

1. Point `.env` and `apps/mobile/.env` at the new Supabase project.
2. Authenticate MCP against the Supabase account/project you want to inspect.
3. Run `pnpm bootstrap:supabase` to validate env, auth/storage access, DB reachability, and schema version.
4. If the project still needs schema bootstrap, run `pnpm db:migrate` or `pnpm bootstrap:supabase -- --apply`.
5. Re-test auth, CRUD, roles, and disabled-user behavior on that project.

## Important Note

This boilerplate is multi-project ready, but each new Supabase project still needs:

- tracked migration rollout
- env configuration
- verification after bootstrap
