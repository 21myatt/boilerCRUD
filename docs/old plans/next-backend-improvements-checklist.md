# Next Backend Improvements Checklist

Scope: follow-up backend work after `profiles` hardening

## 1. MCP / Bootstrap Script

- [x] Decide the canonical bootstrap command or script entrypoint
- [x] Define what the bootstrap flow must do
      Minimum:
      env validation
      schema apply or verification
      profile/auth checks
      storage bucket checks
- [x] Choose whether bootstrap is MCP-first, script-first, or hybrid
- [x] Add the bootstrap script or task runner
- [x] Document the bootstrap flow for a brand-new Supabase project
- [ ] Verify the flow on a fresh or alternate project

## 2. Migration Workflow

- [ ] Decide the schema source of truth
      Options:
      keep `supabase/schema.sql` as bootstrap-only and add migrations for deltas
      or move fully to migration-first
- [ ] Define how local schema changes are created
- [ ] Define how remote/project upgrades are applied
- [ ] Add migration docs and command examples
- [x] Add a migration lint/check step to catch manual Dashboard-only changes
- [ ] Ensure drift verification is part of the workflow
- [ ] Test one real schema change using the chosen workflow

## 3. Audit Log

- [x] Define the audit table shape
      Suggested fields:
      actor_user_id
      target_user_id
      action
      resource
      payload summary
      created_at
- [x] Add schema support for audit logging
- [x] Log user create actions
- [x] Log role changes
- [x] Log disable/reactivate actions
- [x] Log password/invite actions
- [x] Decide whether emails/names in audit payloads should be plain, obfuscated, redacted, or encrypted
- [x] Add a way to inspect audit rows for support/debugging

## 4. Invite / Reset Password Cleanup

- [x] Keep `Temporary password` for local/dev testing only
- [x] Use Supabase `auth.admin.inviteUserByEmail()` for production invite flow
- [x] Update API semantics for environment-based invite/reset actions
- [x] Update admin UI text and actions to match the chosen flow
- [x] Remove or reduce ambiguous password-management paths
- [ ] Verify the chosen flow end to end

## 5. Health / Admin Diagnostics

- [x] Define required health checks
      Suggested:
      API up
      DB reachable
      Auth admin reachable
      profile sync assumptions valid
      storage bucket exists
- [x] Expand or add backend health endpoints
- [x] Add an admin diagnostics view or route
- [x] Keep diagnostics safe for admin-only visibility
- [x] Add a post-migration check that verifies live schema version matches the version expected by the code
- [x] Verify diagnostics on a working project
- [x] Verify diagnostics on a misconfigured project where possible
      Notes:
      Covered with unit-level schema-version mismatch diagnostics test. A full live broken-project verification still needs a separate misconfigured environment.

## Suggested Order

- [x] Build MCP / bootstrap script first
- [ ] Add migration workflow second
- [ ] Add diagnostics third
- [ ] Clean up invite/reset flow fourth
- [ ] Add audit log fifth
