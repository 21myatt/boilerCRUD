# Scripts

Repository automation helpers live here.

## Current Scripts

- `lint-schema-version.mjs`
  Checks that `supabase/schema.sql` contains the expected schema version contract from `packages/utils/constants.ts`.

- `bootstrap-supabase.mjs`
  Validates env files, checks Supabase auth/storage access, verifies database reachability, and confirms the live schema version.
  Use `pnpm bootstrap:supabase -- --apply` to also apply `supabase/schema.sql`.
