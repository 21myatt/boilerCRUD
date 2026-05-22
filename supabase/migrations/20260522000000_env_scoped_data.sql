create or replace function private.current_app_env()
returns text
language sql
stable
set search_path = pg_catalog, public
as $$
  select case lower(coalesce((nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-app-env'), ''))
    when 'development' then 'development'
    when 'staging' then 'staging'
    when 'production' then 'production'
    else null
  end
$$;

insert into public.app_schema_state (singleton_key, schema_version, updated_at)
values ('current', '2026-05-22-env-scoped-data-v1', timezone('utc', now()))
on conflict (singleton_key) do update
set schema_version = excluded.schema_version,
    updated_at = excluded.updated_at;

alter table public.items
  add column if not exists app_env text not null default coalesce(private.current_app_env(), 'production');

update public.items
set app_env = coalesce(app_env, 'production');

drop index if exists items_user_id_created_at_idx;
drop index if exists items_user_id_category_id_idx;

create index if not exists items_app_env_user_id_created_at_idx
  on public.items (app_env, user_id, created_at desc);

create index if not exists items_app_env_user_id_category_id_idx
  on public.items (app_env, user_id, category_id);

alter table public.profiles
  add column if not exists app_env text not null default coalesce(private.current_app_env(), 'production');

update public.profiles
set app_env = coalesce(app_env, 'production');

alter table public.profiles drop constraint if exists profiles_pkey;
alter table public.profiles add primary key (id, app_env);

drop index if exists profiles_email_key;
drop index if exists profiles_role_idx;

create unique index if not exists profiles_email_app_env_key
  on public.profiles (lower(email), app_env);

create index if not exists profiles_role_app_env_idx
  on public.profiles (role, app_env);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists on_auth_user_profile_sync on auth.users;
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
  bootstrap_role text;
  is_disabled boolean;
  app_env text;
begin
  app_env := private.current_app_env();

  if app_env is null then
    return new;
  end if;

  bootstrap_role := case lower(coalesce(new.email, ''))
    when 'admin@local.dev' then 'admin'
    when 'viewer@local.dev' then 'viewer'
    else 'viewer'
  end;

  is_disabled := coalesce(new.banned_until is not null and new.banned_until > timezone('utc', now()), false);

  insert into public.profiles (id, app_env, email, role, disabled, created_at, updated_at)
  values (
    new.id,
    app_env,
    coalesce(new.email, ''),
    bootstrap_role,
    is_disabled,
    coalesce(new.created_at, timezone('utc', now())),
    timezone('utc', now())
  )
  on conflict (id, app_env) do update
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
  if private.current_app_env() is distinct from 'production' then
    return new;
  end if;

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

insert into public.profiles (id, app_env, email, role, disabled, created_at, updated_at)
select
  users.id,
  'production',
  coalesce(users.email, ''),
  case lower(coalesce(users.email, ''))
    when 'admin@local.dev' then 'admin'
    when 'viewer@local.dev' then 'viewer'
    else 'viewer'
  end,
  coalesce(users.banned_until is not null and users.banned_until > timezone('utc', now()), false),
  coalesce(users.created_at, timezone('utc', now())),
  timezone('utc', now())
from auth.users as users
on conflict (id, app_env) do update
set email = excluded.email,
    disabled = excluded.disabled,
    updated_at = timezone('utc', now());

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id and app_env = private.current_app_env());

alter table public.audit_logs
  add column if not exists app_env text not null default coalesce(private.current_app_env(), 'production');

update public.audit_logs
set app_env = coalesce(app_env, 'production');

drop index if exists audit_logs_actor_user_id_idx;
drop index if exists audit_logs_target_user_id_idx;
drop index if exists audit_logs_resource_idx;
drop index if exists audit_logs_created_at_idx;

create index if not exists audit_logs_app_env_actor_user_id_idx
  on public.audit_logs (app_env, actor_user_id);

create index if not exists audit_logs_app_env_target_user_id_idx
  on public.audit_logs (app_env, target_user_id);

create index if not exists audit_logs_app_env_resource_idx
  on public.audit_logs (app_env, resource);

create index if not exists audit_logs_app_env_created_at_idx
  on public.audit_logs (app_env, created_at desc);

alter table public.categories
  add column if not exists app_env text not null default coalesce(private.current_app_env(), 'production');

update public.categories
set app_env = coalesce(app_env, 'production');

drop index if exists categories_user_id_created_at_idx;

create index if not exists categories_app_env_user_id_created_at_idx
  on public.categories (app_env, user_id, created_at desc);

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

alter table public.categories enable row level security;

drop policy if exists "categories_select_own" on public.categories;
create policy "categories_select_own"
on public.categories
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id and app_env = private.current_app_env());

drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own"
on public.categories
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id and app_env = private.current_app_env());

drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own"
on public.categories
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id and app_env = private.current_app_env())
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id and app_env = private.current_app_env());

drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own"
on public.categories
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id and app_env = private.current_app_env());

alter table public.items enable row level security;

drop policy if exists "items_select_own" on public.items;
create policy "items_select_own"
on public.items
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id and app_env = private.current_app_env());

drop policy if exists "items_insert_own" on public.items;
create policy "items_insert_own"
on public.items
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and app_env = private.current_app_env()
  and (
    category_id is null
    or exists (
      select 1
      from public.categories
      where categories.id = public.items.category_id
        and categories.user_id = (select auth.uid())
        and categories.app_env = public.items.app_env
    )
  )
);

drop policy if exists "items_update_own" on public.items;
create policy "items_update_own"
on public.items
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id and app_env = private.current_app_env())
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and app_env = private.current_app_env()
  and (
    category_id is null
    or exists (
      select 1
      from public.categories
      where categories.id = public.items.category_id
        and categories.user_id = (select auth.uid())
        and categories.app_env = public.items.app_env
    )
  )
);

drop policy if exists "items_delete_own" on public.items;
create policy "items_delete_own"
on public.items
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id and app_env = private.current_app_env());

alter table public.assets
  add column if not exists app_env text not null default coalesce(private.current_app_env(), 'production');

update public.assets
set app_env = coalesce(app_env, 'production');

drop index if exists assets_user_id_created_at_idx;
drop index if exists assets_user_id_path_idx;

create index if not exists assets_app_env_user_id_created_at_idx
  on public.assets (app_env, user_id, created_at desc);

create index if not exists assets_app_env_user_id_path_idx
  on public.assets (app_env, user_id, path);

drop trigger if exists set_assets_updated_at on public.assets;
create trigger set_assets_updated_at
before update on public.assets
for each row
execute function public.set_updated_at();

alter table public.assets enable row level security;

grant select, insert, delete on public.assets to authenticated;

drop policy if exists "assets_select_own" on public.assets;
create policy "assets_select_own"
on public.assets
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id and app_env = private.current_app_env());

drop policy if exists "assets_insert_own" on public.assets;
create policy "assets_insert_own"
on public.assets
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id and app_env = private.current_app_env());

drop policy if exists "assets_delete_own" on public.assets;
create policy "assets_delete_own"
on public.assets
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id and app_env = private.current_app_env());

drop policy if exists "assets_storage_select_own" on storage.objects;
create policy "assets_storage_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cms-assets'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = private.current_app_env()
  and (storage.foldername(name))[2] = (select auth.uid()::text)
);

drop policy if exists "assets_storage_insert_own" on storage.objects;
create policy "assets_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'cms-assets'
  and (storage.foldername(name))[1] = private.current_app_env()
  and (storage.foldername(name))[2] = (select auth.uid()::text)
);

drop policy if exists "assets_storage_update_own" on storage.objects;
create policy "assets_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'cms-assets'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = private.current_app_env()
  and (storage.foldername(name))[2] = (select auth.uid()::text)
)
with check (
  bucket_id = 'cms-assets'
  and (storage.foldername(name))[1] = private.current_app_env()
  and (storage.foldername(name))[2] = (select auth.uid()::text)
);

drop policy if exists "assets_storage_delete_own" on storage.objects;
create policy "assets_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'cms-assets'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = private.current_app_env()
  and (storage.foldername(name))[2] = (select auth.uid()::text)
);
