# Current Architecture

This repository is a Supabase-first monorepo starter for web, mobile, API, and worker runtimes. The current codebase is reusable across different Supabase projects, but each target project still needs env wiring and schema bootstrap.

## Topology

```txt
Supabase
  - Auth
  - Postgres
  - Storage

apps/web (React + Vite)
  -> Supabase Auth directly
  -> API for items, categories, users, diagnostics, audit logs
  -> Supabase Storage/direct metadata calls for assets

apps/mobile (Expo + React Native)
  -> Supabase Auth directly
  -> Supabase Postgres directly for items, categories, assets
  -> RLS is the access boundary

apps/api (Node + TypeScript)
  -> validates Supabase bearer tokens
  -> resolves auth against public.profiles on every request
  -> uses direct Postgres for business data and admin operations

apps/cloudflare (Cloudflare Worker)
  -> optional edge gateway/runtime
  -> can proxy requests to the API
  -> not required for the default Supabase-first local flow

apps/worker (BullMQ)
  -> scaffolded background job runtime
```

## App Responsibilities

### Web

- Handles sign-in and session state with Supabase Auth.
- Uses the API for `items`, `categories`, user admin, diagnostics, and audit log views.
- Uses Supabase directly for asset upload, delete, and signed URL flows.
- Acts as the admin-style interface for the project.

### Mobile

- Handles sign-in with Supabase Auth.
- Uses Supabase directly for `items`, `categories`, and `assets`.
- Relies on Supabase RLS and grants rather than the Node API.

### API

- Runs on port `4000`.
- Verifies Supabase JWTs and performs a live database lookup on each request.
- Treats `public.profiles` as the source of truth for role and disabled state.
- Uses direct Postgres access for `items`, `categories`, `profiles`, `audit_logs`, and schema state.
- Uses Supabase admin auth endpoints for invite/reset/user-management flows.

### Cloudflare Worker

- Optional Cloudflare Worker runtime exists in `apps/cloudflare`.
- Intended for edge routing, proxying, or future Cloudflare-specific extensions.
- Not the default deployment path for the API today.

### Background Worker

- Present as a background-processing scaffold.
- Not part of the primary request path yet.

## Shared Packages

- `packages/auth`: roles, permissions, token helpers, and React bindings.
- `packages/db`: Drizzle client and schema definitions.
- `packages/api-client`: typed client helpers for API endpoints.
- `packages/types`: shared domain and API contracts.
- `packages/ui` and `packages/utils`: reusable presentation and utility code.

## Data Model

The main resources are:

- `items`
- `categories`
- `assets`
- `profiles`
- `audit_logs`
- `app_schema_state`

Current shape:

- `items` can reference `categories` through `category_id`.
- `assets` stores metadata in Postgres and files in the private `cms-assets` bucket.
- `profiles` controls role and disabled status.
- `audit_logs` records admin and user-management actions.
- `app_schema_state` stores the expected schema version for drift checks.

## Auth and Authorization

The current auth model is:

1. Supabase Auth issues the user session/JWT.
2. The API validates the token.
3. The API joins the live database state to `public.profiles`.
4. Role and disabled decisions come from `profiles`, not JWT metadata, for normal users.

Bootstrap email exceptions exist, but they are environment-gated and intended only for local/dev use.

## Supabase Bootstrap Model

`supabase/schema.sql` is still the bootstrap source of truth.

It currently includes:

- core tables for `items`, `categories`, `assets`, and `profiles`
- audit logging tables
- schema version state tracking
- RLS and grants
- storage bucket setup for `cms-assets`
- sync triggers between `auth.users` and `public.profiles`
- disabled-state propagation from `profiles` back to `auth.users` for the supported write path

The repo also includes `pnpm bootstrap:supabase` to validate env, check schema version, and optionally apply bootstrap SQL.

## Current Request Flow

- Web sign-in happens in Supabase, then the web app calls the API for admin and relational operations.
- Mobile sign-in happens in Supabase, then the app talks directly to Postgres for resource CRUD.
- The optional Cloudflare Worker can sit in front of the API, but that path is additive rather than required.
- The API serves as the trusted boundary for admin-only actions, diagnostics, audit logs, and user management.
- Diagnostics check live Supabase connectivity, bucket presence, schema state, and admin auth access.
- Audit logs are written from the API when user/admin changes happen.

## Constraints

- This is not yet a full migration-driven database workflow; `supabase/schema.sql` remains the bootstrap contract.
- The live project must still be configured per environment through `.env` and `apps/mobile/.env`.
- Fresh Supabase projects still need schema application and verification.
- Cloudflare Pages hosting for `apps/web` is planned and documented, but not fully wired in repo yet.
- The background BullMQ worker is not yet part of the critical path.
