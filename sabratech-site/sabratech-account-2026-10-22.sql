-- ============================================================
-- SabraTech — member account area (2026-10-22)
-- My Account · Profile (individual + shared businesses) · Notifications · Settings
-- Run against the Neon "SabraTech" database as the owner role.
-- Idempotent: safe to re-run. Additive only — nothing is dropped except
-- policies/triggers/functions that are immediately recreated.
-- ============================================================

create extension if not exists pg_trgm;

-- ---------- 0. Contact form fix ----------
-- ContactModal has always sent first_name/last_name/phone; the columns were
-- missing, so every submission was rejected. Add them.
alter table public.contact_inquiries add column if not exists first_name text;
alter table public.contact_inquiries add column if not exists last_name  text;
alter table public.contact_inquiries add column if not exists phone      text;
alter table public.contact_inquiries alter column name drop not null;
create or replace function public.contact_fill_name() returns trigger
language plpgsql as $$
begin
  if coalesce(new.name, '') = '' then
    new.name := nullif(trim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, '')), '');
  end if;
  return new;
end;
$$;
drop trigger if exists contact_fill_name_trg on public.contact_inquiries;
create trigger contact_fill_name_trg before insert on public.contact_inquiries
  for each row execute function public.contact_fill_name();

-- ---------- 1. New columns ----------
alter table public.profiles add column if not exists notify jsonb not null default '{}'::jsonb;
alter table public.talents  add column if not exists show_whatsapp boolean not null default true;
alter table public.talents  add column if not exists show_on_map   boolean not null default true;

-- One individual listing per member; unlimited businesses.
create unique index if not exists talents_one_individual_per_owner
  on public.talents (owner_id) where type = 'individual' and owner_id is not null;
create index if not exists talents_name_trgm on public.talents using gin (lower(name) gin_trgm_ops);

-- ---------- 2. Business team ----------
create table if not exists public.business_members (
  id          bigint generated always as identity primary key,
  business_id bigint not null references public.talents(id) on delete cascade,
  user_id     text   not null,
  role        text   not null default 'employee' check (role in ('owner','manager','employee')),
  status      text   not null default 'pending'  check (status in ('pending','approved','declined')),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,
  decided_by  text,
  unique (business_id, user_id)
);
create index if not exists business_members_user on public.business_members (user_id);

-- ---------- 3. On-site alerts ----------
create table if not exists public.notifications (
  id         bigint generated always as identity primary key,
  user_id    text not null,
  kind       text not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_time on public.notifications (user_id, created_at desc);

-- ---------- 4. Helpers ----------
-- RPCs below set this flag so the field-protection triggers let them through.
create or replace function public._bypass_on() returns boolean
language sql stable as $$ select coalesce(current_setting('sabratech.bypass', true), '') = 'on' $$;

-- Caller can edit this business and approve its join requests (owner, manager, or site admin).
create or replace function public.is_business_editor(bid bigint) returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin()
      or exists (select 1 from public.talents t where t.id = bid and t.owner_id = auth.user_id())
      or exists (select 1 from public.business_members m
                 where m.business_id = bid and m.user_id = auth.user_id()
                   and m.status = 'approved' and m.role in ('owner','manager'));
$$;

-- Is this alert type/channel switched on for that user? Absent = on.
create or replace function public._wants(uid text, kind text, channel text) returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select (p.notify -> kind ->> channel)::boolean from public.profiles p where p.id = uid), true);
$$;

-- Drop an on-site alert in someone's bell (respects their switches).
create or replace function public._alert(uid text, kind text, title text, body text, link text) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if uid is null then return; end if;
  if not public._wants(uid, kind, 'site') then return; end if;
  insert into public.notifications (user_id, kind, title, body, link) values (uid, kind, title, body, link);
end;
$$;

create or replace function public._alert_admins(kind text, title text, body text, link text) returns void
language plpgsql security definer set search_path = public
as $$
declare r record;
begin
  for r in select id from public.profiles where is_admin and status = 'approved' loop
    perform public._alert(r.id, kind, title, body, link);
  end loop;
