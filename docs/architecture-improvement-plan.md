# Architecture Improvement Plan

This plan focuses on tightening the current architecture so the web API, mobile RLS, and Supabase schema stay aligned as the product grows.

## Goals

- Keep `packages/db/schema` as the shared source of truth for table shape and relationships.
- Reduce drift between Node API rules and Supabase RLS/constraints.
- Make `public.profiles` the shared authorization record for both API and RLS.
- Keep asset storage private and add a clear async processing path for media work.
- Make the architecture easier to reuse across different Supabase projects.

## Current Gaps

- Validation and access rules are still split between Postgres RLS/constraints and Node service logic.
- Most RLS policies are ownership-based, not role-aware.
- The API reads `public.profiles`, but mobile authorization is still mostly direct Supabase/RLS behavior.
- Asset processing is not yet asynchronous; the worker is scaffolded only.
- Schema bootstrap exists, but there is still no full migration workflow.

## Phase 1: Shared Schema and Rule Alignment

Goal: make schema definitions the shared contract for both API and mobile.

Work:

- Ensure every table and relation used by the app is defined in `packages/db/schema`.
- Keep API-side business rules aligned with those schema definitions.
- Add or refine shared TypeScript contracts for any fields that are consumed by both clients.
- Document which rules live in Postgres, which live in API services, and which are shared.

Outcome:

- One place to inspect the shape of the data model.
- Lower risk of API/mobile divergence.

## Phase 2: Profile-Driven Authorization

Goal: make `public.profiles` the common source of truth for role and disabled state.

Work:

- Keep API auth resolution on a live DB lookup.
- Update RLS policies where needed to consult `public.profiles` for role-based access.
- Ensure API and RLS read the same profile columns and meaning.
- Keep bootstrap exceptions environment-gated and out of production behavior.
- Use stable Postgres functions or equivalent patterns for profile-based RLS checks so large list views do not pay a per-row join cost.

Outcome:

- Authorization behaves consistently across the Node API and direct Supabase access.
- Role logic is no longer split across JWT metadata and database state.

## Phase 3: Asset Processing Pipeline

Goal: keep uploads fast while enabling thumbnailing and optimization later.

Work:

- Keep `cms-assets` private and continue using signed URLs.
- Add a worker-backed job path for uploaded assets.
- Define the job contract for thumbnail generation or optimization.
- Make asset metadata capture enough information for later processing and lookup.
- Ensure signed URL consumers refresh URLs or use a TTL that matches real screen/session behavior.

Outcome:

- Web and mobile upload flows stay responsive.
- Heavy media work moves off the request path.

## Phase 4: Migration Workflow

Goal: move from schema-only bootstrap to a real migration process.

Work:

- Define the migration source of truth.
- Add a repeatable create/apply/verify workflow.
- Add drift checks that catch Dashboard-only edits.
- Make new-project bootstrap use the same migration engine as upgrades.
- Avoid maintaining a separate hand-edited bootstrap SQL path once migrations are authoritative.

Outcome:

- Safer schema evolution.
- Better support for multiple Supabase projects over time.

## Phase 5: Operational Hardening

Goal: make the starter easier to support in production.

Work:

- Add audit visibility for sensitive actions.
- Move state-change audit logging for core resources into Postgres triggers where appropriate.
- Keep API-side audit logs for intent/actions that originate in the Node layer, such as invites and admin operations.
- Improve diagnostics and schema checks.
- Expand admin support tools for user and content management.
- Document project switching and bootstrap steps clearly.

Outcome:

- Faster debugging.
- Easier reuse in new client projects.
