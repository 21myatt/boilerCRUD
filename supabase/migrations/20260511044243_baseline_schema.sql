create extension if not exists pgcrypto;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table if not exists public.app_schema_state (
  singleton_key text primary key,
  schema_version text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.app_schema_state (singleton_key, schema_version, updated_at)
values ('current', '2026-05-08-next-backend-v1', timezone('utc', now()))
on conflict (singleton_key) do update
set schema_version = excluded.schema_version,
    updated_at = excluded.updated_at;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.items
  alter column user_id set default auth.uid(),
  alter column user_id set not null,
  alter column name drop default;

alter table public.items
  add column if not exists category_id uuid references public.categories (id) on delete set null;

create index if not exists items_user_id_created_at_idx
  on public.items (user_id, created_at desc);

create index if not exists items_user_id_category_id_idx
  on public.items (user_id, category_id);

grant select, insert, update, delete on public.items to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'editor', 'reviewer', 'viewer')),
  disabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists profiles_email_key
  on public.profiles (lower(email));

create index if not exists profiles_role_idx
  on public.profiles (role);

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
begin
  bootstrap_role := case lower(coalesce(new.email, ''))
    when 'admin@local.dev' then 'admin'
    when 'viewer@local.dev' then 'viewer'
    else 'viewer'
  end;

  is_disabled := coalesce(new.banned_until is not null and new.banned_until > timezone('utc', now()), false);

  insert into public.profiles (id, email, role, disabled, created_at, updated_at)
  values (
    new.id,
    coalesce(new.email, ''),
    bootstrap_role,
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

insert into public.profiles (id, email, role, disabled, created_at, updated_at)
select
  users.id,
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
on conflict (id) do update
set email = excluded.email,
    disabled = excluded.disabled,
    updated_at = timezone('utc', now());

grant select on public.profiles to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  target_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  resource text not null,
  payload_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_actor_user_id_idx
  on public.audit_logs (actor_user_id);

create index if not exists audit_logs_target_user_id_idx
  on public.audit_logs (target_user_id);

create index if not exists audit_logs_resource_idx
  on public.audit_logs (resource);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

drop trigger if exists set_items_updated_at on public.items;
create trigger set_items_updated_at
before update on public.items
for each row
execute function public.set_updated_at();

alter table public.items enable row level security;

drop policy if exists "items_select_own" on public.items;
create policy "items_select_own"
on public.items
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "items_insert_own" on public.items;
create policy "items_insert_own"
on public.items
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and (
    category_id is null
    or exists (
      select 1
      from public.categories
      where categories.id = public.items.category_id
        and categories.user_id = (select auth.uid())
    )
  )
);

drop policy if exists "items_update_own" on public.items;
create policy "items_update_own"
on public.items
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and (
    category_id is null
    or exists (
      select 1
      from public.categories
      where categories.id = public.items.category_id
        and categories.user_id = (select auth.uid())
    )
  )
);

drop policy if exists "items_delete_own" on public.items;
create policy "items_delete_own"
on public.items
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.categories
  alter column user_id set default auth.uid(),
  alter column user_id set not null;

create index if not exists categories_user_id_created_at_idx
  on public.categories (user_id, created_at desc);

grant select, insert, update, delete on public.categories to authenticated;

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
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own"
on public.categories
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own"
on public.categories
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own"
on public.categories
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('cms-assets', 'cms-assets', false)
on conflict (id) do nothing;

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bucket_id text not null,
  path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  kind text not null,
  title text,
  alt_text text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.assets
  alter column user_id set default auth.uid();

create index if not exists assets_user_id_created_at_idx
  on public.assets (user_id, created_at desc);

create index if not exists assets_user_id_path_idx
  on public.assets (user_id, path);

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
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "assets_insert_own" on public.assets;
create policy "assets_insert_own"
on public.assets
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "assets_delete_own" on public.assets;
create policy "assets_delete_own"
on public.assets
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "assets_storage_select_own" on storage.objects;
create policy "assets_storage_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cms-assets'
  and owner_id = (select auth.uid()::text)
);

drop policy if exists "assets_storage_insert_own" on storage.objects;
create policy "assets_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'cms-assets'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "assets_storage_update_own" on storage.objects;
create policy "assets_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'cms-assets'
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'cms-assets'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "assets_storage_delete_own" on storage.objects;
create policy "assets_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'cms-assets'
  and owner_id = (select auth.uid()::text)
);
-- Baseline tracked migration copied from supabase/schema.sql.
