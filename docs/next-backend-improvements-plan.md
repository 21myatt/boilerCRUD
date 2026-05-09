# Next Backend Improvements Plan

Status: draft  
Scope: next backend-focused upgrades after the `profiles` hardening work

## Goal

Make the boilerplate easier to bootstrap on new Supabase projects, safer to operate, and easier to support in real client environments.

## Priority Areas

### 1. MCP / Bootstrap Script

Objective:
Reduce manual setup when pointing the boilerplate at a new Supabase project.

Desired outcome:

- one documented bootstrap flow
- fewer manual SQL and dashboard steps
- repeatable project verification

Expected scope:

- helper script or task runner for setup steps
- MCP-oriented verification path
- project readiness checklist output

### 2. Migration Workflow

Objective:
Move from “apply one big schema file” toward a clearer migration-based workflow.

Desired outcome:

- versioned schema changes
- easier upgrades across environments
- less ambiguity about drift

Expected scope:

- define source of truth between `schema.sql` and migrations
- introduce a repeatable migration generation/apply flow
- document local and remote upgrade steps
- add a lint/check step that catches drift from manual Dashboard-only changes

### 3. Audit Log

Objective:
Record sensitive admin actions for accountability and debugging.

Desired outcome:

- user create/update/suspend events are traceable
- role changes are visible
- password/invite actions leave an operational record

Expected scope:

- audit table
- write path from admin/API actions
- basic read/query support for troubleshooting
- a policy for whether sensitive payload fields should be redacted, obfuscated, or encrypted for compliance-sensitive environments

### 4. Invite / Reset Password Cleanup

Objective:
Make user lifecycle flows cleaner and closer to real production workflows.

Desired outcome:

- avoid ad hoc temporary-password behavior as the only path
- support invite/recovery-style flows clearly
- reduce confusion in admin UI

Expected scope:

- use a mixed model:
  - local/dev testing can keep `Temporary password`
  - production should use Supabase `auth.admin.inviteUserByEmail()`
- tighten API semantics
- simplify admin UX around password actions

### 5. Health / Admin Diagnostics

Objective:
Give operators a fast way to see whether core backend dependencies are healthy.

Desired outcome:

- quick visibility into API, DB, Auth, Storage, and profile-sync status
- easier debugging for new-project bootstrap issues

Expected scope:

- health endpoint expansion
- admin diagnostics page or API route
- clear pass/fail checks for critical integrations
- add a post-migration check that compares the live DB schema version with the version expected by the codebase

## Suggested Order

1. MCP / bootstrap script
2. migration workflow
3. health / admin diagnostics
4. invite / reset password cleanup
5. audit log

## Reasoning

- bootstrap and migrations improve every future project immediately
- diagnostics reduce support/debug time during setup
- password flow cleanup improves admin usability
- audit log is important, but easier to add once lifecycle flows are stable

## Risks

- adding migrations without a clear source-of-truth rule can create drift
- diagnostics can become noisy if they expose low-value checks
- audit logging can become incomplete if only some write paths are instrumented
- password flow changes can confuse admins if old and new flows overlap

## Definition Of Done

This next phase is in good shape when:

- a new Supabase project can be bootstrapped faster and more consistently
- schema changes are versioned and upgradeable
- sensitive admin actions are traceable
- password/invite flows are clear and intentional
- operators can quickly verify backend health and setup status