end;
$$;

create or replace function public._alert_business_editors(bid bigint, kind text, title text, body text, link text) returns void
language plpgsql security definer set search_path = public
as $$
declare r record;
begin
  for r in
    select distinct u from (
      select owner_id as u from public.talents where id = bid
      union
      select user_id from public.business_members
       where business_id = bid and status = 'approved' and role in ('owner','manager')
    ) x where u is not null
  loop
    perform public._alert(r.u, kind, title, body, link);
  end loop;
end;
$$;

create or replace function public._listing_name(t public.talents) returns text
language sql immutable as $$
  select coalesce(nullif(trim(coalesce(t.first_name,'') || ' ' || coalesce(t.last_name,'')), ''), t.name, 'your listing')
$$;

-- ---------- 5. Profiles: members may edit their own name, nothing else ----------
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.user_id() is not null and not public.is_admin() and not public._bypass_on() then
    new.id := old.id; new.email := old.email; new.status := old.status;
    new.is_admin := old.is_admin; new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields before update on public.profiles
  for each row execute function public.protect_profile_fields();

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.user_id()) with check (id = auth.user_id());

-- New signup: link any listing that carries the same email, tell the admins.
create or replace function public.profiles_after_insert() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform set_config('sabratech.bypass', 'on', true);
  -- one individual listing at most
  update public.talents t set owner_id = new.id
   where t.id = (select id from public.talents
                  where type = 'individual' and owner_id is null
                    and lower(trim(email)) = lower(trim(new.email))
                  order by published desc, created_at desc limit 1)
     and not exists (select 1 from public.talents x where x.type = 'individual' and x.owner_id = new.id);
  update public.talents set owner_id = new.id
   where type = 'company' and owner_id is null and lower(trim(email)) = lower(trim(new.email));
  perform set_config('sabratech.bypass', '', true);
  if new.status = 'pending' then
    perform public._alert_admins('admin_alerts', 'New member waiting for approval',
      coalesce(nullif(new.full_name, ''), new.email), '/admin');
  end if;
  return null;
end;
$$;
drop trigger if exists profiles_after_insert_trg on public.profiles;
create trigger profiles_after_insert_trg after insert on public.profiles
  for each row execute function public.profiles_after_insert();

create or replace function public.profiles_after_update() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if old.status is distinct from 'approved' and new.status = 'approved' then
    perform public._alert(new.id, 'account', 'Your membership is approved', 'Welcome to SabraTech — the directory is open to you.', '/search');
  end if;
  return null;
end;
$$;
drop trigger if exists profiles_after_update_trg on public.profiles;
create trigger profiles_after_update_trg after update on public.profiles
  for each row execute function public.profiles_after_update();

-- ---------- 6. Talents: owners/managers edit, moderation stays with admins ----------
create or replace function public.protect_talent_fields() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.user_id() is not null and not public.is_admin() and not public._bypass_on() then
    new.status := old.status; new.published := old.published;
    new.owner_id := old.owner_id; new.type := old.type; new.created_at := old.created_at;
  end if;
  -- On approval, link an unowned listing to a member with the same email.
  if new.status = 'approved' and old.status is distinct from 'approved' and new.owner_id is null then
    if new.type = 'individual' then
      new.owner_id := (select p.id from public.profiles p
                        where lower(trim(p.email)) = lower(trim(new.email))
                          and not exists (select 1 from public.talents x where x.type = 'individual' and x.owner_id = p.id and x.id <> new.id)
                        limit 1);
    else
      new.owner_id := (select p.id from public.profiles p where lower(trim(p.email)) = lower(trim(new.email)) limit 1);
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists talents_protect_fields on public.talents;
create trigger talents_protect_fields before update on public.talents
  for each row execute function public.protect_talent_fields();

