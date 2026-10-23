-- ============================================================
-- SabraTech — 2026-10-22 (second batch)
-- 1. Approving a member also approves their individual listing (one click).
-- 2. "I am Company Leadership": join requests can ask to be a manager;
--    only the owner (or a site admin) can approve someone as a manager.
-- Run after sabratech-account-2026-10-22.sql. Idempotent.
-- ============================================================

-- ---------- 1. member approval publishes their individual listing ----------
create or replace function public.profiles_after_update() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if old.status is distinct from 'approved' and new.status = 'approved' then
    update public.talents set status = 'approved', published = true
     where owner_id = new.id and type = 'individual' and status = 'pending';
    perform public._alert(new.id, 'account', 'Your membership is approved', 'Welcome to SabraTech — the directory is open to you.', '/search');
  end if;
  return null;
end;
$$;
revoke execute on function public.profiles_after_update() from public, anonymous, authenticated;

-- ---------- 2. leadership requests ----------
alter table public.business_members add column if not exists requested_role text not null default 'employee';
alter table public.business_members drop constraint if exists business_members_requested_role_chk;
alter table public.business_members add constraint business_members_requested_role_chk
  check (requested_role in ('manager','employee'));

drop function if exists public.request_join_business(bigint);
create or replace function public.request_join_business(bid bigint, as_leader boolean default false) returns text
language plpgsql security definer set search_path = public
as $$
declare uid text := auth.user_id(); b public.talents; who text; want text := case when as_leader then 'manager' else 'employee' end;
begin
  if uid is null then raise exception 'Please log in first'; end if;
  if not exists (select 1 from public.profiles where id = uid and status = 'approved') then
    raise exception 'Your membership must be approved before you can join a business';
  end if;
  select * into b from public.talents where id = bid and type = 'company';
  if b.id is null then raise exception 'Business not found'; end if;
  if exists (select 1 from public.business_members where business_id = bid and user_id = uid and status = 'approved') then
    raise exception 'You are already on this team';
  end if;
  if exists (select 1 from public.business_members where business_id = bid and user_id = uid and status = 'pending' and requested_role = want) then
    return 'pending';  -- already asked; don't alert the owner twice
  end if;
  insert into public.business_members (business_id, user_id, role, requested_role, status)
  values (bid, uid, 'employee', want, 'pending')
  on conflict (business_id, user_id) do update
     set status = 'pending', role = 'employee', requested_role = want, created_at = now(), decided_at = null, decided_by = null;
  select coalesce(nullif(full_name, ''), email) into who from public.profiles where id = uid;
  if as_leader then
    perform public._alert(b.owner_id, 'join_requests', who || ' asked to join ' || b.name || ' as company leadership', 'Approve them as a manager or as an employee.', '/profile?tab=businesses');
    if b.owner_id is null then
      perform public._alert_admins('join_requests', who || ' asked to join ' || b.name || ' as company leadership', 'This business has no owner — approve it in Admin.', '/admin');
    end if;
  else
    perform public._alert_business_editors(bid, 'join_requests', who || ' asked to join ' || b.name, null, '/profile?tab=businesses');
  end if;
  return 'pending';
end;
$$;

drop function if exists public.respond_join_request(bigint, boolean);
create or replace function public.respond_join_request(member_id bigint, approve boolean, as_role text default null) returns void
language plpgsql security definer set search_path = public
as $$
declare m public.business_members; bname text; r text; can_lead boolean;
begin
  select * into m from public.business_members where id = member_id;
  if m.id is null then raise exception 'Request not found'; end if;
  if not public.is_business_editor(m.business_id) then raise exception 'Only the business owner or a manager can do that'; end if;
  if m.status <> 'pending' then return; end if;
  r := coalesce(as_role, m.requested_role, 'employee');
  if r not in ('manager','employee') then raise exception 'Role must be manager or employee'; end if;
  can_lead := public.is_admin() or exists (select 1 from public.talents where id = m.business_id and owner_id = auth.user_id());
  if approve and r = 'manager' and not can_lead then
    raise exception 'Only the owner can add a manager — you can approve them as an employee';
  end if;
  update public.business_members
     set status = case when approve then 'approved' else 'declined' end,
         role = case when approve then r else role end,
         decided_at = now(), decided_by = auth.user_id()
   where id = member_id;
  select name into bname from public.talents where id = m.business_id;
  perform public._alert(m.user_id, 'join_decisions',
    case when approve then 'You joined ' || bname || case when r = 'manager' then ' as a manager' else '' end
         else 'Your request to join ' || bname || ' was declined' end,
    null, '/profile?tab=businesses');
end;
$$;

drop function if exists public.business_members_detail(bigint);
create or replace function public.business_members_detail(bid bigint)
returns table (id bigint, user_id text, role text, requested_role text, status text, created_at timestamptz, member_name text, member_email text)
language sql stable security definer set search_path = public
as $$
  select m.id, m.user_id, m.role, m.requested_role, m.status, m.created_at,
         coalesce(nullif(p.full_name, ''), p.email, 'Member'), p.email
    from public.business_members m
    left join public.profiles p on p.id = m.user_id
   where m.business_id = bid and public.is_business_editor(bid)
   order by (m.status = 'pending') desc, (m.role = 'owner') desc, (m.role = 'manager') desc, m.created_at;
$$;

drop function if exists public.my_businesses();
create or replace function public.my_businesses()
returns table (business_id bigint, name text, title text, photo_url text, published boolean, listing_status text,
               member_id bigint, role text, requested_role text, status text, pending_requests bigint)
language sql stable security definer set search_path = public
as $$
  select t.id, t.name, t.title, t.photo_url, t.published, t.status, m.id, m.role, m.requested_role, m.status,
         (select count(*) from public.business_members x where x.business_id = t.id and x.status = 'pending')
    from public.business_members m
    join public.talents t on t.id = m.business_id
   where m.user_id = auth.user_id() and m.status <> 'declined'
   order by (m.role = 'owner') desc, t.name;
$$;

revoke execute on function public.request_join_business(bigint, boolean)      from public, anonymous;
revoke execute on function public.respond_join_request(bigint, boolean, text)  from public, anonymous;
revoke execute on function public.business_members_detail(bigint)             from public, anonymous;
revoke execute on function public.my_businesses()                             from public, anonymous;
grant execute on function public.request_join_business(bigint, boolean)       to authenticated;
grant execute on function public.respond_join_request(bigint, boolean, text)   to authenticated;
grant execute on function public.business_members_detail(bigint)              to authenticated;
grant execute on function public.my_businesses()                              to authenticated;

notify pgrst, 'reload schema';
