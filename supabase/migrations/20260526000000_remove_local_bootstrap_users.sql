drop trigger if exists on_profile_auth_user_sync on public.profiles;
drop function if exists public.sync_profile_from_auth_user();
drop function if exists public.sync_auth_user_from_profile();
drop function if exists private.sync_profile_from_auth_user();
drop function if exists private.sync_auth_user_from_profile();

create or replace function private.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  is_disabled boolean;
begin
  is_disabled := coalesce(new.banned_until is not null and new.banned_until > timezone('utc', now()), false);

  insert into public.profiles (id, email, role, disabled, created_at, updated_at)
  values (
    new.id,
    coalesce(new.email, ''),
    'viewer',
    is_disabled,
    coalesce(new.created_at, timezone('utc', now())),
    timezone('utc', now())
  )
  on conflict (id) do update
  set email = excluded.email,
      disabled = excluded.disabled,
      updated_at = timezone('utc', now());

  return new;
end;
$$;

create or replace function private.sync_auth_user_from_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  desired_banned_until timestamptz;
  auth_is_disabled boolean;
begin
  desired_banned_until := case
    when new.disabled then timezone('utc', now()) + interval '100 years'
    else null
  end;

  select coalesce(
    users.banned_until is not null and users.banned_until > timezone('utc', now()),
    false
  )
  into auth_is_disabled
  from auth.users as users
  where users.id = new.id;

  if auth_is_disabled is distinct from new.disabled then
    update auth.users
    set banned_until = desired_banned_until
    where id = new.id;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_profile_sync
after insert or update of email, banned_until on auth.users
for each row
execute function private.sync_profile_from_auth_user();

create trigger on_profile_auth_user_sync
after insert or update of disabled on public.profiles
for each row
execute function private.sync_auth_user_from_profile();

revoke execute on function private.sync_profile_from_auth_user() from anon, authenticated, public;
revoke execute on function private.sync_auth_user_from_profile() from anon, authenticated, public;

update public.profiles
set role = 'viewer',
    updated_at = timezone('utc', now())
where lower(email) in ('admin@local.dev', 'viewer@local.dev');