-- Keep the owner's row in business_members in step with talents.owner_id.
create or replace function public.talents_sync_owner_member() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.type <> 'company' then return null; end if;
  if tg_op = 'UPDATE' and old.owner_id is not distinct from new.owner_id then return null; end if;
  if tg_op = 'UPDATE' and old.owner_id is not null then
    update public.business_members set role = 'manager'
     where business_id = new.id and user_id = old.owner_id and role = 'owner';
  end if;
  if new.owner_id is not null then
    insert into public.business_members (business_id, user_id, role, status, decided_at)
    values (new.id, new.owner_id, 'owner', 'approved', now())
    on conflict (business_id, user_id) do update set role = 'owner', status = 'approved', decided_at = now();
  end if;
  return null;
end;
$$;
drop trigger if exists talents_sync_owner_member_trg on public.talents;
create trigger talents_sync_owner_member_trg after insert or update of owner_id on public.talents
  for each row execute function public.talents_sync_owner_member();

create or replace function public.talents_after_change() returns trigger
language plpgsql security definer set search_path = public
as $$
declare nm text := public._listing_name(new); r record;
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      perform public._alert_admins('admin_alerts',
        'New ' || case when new.type = 'company' then 'business' else 'individual' end || ' listing waiting for approval',
        nm, '/admin');
    end if;
    return null;
  end if;
  if old.status is distinct from new.status then
    if new.status = 'approved' then
      perform public._alert(new.owner_id, 'listing_updates', nm || ' is now live in the directory', null,
        '/individual/' || new.id);
      for r in select id from public.profiles where status = 'approved' and id is distinct from new.owner_id loop
        perform public._alert(r.id, 'new_members', 'New in the directory: ' || nm, new.title,
          '/individual/' || new.id);
      end loop;
    elsif new.status = 'rejected' then
      perform public._alert(new.owner_id, 'listing_updates', nm || ' was not approved', 'Contact us if you think this is a mistake.', '/profile');
    end if;
  end if;
  return null;
end;
$$;
drop trigger if exists talents_after_change_trg on public.talents;
create trigger talents_after_change_trg after insert or update on public.talents
  for each row execute function public.talents_after_change();

-- Policies: the base table is now private to admins, owners and business editors.
-- Everyone else reads the talents_directory view, which blanks hidden contact fields.
drop policy if exists talents_public_read  on public.talents;
drop policy if exists talents_apply        on public.talents;
drop policy if exists talents_owner_read   on public.talents;
drop policy if exists talents_owner_update on public.talents;
create policy talents_owner_read on public.talents
  for select to authenticated using (public.is_admin() or owner_id = auth.user_id() or public.is_business_editor(id));
create policy talents_apply on public.talents
  for insert to anonymous, authenticated
  with check (published = false and status = 'pending' and (owner_id is null or owner_id = auth.user_id()));
create policy talents_owner_update on public.talents
  for update to authenticated
  using (owner_id = auth.user_id() or public.is_business_editor(id))
  with check (owner_id = auth.user_id() or public.is_business_editor(id));

create or replace view public.talents_directory as
select id, created_at, type, name, first_name, last_name, title, company, bio, description, category, skills,
       linkedin, website, github,
       case when show_email    then email    end as email,
       case when show_phone    then phone    end as phone,
       case when show_whatsapp then whatsapp end as whatsapp,
       case when show_on_map   then address  end as address,
       case when show_on_map   then lat      end as lat,
       case when show_on_map   then lng      end as lng,
       photo_url, image_pos_x, image_pos_y, image_zoom, cv_url, cv_updated_at,
       open_to_work, freelance, hiring, show_phone, show_email, show_whatsapp, show_on_map,
       posts, status, published
  from public.talents
 where published = true;
grant select on public.talents_directory to anonymous, authenticated;

-- Public team list for a business page: approved members, names only.
create or replace view public.business_team as
select m.business_id, m.role,
       coalesce(case when i.id is not null then public._listing_name(i) end, nullif(p.full_name, ''), 'Member') as member_name,
       i.id as individual_id, i.title as member_title, i.photo_url as member_photo
  from public.business_members m
  join public.talents b on b.id = m.business_id and b.published
  join public.profiles p on p.id = m.user_id and p.status = 'approved'
  left join public.talents i on i.owner_id = m.user_id and i.type = 'individual' and i.published
 where m.status = 'approved';
