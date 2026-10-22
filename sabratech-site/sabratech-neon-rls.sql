-- ============================================================
-- SabraTech on Neon — Row Level Security for the Data API
-- Run once against the Neon "SabraTech" database (owner role).
-- Idempotent: safe to re-run.
--
-- Roles: the Neon Data API executes requests as
--   anonymous      (no login)  /  authenticated  (valid Neon Auth JWT)
-- auth.user_id() returns the logged-in user's id (text) from the JWT.
--
-- Design notes
-- * profiles.status / is_admin are NOT client-writable at all (column-level
--   grants omit them) — a BEFORE INSERT trigger auto-promotes emails found in
--   admin_allowlist, everyone else lands as 'pending'.
-- * This intentionally tightens the old Supabase policies, where ANY
--   authenticated member had full write on talents/categories/site_content.
--   Writes now require an approved admin profile.
-- ============================================================

-- ---------- helper: is the caller an approved admin? ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.user_id() and is_admin = true and status = 'approved'
  );
$$;

-- ---------- auto-promote allowlisted admin emails ----------
create or replace function public.promote_allowlisted() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.email is not null and exists (
    select 1 from public.admin_allowlist a where lower(a.email) = lower(new.email)
  ) then
    new.status := 'approved';
    new.is_admin := true;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_promote_allowlisted on public.profiles;
create trigger profiles_promote_allowlisted
  before insert on public.profiles
  for each row execute function public.promote_allowlisted();

-- ---------- enable RLS everywhere ----------
alter table public.talents           enable row level security;
alter table public.sponsor_inquiries enable row level security;
alter table public.contact_inquiries enable row level security;
alter table public.categories        enable row level security;
alter table public.site_content      enable row level security;
alter table public.ai_tools          enable row level security;
alter table public.profiles          enable row level security;
alter table public.admin_allowlist   enable row level security;

-- ---------- base grants (RLS still filters rows) ----------
grant usage on schema public to anonymous, authenticated;
grant execute on function public.is_admin() to anonymous, authenticated;
grant usage, select on all sequences in schema public to anonymous, authenticated;

-- start clean, then grant the minimum
revoke all on all tables in schema public from anonymous, authenticated;

grant select, insert                 on public.talents           to anonymous, authenticated;
grant update, delete                 on public.talents           to authenticated;
grant select                         on public.categories        to anonymous, authenticated;
grant insert, update, delete         on public.categories        to authenticated;
grant select                         on public.site_content      to anonymous, authenticated;
grant insert, update, delete         on public.site_content      to authenticated;
grant select                         on public.ai_tools          to anonymous, authenticated;
grant insert, update, delete         on public.ai_tools          to authenticated;
grant insert                         on public.sponsor_inquiries to anonymous, authenticated;
grant select, update, delete         on public.sponsor_inquiries to authenticated;
grant insert                         on public.contact_inquiries to anonymous, authenticated;
grant select, update, delete         on public.contact_inquiries to authenticated;
-- profiles: clients may only supply id/email/full_name; status & is_admin
-- come from defaults + the allowlist trigger.
grant select                                   on public.profiles to authenticated;
grant insert (id, email, full_name)            on public.profiles to authenticated;
grant update, delete                           on public.profiles to authenticated;
grant select, insert, update, delete           on public.admin_allowlist to authenticated;

-- ---------- talents ----------
drop policy if exists talents_public_read   on public.talents;
drop policy if exists talents_apply         on public.talents;
drop policy if exists talents_admin_all     on public.talents;
create policy talents_public_read on public.talents
  for select to anonymous, authenticated using (published = true or public.is_admin());
create policy talents_apply on public.talents
  for insert to anonymous, authenticated
  with check (published = false and status = 'pending');
create policy talents_admin_all on public.talents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- sponsor_inquiries ----------
drop policy if exists sponsors_insert    on public.sponsor_inquiries;
drop policy if exists sponsors_admin_all on public.sponsor_inquiries;
create policy sponsors_insert on public.sponsor_inquiries
  for insert to anonymous, authenticated with check (true);
create policy sponsors_admin_all on public.sponsor_inquiries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- contact_inquiries ----------
drop policy if exists contact_insert    on public.contact_inquiries;
drop policy if exists contact_admin_all on public.contact_inquiries;
create policy contact_insert on public.contact_inquiries
  for insert to anonymous, authenticated with check (status = 'new');
create policy contact_admin_all on public.contact_inquiries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- categories ----------
drop policy if exists categories_read      on public.categories;
drop policy if exists categories_admin_all on public.categories;
create policy categories_read on public.categories
  for select to anonymous, authenticated using (true);
create policy categories_admin_all on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- site_content ----------
drop policy if exists content_read      on public.site_content;
drop policy if exists content_admin_all on public.site_content;
create policy content_read on public.site_content
  for select to anonymous, authenticated using (true);
create policy content_admin_all on public.site_content
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- ai_tools ----------
drop policy if exists tools_public_read on public.ai_tools;
drop policy if exists tools_admin_all   on public.ai_tools;
create policy tools_public_read on public.ai_tools
  for select to anonymous, authenticated using (published = true or public.is_admin());
create policy tools_admin_all on public.ai_tools
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- profiles ----------
drop policy if exists profiles_select_own   on public.profiles;
drop policy if exists profiles_insert_own   on public.profiles;
drop policy if exists profiles_admin_all    on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.user_id() or public.is_admin());
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.user_id());
create policy profiles_admin_all on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- admin_allowlist (admins only) ----------
drop policy if exists allowlist_admin_all on public.admin_allowlist;
create policy allowlist_admin_all on public.admin_allowlist
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
