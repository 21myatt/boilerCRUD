# Security Checklist

Use this checklist before sharing, deploying, or cloning IMSys into a new client project.

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
