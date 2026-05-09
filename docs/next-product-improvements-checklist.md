# Next Product Improvements Checklist

Scope: follow-up product/data work after the current backend foundation

## 1. Item Status Fields

- [ ] Decide the status vocabulary
      Suggested:
      draft
      active
      archived
      optional: pending_review
- [ ] Add a status field to `items`
- [ ] Add defaults and validation for item status
- [ ] Update item create/edit flows in web and mobile
- [ ] Update public-facing API views/queries to exclude archived or draft items by default
- [ ] Add list filters or badges for status
- [ ] Verify status changes do not break existing CRUD flows

## 2. Richer Asset Metadata

- [ ] Decide the first metadata fields to support
      Suggested:
      title
      alt text
      caption
      tags
      notes
- [ ] Add a usage/tags field for asset reusability contexts such as `hero`, `thumbnail`, `documentation`, or `brand`
- [ ] Extend asset schema for metadata
- [ ] Update asset upload/edit forms
- [ ] Show metadata in asset list/detail views
- [ ] Add any needed filters or derived display rules
- [ ] Verify metadata persists across web and mobile flows

## 3. More Relations

- [ ] Decide the next relationship to add after `items.category_id`
- [ ] Decide the deletion policy for the relation
      Suggested:
      unlink on delete
      cascade only where the data model truly requires it
- [ ] Define ownership and delete behavior for the new relation
- [ ] Extend schema and validation for the relationship
- [ ] Update read paths to include the join cleanly
- [ ] Update admin UI so the relation is visible and editable
- [ ] Verify the relation does not complicate existing CRUD flows

## 4. Better Admin UX Polish

- [ ] Improve empty/loading/error states across admin pages
- [ ] Replace generic empty states with action-oriented CTAs such as `Create your first item`
- [ ] Prefer skeleton loading states where they improve perceived quality
- [ ] Tighten labels and copy for admin actions
- [ ] Make navigation between resources more obvious
- [ ] Polish audit and diagnostics surfaces
- [ ] Review spacing, hierarchy, and consistency across the shell
- [ ] Verify the admin experience still works well on desktop and mobile widths

## Suggested Order

- [ ] Item status fields first
- [ ] Richer asset metadata second
- [ ] More relations third
- [ ] Better admin UX polish fourth
