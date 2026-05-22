# Security Checklist

Use this checklist before sharing, deploying, or cloning this starter into a new client project.

1. Scan the repo for personal paths, emails, tokens, and project-specific secrets.
2. Remove any absolute machine paths like `/Users/...` and replace them with repo-relative links.
3. Confirm `.env` and `apps/mobile/.env` point at the intended Supabase project only.
4. Verify `CORS_ORIGINS` contains only the approved frontend origins.
5. Ensure Supabase Auth leaked password protection is enabled in the dashboard.
6. Re-check RLS, Storage policies, and `public.profiles` after any schema change.
7. Confirm authenticated users only have `SELECT` access to `public.profiles`; role and disabled writes should stay on service/admin paths.
8. Re-verify both `auth.users -> public.profiles` and `public.profiles -> auth.users` sync triggers after changing auth or profile SQL.
9. Re-test one suspend/reactivate flow against the live Supabase project after any profile-sync change.

If personal info or machine-specific references are found, delete or redact them immediately before continuing.

## Security Audit Status (2026-05-11)

### Findings

1. No obvious SQL injection sink found in current app code paths.
   - `apps/api` uses Drizzle query builders instead of string-built SQL for CRUD paths.
   - Cloudflare worker uses Supabase REST filters and validated payloads.

2. Supabase warning: `public.app_schema_state` has RLS disabled.
   - Table is in `public`, so Supabase flags it as exposed through PostgREST.
   - Current worker diagnostics path reads this table through REST, so moving it out of `public` needs code changes.

3. Supabase warning: `public.audit_logs` has RLS disabled.
   - More sensitive than `app_schema_state`.
   - Audit data should not remain exposed in `public` without RLS.

4. Supabase warning: leaked password protection is disabled.
   - This weakens password hygiene for user creation and reset flows.

5. Invite flow accepts arbitrary `redirectTo` URL.
   - Current validation only checks "valid URL", not approved host/domain.
   - This creates open redirect / phishing risk in invite flows.

6. API and worker return raw internal error messages to clients.
   - Current error handling can leak config, auth admin, and backend implementation details.

7. API rate limiting is not implemented.
   - Placeholder middleware exists, but does nothing.
   - Sensitive routes remain open to brute force and abuse.

8. Shared auth package exports unsafe placeholder JWT helpers.
   - `packages/auth/jwt.ts` uses `JSON.parse` as `verifyJwt`.
   - Not used in current auth path, but dangerous if imported later.

### Fixed Now

1. Enabled RLS on `public.audit_logs`.
   - Applied in `supabase/schema.sql`.
   - Applied in baseline migration file.

2. Enabled RLS on `public.app_schema_state`.
   - Applied in `supabase/schema.sql`.
   - Applied in baseline migration file.

3. Added invite redirect allowlist enforcement.
   - Invite redirects must match approved origins from `INVITE_REDIRECT_ORIGINS`, `INVITE_REDIRECT_TO`, or fallback `CORS_ORIGINS`.

4. Replaced raw internal error leakage with safer responses.
   - Invalid auth now returns sanitized unauthorized response.
   - Invalid payloads now return generic validation errors.
   - Unexpected server errors now return generic 500 responses.

5. Added in-memory rate limiting for Node API and Cloudflare worker API routes.
   - Separate tighter bucket for `/users` and `/admin/*` style paths.

6. Removed unsafe JWT helper from shared package exports.
   - Placeholder helper file was removed entirely.

7. Added strong password policy in app code.
   - Managed user passwords now require at least 12 characters, one uppercase letter, one lowercase letter, and one number.
   - Applied in shared schemas, Node API validation, service layer, and worker API path.

8. Applied RLS directly to live Supabase database for:
   - `public.app_schema_state`
   - `public.audit_logs`
   - Verified `rowsecurity = true` on both tables.

### Already Safe / Lower Risk

1. CRUD ownership checks exist for items and categories.
2. JWT verification in active auth path uses `jose` JWKS verification, not placeholder helper.
3. Supabase storage policies and item/category RLS policies exist in schema.

### Recommended Fix Order

1. Enable leaked password protection in Supabase Auth dashboard.
   - Can now also be applied with `pnpm supabase:auth:harden` if `SUPABASE_ACCESS_TOKEN` is set.
   - Script targets `password_hibp_enabled=true`, `password_min_length=12`, and `password_required_characters=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`.
   - Not verified in this session because no Supabase management token was available locally.

2. Apply updated schema/migration to live Supabase project.
   - Completed.
   - Remote migration history now includes:
     - `20260506142411_profiles_and_item_categories_foundation`
     - `20260506144237_revoke_public_execute_on_profile_sync`
     - `20260511044243_baseline_schema`
   - Local placeholder migration files were added for the two older remote versions so `supabase db push` works again.

3. Consider persistent/distributed rate limiting.
   - Current in-memory limiter helps, but does not coordinate across multiple instances.

4. Consider moving `app_schema_state` out of `public`.
   - Better long-term design once worker diagnostics no longer depend on REST access.

5. Keep migration history aligned going forward.
   - Future schema changes should add new tracked migration files instead of editing already-applied versions.

### Optional Later Improvement

Move `app_schema_state` out of `public` into `private` or `internal`.

Tradeoff:
- Better schema design, less exposure, no `public` RLS warning.
- But Cloudflare worker diagnostics code must stop reading it through Supabase REST first.
