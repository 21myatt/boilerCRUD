# Architecture Improvement Checklist

## Phase 1: Shared Schema and Rule Alignment

- [ ] Audit all runtime data models against `packages/db/schema`.
- [ ] Remove any duplicated field definitions that can be expressed through shared schema/contracts.
- [ ] Document which validation lives in Postgres, which lives in the API, and which is shared.
- [ ] Verify mobile and web consume the same field names and relationships for shared resources.

## Phase 2: Profile-Driven Authorization

- [ ] Review RLS policies to see where `public.profiles` should be consulted for role-aware access.
- [ ] Ensure API auth resolution still performs a live lookup against `public.profiles` on every request.
- [ ] Confirm API and RLS are reading the same profile columns for `role` and `disabled`.
- [ ] Keep bootstrap email exceptions environment-gated.
- [ ] Verify normal users cannot gain privilege from stale JWT metadata alone.
- [ ] Optimize profile lookups in RLS using a stable Postgres function or equivalent pattern to avoid slow large-list queries.

## Phase 3: Asset Processing Pipeline

- [ ] Keep `cms-assets` private and continue using signed URLs only.
- [ ] Define the BullMQ job contract for thumbnail generation or optimization.
- [ ] Add a worker entrypoint for asset processing jobs.
- [ ] Decide how asset processing failures are reported back to the UI.
- [ ] Extend asset metadata if needed for processing state or derived variants.
- [ ] Add signed URL refresh or a TTL strategy so mobile and web do not break on expiry during active viewing.

## Phase 4: Migration Workflow

- [ ] Decide whether schema files or migration files are the primary source of truth.
- [ ] Add a create/apply/verify workflow for schema changes.
- [ ] Add a lint or drift check for Dashboard-only changes.
- [ ] Make the new-project bootstrap path run the migration engine from the first migration to latest.
- [ ] Stop relying on a separately edited `supabase/schema.sql` once migrations are authoritative.
- [ ] Document the upgrade path for existing projects.

## Phase 5: Operational Hardening

- [ ] Expand diagnostics so schema and bucket checks remain easy to run.
- [ ] Keep audit logging for user and role management actions.
- [ ] Add DB-trigger audit logging for state changes on core resources where API-only logging would miss direct database writes.
- [ ] Keep API-side audit logging for intent-level actions such as invites and admin operations.
- [ ] Document project switching and bootstrap steps in `docs/`.
- [ ] Add support guidance for fresh Supabase projects and live verification.