grant select on public.business_team to authenticated;

-- ---------- 7. RLS for the new tables ----------
alter table public.business_members enable row level security;
alter table public.notifications    enable row level security;

grant select on public.business_members to authenticated;
drop policy if exists bm_read on public.business_members;
create policy bm_read on public.business_members
  for select to authenticated using (user_id = auth.user_id() or public.is_business_editor(business_id));

grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
drop policy if exists notif_own on public.notifications;
create policy notif_own on public.notifications
  for all to authenticated using (user_id = auth.user_id()) with check (user_id = auth.user_id());

-- Members may change the notify column on their own profile row (status/is_admin stay protected).
-- (profiles already has full update grant; the trigger above guards the sensitive columns.)

-- ---------- 8. RPCs the app calls ----------

-- Search before create: published AND pending businesses, fuzzy.
create or replace function public.search_businesses(q text)
returns table (id bigint, name text, title text, photo_url text, published boolean, my_status text, my_role text)
language sql stable security definer set search_path = public
as $$
  with n as (select lower(trim(regexp_replace(coalesce(q,''), '\m(inc|llc|ltd|corp|co)\M\.?', '', 'gi'))) as s)
  select t.id, t.name, t.title, t.photo_url, t.published, m.status, m.role
    from public.talents t
    cross join n
    left join public.business_members m on m.business_id = t.id and m.user_id = auth.user_id()
   where t.type = 'company' and t.status <> 'rejected' and length(n.s) >= 2
     and (lower(t.name) like '%' || n.s || '%' or similarity(lower(t.name), n.s) > 0.3)
   order by similarity(lower(t.name), n.s) desc, t.name
   limit 8;
$$;

create or replace function public.request_join_business(bid bigint) returns text
language plpgsql security definer set search_path = public
as $$
declare uid text := auth.user_id(); b public.talents; who text;
begin
  if uid is null then raise exception 'Please log in first'; end if;
  if not exists (select 1 from public.profiles where id = uid and status = 'approved') then
    raise exception 'Your membership must be approved before you can join a business';
  end if;
  select * into b from public.talents where id = bid and type = 'company';
  if b.id is null then raise exception 'Business not found'; end if;
  insert into public.business_members (business_id, user_id, role, status)
  values (bid, uid, 'employee', 'pending')
  on conflict (business_id, user_id) do update
     set status = 'pending', role = 'employee', created_at = now(), decided_at = null, decided_by = null
   where public.business_members.status = 'declined';
  select coalesce(nullif(full_name, ''), email) into who from public.profiles where id = uid;
  perform public._alert_business_editors(bid, 'join_requests', who || ' asked to join ' || b.name, null, '/profile?tab=businesses');
  return 'pending';
end;
$$;

create or replace function public.respond_join_request(member_id bigint, approve boolean) returns void
language plpgsql security definer set search_path = public
as $$
declare m public.business_members; bname text;
begin
  select * into m from public.business_members where id = member_id;
  if m.id is null then raise exception 'Request not found'; end if;
  if not public.is_business_editor(m.business_id) then raise exception 'Only the business owner or a manager can do that'; end if;
  if m.status <> 'pending' then return; end if;
  update public.business_members
     set status = case when approve then 'approved' else 'declined' end, decided_at = now(), decided_by = auth.user_id()
   where id = member_id;
  select name into bname from public.talents where id = m.business_id;
  perform public._alert(m.user_id, 'join_decisions',
    case when approve then 'You joined ' || bname else 'Your request to join ' || bname || ' was declined' end,
    null, '/profile?tab=businesses');
end;
$$;

