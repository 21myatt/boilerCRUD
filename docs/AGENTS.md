# AI Agent Instructions

These instructions apply to any AI agent working in this repository, especially when updating root documentation such as [`README.md`](/boilerCRUD/README.md) and [`SECURITY.md`](/boilerCRUD/SECURITY.md).

## Scope

- Keep the root `README.md` aligned with the code that actually exists in this monorepo.
- Prefer describing current behavior over planned architecture.
- If a capability is only partially wired, say that explicitly instead of implying it is complete.
- Treat the repo as a reusable starter that can be pointed at different Supabase projects and accounts through environment configuration.
- Treat this file as repository guidance for future agents, not as implementation notes for a specific assistant or model.

## Source of Truth

When editing the root README, verify claims against:

- root [`package.json`](/boilerCRUD/package.json)
- app package manifests under [`apps/`](/boilerCRUD/apps)
- shared packages under [`packages/`](/boilerCRUD/packages)
- env templates in [`.env.example`](/boilerCRUD/.env.example) and [`apps/mobile/.env.example`](/boilerCRUD/apps/mobile/.env.example)
- Supabase bootstrap SQL in [`supabase/schema.sql`](/boilerCRUD/supabase/schema.sql)
- roadmap context in [`plan.md`](/boilerCRUD/plan.md)

## README Requirements

The root README should stay concise but must cover:

- what the repo is
- current apps and packages
- current resource coverage
- install and local run commands
- required environment files
- Supabase setup expectations
- multi-project / multi-account Supabase configuration through env vars
- important caveats such as incomplete migration/seed wiring

## Writing Rules

- Do not leave placeholder-only descriptions like "monorepo scaffold" if the repo already has concrete product structure.
- Do not claim migrations, seeds, Redis setup, or deployment flows are complete unless the scripts are actually wired and documented.
- Call out direct Supabase access versus API-mediated access where that distinction matters.
- Keep examples and commands copied from real package scripts.
- Prefer absolute statements only when confirmed by code.
- Never add or preserve personal filesystem paths, personal emails, tokens, or other user-specific identifiers in root docs; if they appear, remove or redact them before finishing the edit.
- When updating docs, include a quick check for absolute machine paths such as `/Users/...` and replace them with repository-relative links.

## When the Repo Changes

Update the root README if any of these change:

- workspace app/package names
- root scripts
- env variables
- resource names
- auth/data flow between web, mobile, API, and Supabase
- database bootstrap expectations
- roadmap framing for future backend portability work, including a Cloudflare-ready track
- security checklist guidance when docs mention auth, Supabase, or environment configuration

If the change is architectural but not yet fully implemented, document it in `plan.md` or another scoped design doc instead of overstating it in the root README.
