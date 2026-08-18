-- ============================================================================
-- SabraTech member auth — profiles, signup trigger, and RLS.
--
-- HOW TO RUN: open Supabase -> SQL Editor -> paste this whole file -> Run.
-- Every statement is idempotent, so running it again is safe.
--
-- Order of sections:
--   1. public.profiles table (+ column top-ups for older installs)
--   2. Signup trigger on auth.users -> creates a 'pending' profile row
--   3. public.is_admin() helper (SECURITY DEFINER, avoids RLS recursion)
--   4. Field guard: members can edit their own name, not their own status
--   5. RLS + policies
--   6. Bootstrap: uncomment the last line to make yourself an approved admin
-- ============================================================================


-- 1. PROFILES ---------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  is_admin boolean not null default false,
  created_at timestamptz default now()
);

-- Top-ups, in case an earlier version of this table already exists.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists status text not null default 'pending';
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_status_check') then
    alter table public.profiles
      add constraint profiles_status_check check (status in ('pending','approved','rejected'));
  end if;
end
$$;


-- 2. SIGNUP TRIGGER ---------------------------------------------------------
-- fullName arrives from the client via supabase.auth.signUp options.data.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, status)
  values (
    new.id,
    new.email,
    nullif(coalesce(new.raw_user_meta_data->>'fullName', new.raw_user_meta_data->>'full_name', ''), ''),
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 3. ADMIN HELPER -----------------------------------------------------------
-- SECURITY DEFINER so it reads profiles with RLS bypassed. The admin policies
-- call this instead of sub-selecting profiles, which would recurse forever.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

grant execute on function public.is_admin() to authenticated;


-- 4. FIELD GUARD ------------------------------------------------------------
-- A member's own-row UPDATE policy would otherwise let them approve themselves.
-- Non-admin logged-in users can only change full_name. auth.uid() is null for
-- the SQL editor and the service role, so server-side updates stay unrestricted.

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.id := old.id;
    new.email := old.email;
    new.status := old.status;
    new.is_admin := old.is_admin;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();


-- 5. RLS --------------------------------------------------------------------

alter table public.profiles enable row level security;

grant select, update on public.profiles to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (public.is_admin());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- 6. BOOTSTRAP --------------------------------------------------------------
-- Sign up through the site first, then uncomment and run this one line.

-- update public.profiles set status = 'approved', is_admin = true where email = 'noabet@gmail.com';