create or replace function public.set_business_member_role(member_id bigint, new_role text) returns void
language plpgsql security definer set search_path = public
as $$
declare m public.business_members;
begin
  if new_role not in ('manager','employee') then raise exception 'Role must be manager or employee'; end if;
  select * into m from public.business_members where id = member_id;
  if m.id is null then raise exception 'Member not found'; end if;
  if not (public.is_admin() or exists (select 1 from public.talents where id = m.business_id and owner_id = auth.user_id())) then
    raise exception 'Only the business owner can change roles';
  end if;
  if m.role = 'owner' then raise exception 'Use transfer ownership to change the owner'; end if;
  update public.business_members set role = new_role where id = member_id;
end;
$$;

create or replace function public.remove_business_member(member_id bigint) returns void
language plpgsql security definer set search_path = public
as $$
declare m public.business_members; uid text := auth.user_id(); is_owner boolean;
begin
  select * into m from public.business_members where id = member_id;
  if m.id is null then return; end if;
  if m.role = 'owner' then raise exception 'The owner cannot be removed — transfer ownership first'; end if;
  is_owner := exists (select 1 from public.talents where id = m.business_id and owner_id = uid);
  if not (public.is_admin() or is_owner or m.user_id = uid
          or (m.role = 'employee' and public.is_business_editor(m.business_id))) then
    raise exception 'You cannot remove this member';
  end if;
  delete from public.business_members where id = member_id;
end;
$$;

create or replace function public.transfer_business_ownership(bid bigint, new_owner text) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not (public.is_admin() or exists (select 1 from public.talents where id = bid and owner_id = auth.user_id())) then
    raise exception 'Only the owner or a site admin can transfer ownership';
  end if;
  if not exists (select 1 from public.business_members where business_id = bid and user_id = new_owner and status = 'approved') then
    raise exception 'The new owner must already be an approved team member';
  end if;
  perform set_config('sabratech.bypass', 'on', true);
  update public.talents set owner_id = new_owner where id = bid and type = 'company';
  perform set_config('sabratech.bypass', '', true);
  perform public._alert(new_owner, 'join_decisions', 'You are now the owner of ' || (select name from public.talents where id = bid), null, '/profile?tab=businesses');
end;
$$;

-- Admin only: set any listing's owner by member email ('' clears it).
create or replace function public.admin_set_listing_owner(tid bigint, member_email text) returns text
language plpgsql security definer set search_path = public
as $$
declare uid text;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if coalesce(trim(member_email), '') = '' then
    update public.talents set owner_id = null where id = tid; return null;
  end if;
  select id into uid from public.profiles where lower(trim(email)) = lower(trim(member_email));
  if uid is null then raise exception 'No member with that email has signed up yet'; end if;
  update public.talents set owner_id = uid where id = tid;
  return uid;
end;
$$;

-- Admin view of a business team (incl. pending), with emails.
create or replace function public.business_members_detail(bid bigint)
returns table (id bigint, user_id text, role text, status text, created_at timestamptz, member_name text, member_email text)
language sql stable security definer set search_path = public
as $$
  select m.id, m.user_id, m.role, m.status, m.created_at,
         coalesce(nullif(p.full_name, ''), p.email, 'Member'), p.email
    from public.business_members m
    left join public.profiles p on p.id = m.user_id
   where m.business_id = bid and public.is_business_editor(bid)
   order by (m.status = 'pending') desc, (m.role = 'owner') desc, (m.role = 'manager') desc, m.created_at;
$$;

-- My businesses (any status) for the Profile page.
create or replace function public.my_businesses()
returns table (business_id bigint, name text, title text, photo_url text, published boolean, listing_status text,
               member_id bigint, role text, status text, pending_requests bigint)
language sql stable security definer set search_path = public
as $$
  select t.id, t.name, t.title, t.photo_url, t.published, t.status, m.id, m.role, m.status,
         (select count(*) from public.business_members x where x.business_id = t.id and x.status = 'pending')
    from public.business_members m
    join public.talents t on t.id = m.business_id
   where m.user_id = auth.user_id() and m.status <> 'declined'
   order by (m.role = 'owner') desc, t.name;
$$;

