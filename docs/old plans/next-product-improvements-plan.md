# Next Product Improvements Plan

Status: draft  
Scope: product/data-layer follow-up work after the current backend foundation

## Goal

Make the starter feel more like a real app without jumping straight to a full CMS rewrite.

The next step should improve:

- asset richness
- content state modeling
- relationships between records
- admin UX clarity and polish

## Priority Areas

### 1. Richer Asset Metadata

Objective:
Make assets more useful than simple file records.

Desired outcome:

- assets can carry structured metadata
- previews and filtering become more useful
- the same asset can support more real-world use cases

Expected scope:

- title, alt text, caption, tags, and notes
- optional credit/source fields
- derived display fields for file type and preview state
- UI support for editing and showing metadata
- treat tags or usage labels as first-class reusability controls, such as `hero`, `thumbnail`, `documentation`, or `brand`

### 2. Item Status Fields

Objective:
Give items a real lifecycle instead of only a name/category relationship.

Desired outcome:

- users can distinguish draft, active, archived, and similar states
- lists and filters become more practical
- admin workflows look more like production content tools

Expected scope:

- status field on `items`
- status defaults and validation
- filters and badges in web/mobile UI
- optional timestamps for publish/archive transitions later
- public-facing reads should default to `status = 'active'` so archived/draft items do not leak into normal views

### 3. More Relations

Objective:
Move beyond one relationship without turning the schema into a full CMS too early.

Desired outcome:

- the app can express more realistic content structures
- joins remain understandable
- the schema stays reusable across projects

Expected scope:

- one-to-many relationships beyond `items.category_id`
- asset-to-item associations where useful
- reusable lookup tables for tags, groups, or ownership scopes
- read paths that still stay simple for CRUD users
- define the deletion policy up front so relations can be unlinked cleanly instead of hardcoding a single `main image` pattern

### 4. Better Admin UX Polish

Objective:
Make the admin shell feel intentional and easier to operate.

Desired outcome:

- clearer navigation and page state
- less friction in user management and diagnostics
- a more cohesive back-office experience

Expected scope:

- improve page-level empty/loading/error states
- make cross-resource navigation more obvious
- tighten copy and labels for admin actions
- polish audit/diagnostics surfaces
- use action-oriented empty states and skeleton loading patterns instead of generic fallback text and spinners

## Suggested Order

1. Item status fields
2. richer asset metadata
3. more relations
4. better admin UX polish

## Reasoning

- status fields are the smallest useful content-model upgrade
- richer asset metadata builds on the existing media flow
- more relations should follow once the first two are stable
- admin UX polish benefits from the other changes being concrete

## Risks

- adding too many fields too early can make the starter feel heavier
- relationships can become confusing if ownership rules are unclear
- UX polish can become cosmetic if it is not anchored to real workflows

## Definition Of Done

This phase is in good shape when:

- assets carry enough metadata to be useful in real projects
- items have a practical lifecycle state
- the schema supports one or two additional real relationships
- the admin interface feels cleaner and more intentional without losing simplicity
