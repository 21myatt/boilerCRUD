# IMSys Plan

Current milestone: `v1.3.1`

This document tracks roadmap direction for the boilerplate. It should describe intended architecture and next-phase goals without overstating what is already implemented.

## Product Direction

IMSys should stay broadly reusable.

The repo should work first as:

- a Supabase-first CRUD starter
- a web/mobile/admin foundation
- a light CMS-style foundation with auth, roles, media, and user management

It should not assume that every project needs nested content immediately.

Nested content should remain an optional later evolution path, not the default next step.

## Current Baseline

The current repo is a CRUD-oriented starter with:

- `items`, `categories`, and `assets` as separate resources
- web and mobile clients sharing auth concepts and domain types
- Supabase Auth, Postgres, and Storage as the main backend
- an API layer used by web for some resource flows
- direct Supabase access from mobile for some resource flows
- shared asset storage across web and mobile

Important current limitations:

- the schema is still mostly flat
- `assets` are uploaded and stored as standalone records
- nested content composition is not implemented

## Immediate Focus

The next phase should focus on making the boilerplate operationally strong with Supabase and MCP, rather than jumping straight into advanced CMS modeling.

That means:

- make the current foundation easier to bootstrap and extend on any Supabase project
- make admin capabilities feel more like a CMS back office
- keep the repo useful for simple CRUD apps as well as future CMS-style apps

## Supabase MCP Track

Supabase MCP should be treated as a core workflow for this repo.

The boilerplate should support a repeatable MCP-driven setup flow for any project:

- inspect the current Supabase project
- apply or reconcile the shared bootstrap schema
- verify RLS and storage policies
- verify bucket setup
- verify grants and ownership defaults
- create or repair local dev users
- run advisor checks to catch drift or policy issues

This matters because the repo is not only code. It is also a deployment and verification pattern for Supabase-backed apps.

## Cloudflare MCP Track

Cloudflare MCP should be treated as the frontend and deployment-side equivalent of the Supabase MCP workflow.

The boilerplate should support a repeatable Cloudflare MCP-driven flow for any project:

- inspect Pages or Workers project state
- inspect build and deploy failures
- verify active deployments and preview behavior
- verify domains, DNS, and environment mapping
- inspect runtime logs and observability data after deploy

This matters because frontend hosting and deployment verification should not depend on ad hoc dashboard work any more than schema verification should depend on ad hoc Supabase dashboard work.

## Near-Term Goals

### 1. Harden The Shared Supabase Foundation

Keep tightening the existing baseline:

- normalize user-owned rows around `auth.uid()`
- keep RLS aligned across web, mobile, and direct database-created rows
- keep storage policies aligned with asset ownership rules
- reduce ambiguity about which resources are API-mediated versus direct Supabase access
- document the standard MCP workflow for bootstrap, repair, and verification

### 2. Add Real User Management In Admin

This is now partially in place and should be hardened rather than re-invented.

The admin should be able to:

- list users
- create users
- assign roles
- disable or suspend users
- reset passwords or trigger invite-style recovery flows

Hard-delete of users should not be the first default because user-owned data and assets can become harder to reason about.

Safer first behavior:

- disable a user
- keep their rows and assets intact
- optionally add explicit cleanup flows later

### 3. Move Role Logic Into Data

The current bootstrap email mapping is still useful for protected local accounts, but it should no longer be the primary role system.

The current version should standardize around a profile-style table such as:

- `public.profiles`
  - `id`
  - `email`
  - `role`
  - `disabled`
  - `created_at`
  - `updated_at`

That allows:

- admin-managed roles
- cleaner authorization rules
- less hardcoded behavior in app code
- reuse across real projects

### 4. Keep CRUD Reuse High

The boilerplate should remain valuable for teams that only need:

- auth
- user roles
- item/category/media CRUD
- web admin
- mobile client
- shared Supabase backend

That is already a strong foundation and should stay easy to adopt without forcing CMS-specific complexity too early.

## Basic CMS Foundation Direction

The repo should still lean toward CMS-style use cases, but through practical building blocks first.

The expected “CMS vibe” should come from:

- authenticated admin shell
- media library
- roles and permissions
- user management
- shared content/data across web and mobile

That is enough to make the starter feel like a basic CMS/admin foundation even before nested content exists.

## Optional Next Layer: Relational CRUD

Before introducing nested content, the boilerplate can still grow through small relational improvements.

Examples already started:

- keep `items.category_id`
- support richer asset metadata
- support simple status fields such as draft/active/archived
- add audit-oriented columns where useful

This keeps the system more realistic without requiring a full schema redesign.

## Optional CMS Evolution Path

Nested content should remain a later opt-in track.

If a project needs richer publishing structures, the roadmap can expand toward:

- `content_types`
- `content_entries`
- `content_fields`
- `entry_blocks`
- `content_relations`
- `asset_usages`

This should be treated as a V2 or specialized extension path, not as the default milestone for every project using this boilerplate.

## Suggested Milestones

### Milestone 1: Supabase Foundation

- keep schema/bootstrap aligned with the live project
- keep assets working from both web and mobile
- document Supabase MCP setup, repair, and verification steps
- keep auth and permission behavior consistent across clients

### Milestone 2: Admin User Management

- harden `profiles` as the role/status source of truth
- keep bootstrap local users protected without relying on them for every role lookup
- keep admin-only user listing and role assignment stable
- support disable/suspend and password reset flows

### Milestone 3: Relational CRUD Upgrade

- build on the first real relationship: `items.category_id`
- improve asset metadata
- keep existing CRUD flows stable while introducing richer reads

### Milestone 4: CMS Expansion

- add nested entries or block-based content only if needed
- add reusable media references
- add publishing states and validation
- optionally add worker-driven media processing

## Guardrails

When extending the boilerplate, avoid these mistakes:

- do not turn the default roadmap into a nested-content-only CMS plan too early
- do not hardcode local demo users forever as the real permission model
- do not manage Supabase drift manually when MCP can verify and repair it
- do not create separate web-only and mobile-only data stores
- do not bypass RLS or storage policy design just to make admin flows work quickly
- do not assume every adopter needs blocks, schemas, and publishing workflows on day one

## Summary

The right near-term direction for this boilerplate is:

- keep it strong as a Supabase-first CRUD starter
- make Supabase MCP part of the standard setup and maintenance workflow
- add real admin user management
- preserve a path toward basic CMS behavior
- keep nested content as an optional later evolution

That gives the repo a broader and more practical role:

- simple CRUD app starter by default
- basic CMS/admin foundation with users, roles, and media
- expandable into richer CMS models only when a project actually needs them