-- Delete my account: memberships, alerts, my individual listing, my profile, and the login itself.
-- Businesses I own stay listed but become unowned; admins are told so they can reassign.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, neon_auth
as $$
declare uid text := auth.user_id(); who text; r record;
begin
  if uid is null then raise exception 'Please log in first'; end if;
  select coalesce(nullif(full_name, ''), email) into who from public.profiles where id = uid;
  perform set_config('sabratech.bypass', 'on', true);
  for r in select id, name from public.talents where owner_id = uid and type = 'company' loop
    update public.talents set owner_id = null where id = r.id;
    perform public._alert_admins('admin_alerts', r.name || ' has no owner', coalesce(who, 'A member') || ' deleted their account. Assign a new owner in Admin.', '/admin');
  end loop;
  delete from public.talents where owner_id = uid and type = 'individual';
  delete from public.business_members where user_id = uid;
  delete from public.notifications where user_id = uid;
  delete from public.profiles where id = uid;
  begin
    delete from neon_auth.session where "userId"::text = uid;
    delete from neon_auth.account where "userId"::text = uid;
    delete from neon_auth."user" where id::text = uid;
  exception when others then
    perform public._alert_admins('admin_alerts', 'Login not removed', coalesce(who, uid) || ' deleted their account but the login could not be removed automatically.', '/admin');
  end;
  perform set_config('sabratech.bypass', '', true);
end;
$$;

-- ---------- 9. Function permissions ----------
-- Postgres lets everyone execute new functions by default, and the Data API
-- exposes every public function. Lock the internals, open only the app RPCs.
revoke execute on function public._bypass_on()                               from public, anonymous, authenticated;
revoke execute on function public._wants(text, text, text)                   from public, anonymous, authenticated;
revoke execute on function public._alert(text, text, text, text, text)       from public, anonymous, authenticated;
revoke execute on function public._alert_admins(text, text, text, text)      from public, anonymous, authenticated;
revoke execute on function public._alert_business_editors(bigint, text, text, text, text) from public, anonymous, authenticated;
revoke execute on function public.profiles_after_insert()   from public, anonymous, authenticated;
revoke execute on function public.profiles_after_update()   from public, anonymous, authenticated;
revoke execute on function public.talents_sync_owner_member() from public, anonymous, authenticated;
revoke execute on function public.talents_after_change()    from public, anonymous, authenticated;
revoke execute on function public.protect_talent_fields()   from public, anonymous, authenticated;
revoke execute on function public.protect_profile_fields()  from public, anonymous, authenticated;

grant execute on function public._listing_name(public.talents)       to anonymous, authenticated;
grant execute on function public.is_business_editor(bigint)           to anonymous, authenticated;
grant execute on function public.search_businesses(text)              to authenticated;
grant execute on function public.request_join_business(bigint)        to authenticated;
grant execute on function public.respond_join_request(bigint, boolean) to authenticated;
grant execute on function public.set_business_member_role(bigint, text) to authenticated;
grant execute on function public.remove_business_member(bigint)       to authenticated;
grant execute on function public.transfer_business_ownership(bigint, text) to authenticated;
grant execute on function public.admin_set_listing_owner(bigint, text) to authenticated;
grant execute on function public.business_members_detail(bigint)      to authenticated;
grant execute on function public.my_businesses()                      to authenticated;
grant execute on function public.delete_my_account()                  to authenticated;

-- ---------- 10. Backfill: link existing listings to existing members by email ----------
do $$
declare p record;
begin
  perform set_config('sabratech.bypass', 'on', true);
  for p in select id, email from public.profiles loop
    update public.talents t set owner_id = p.id
     where t.id = (select id from public.talents where type = 'individual' and owner_id is null
                     and lower(trim(email)) = lower(trim(p.email)) order by published desc, created_at desc limit 1)
       and not exists (select 1 from public.talents x where x.type = 'individual' and x.owner_id = p.id);
    update public.talents set owner_id = p.id
     where type = 'company' and owner_id is null and lower(trim(email)) = lower(trim(p.email));
  end loop;
end $$;

-- Tell the Data API to pick up the new tables, views and functions.
notify pgrst, 'reload schema';
