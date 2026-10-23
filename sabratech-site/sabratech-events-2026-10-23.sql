-- ============================================================
-- SabraTech — Events (2026-10-23)
-- Admins publish events; members suggest them; invite-only visibility
-- ("All members" or hand-picked); registration with optional seat limit;
-- optional attendee photos; alerts to invitees. Idempotent.
-- ============================================================

create table if not exists public.events (
  id             bigint generated always as identity primary key,
  title          text not null,
  description    text,
  starts_at      timestamptz not null,
  ends_at        timestamptz,
  location       text,
  online_url     text,
  image_url      text,
  capacity       integer check (capacity is null or capacity > 0),
  show_attendees boolean not null default false,
  invite_all     boolean not null default true,
  status         text not null default 'draft' check (status in ('draft','published','cancelled')),
  created_by     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists events_starts on public.events (starts_at);

create table if not exists public.event_invitees (
  event_id   bigint not null references public.events(id) on delete cascade,
  user_id    text not null,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists public.event_registrations (
  event_id   bigint not null references public.events(id) on delete cascade,
  user_id    text not null,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists public.event_suggestions (
  id          bigint generated always as identity primary key,
  user_id     text not null,
  title       text not null,
  description text,
  starts_at   timestamptz,
  location    text,
  link        text,
  image_url   text,
  status      text not null default 'new' check (status in ('new','used','dismissed')),
  created_at  timestamptz not null default now()
);

-- ---------- who can see an event ----------
create or replace function public.can_see_event(eid bigint) returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.events e
     where e.id = eid and e.status in ('published','cancelled')
       and exists (select 1 from public.profiles p where p.id = auth.user_id() and p.status = 'approved')
       and (e.invite_all or exists (select 1 from public.event_invitees i where i.event_id = e.id and i.user_id = auth.user_id())));
$$;

-- ---------- RLS ----------
alter table public.events              enable row level security;
alter table public.event_invitees      enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_suggestions   enable row level security;

grant select, insert, update, delete on public.events, public.event_invitees to authenticated;
grant select on public.event_registrations to authenticated;
grant select, insert on public.event_suggestions to authenticated;
grant update, delete on public.event_suggestions to authenticated;
grant usage, select on all sequences in schema public to authenticated;

drop policy if exists events_read on public.events;
drop policy if exists events_admin on public.events;
create policy events_read on public.events for select to authenticated using (public.can_see_event(id));
create policy events_admin on public.events for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists invitees_read on public.event_invitees;
drop policy if exists invitees_admin on public.event_invitees;
create policy invitees_read on public.event_invitees for select to authenticated using (user_id = auth.user_id() or public.is_admin());
create policy invitees_admin on public.event_invitees for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists regs_read on public.event_registrations;
create policy regs_read on public.event_registrations for select to authenticated using (user_id = auth.user_id() or public.is_admin());

drop policy if exists sugg_insert on public.event_suggestions;
drop policy if exists sugg_read on public.event_suggestions;
drop policy if exists sugg_admin on public.event_suggestions;
create policy sugg_insert on public.event_suggestions for insert to authenticated
  with check (user_id = auth.user_id() and status = 'new'
              and exists (select 1 from public.profiles p where p.id = auth.user_id() and p.status = 'approved'));
create policy sugg_read on public.event_suggestions for select to authenticated using (user_id = auth.user_id() or public.is_admin());
create policy sugg_admin on public.event_suggestions for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- the events page in one call ----------
create or replace function public.events_feed()
returns table (id bigint, title text, description text, starts_at timestamptz, ends_at timestamptz,
               location text, online_url text, image_url text, capacity integer, show_attendees boolean,
               status text, going_count bigint, i_am_going boolean)
language sql stable security definer set search_path = public
as $$
  select e.id, e.title, e.description, e.starts_at, e.ends_at, e.location, e.online_url, e.image_url,
         e.capacity, e.show_attendees, e.status,
         (select count(*) from public.event_registrations r where r.event_id = e.id),
         exists (select 1 from public.event_registrations r where r.event_id = e.id and r.user_id = auth.user_id())
    from public.events e
   where e.status in ('published','cancelled') and public.can_see_event(e.id)
   order by e.starts_at;
$$;

-- Small attendee photos (only when the admin switched it on, or for admins).
create or replace function public.event_attendees(eid bigint)
returns table (user_id text, name text, photo_url text, individual_id bigint)
language sql stable security definer set search_path = public
as $$
  select r.user_id,
         coalesce(case when i.id is not null then public._listing_name(i) end, nullif(p.full_name, ''), 'Member'),
         i.photo_url, case when i.published then i.id end
    from public.event_registrations r
    join public.events e on e.id = r.event_id
    left join public.profiles p on p.id = r.user_id
    left join public.talents i on i.owner_id = r.user_id and i.type = 'individual'
   where r.event_id = eid and public.can_see_event(eid) and (e.show_attendees or public.is_admin())
   order by r.created_at;
$$;

create or replace function public.register_event(eid bigint) returns text
language plpgsql security definer set search_path = public
as $$
declare uid text := auth.user_id(); e public.events; n integer;
begin
  if uid is null then raise exception 'Please log in first'; end if;
  if not public.can_see_event(eid) then raise exception 'Event not found'; end if;
  select * into e from public.events where id = eid for update;
  if e.status <> 'published' then raise exception 'This event is not open for registration'; end if;
  if coalesce(e.ends_at, e.starts_at) < now() then raise exception 'This event has already taken place'; end if;
  if exists (select 1 from public.event_registrations where event_id = eid and user_id = uid) then return 'registered'; end if;
  if e.capacity is not null then
    select count(*) into n from public.event_registrations where event_id = eid;
    if n >= e.capacity then raise exception 'Sorry — this event is full'; end if;
  end if;
  insert into public.event_registrations (event_id, user_id) values (eid, uid);
  return 'registered';
end;
$$;

create or replace function public.unregister_event(eid bigint) returns void
language sql security definer set search_path = public
as $$ delete from public.event_registrations where event_id = eid and user_id = auth.user_id(); $$;

-- ---------- alerts ----------
create or replace function public._event_when(e public.events) returns text
language sql immutable as $$ select to_char(e.starts_at at time zone 'America/New_York', 'Dy Mon FMDD, FMHH12:MI AM') $$;

create or replace function public.events_after_change() returns trigger
language plpgsql security definer set search_path = public
as $$
declare r record; link text := '/events?e=' || new.id;
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    for r in
      select p.id from public.profiles p
       where p.status = 'approved'
         and (new.invite_all or exists (select 1 from public.event_invitees i where i.event_id = new.id and i.user_id = p.id))
    loop
      perform public._alert(r.id, 'events', 'You''re invited: ' || new.title, public._event_when(new) || coalesce(' · ' || new.location, ''), link);
    end loop;
  elsif tg_op = 'UPDATE' and old.status = 'published' and new.status = 'cancelled' then
    for r in select user_id from public.event_registrations where event_id = new.id loop
      perform public._alert(r.user_id, 'events', 'Cancelled: ' || new.title, public._event_when(new), link);
    end loop;
  end if;
  return null;
end;
$$;
drop trigger if exists events_after_change_trg on public.events;
create trigger events_after_change_trg after insert or update of status on public.events
  for each row execute function public.events_after_change();

-- Someone added to the guest list of an already-published event gets invited too.
create or replace function public.event_invitee_added() returns trigger
language plpgsql security definer set search_path = public
as $$
declare e public.events;
begin
  select * into e from public.events where id = new.event_id;
  if e.status = 'published' and not e.invite_all then
    perform public._alert(new.user_id, 'events', 'You''re invited: ' || e.title, public._event_when(e) || coalesce(' · ' || e.location, ''), '/events?e=' || e.id);
  end if;
  return null;
end;
$$;
drop trigger if exists event_invitee_added_trg on public.event_invitees;
create trigger event_invitee_added_trg after insert on public.event_invitees
  for each row execute function public.event_invitee_added();

create or replace function public.event_suggested() returns trigger
language plpgsql security definer set search_path = public
as $$
declare who text;
begin
  select coalesce(nullif(full_name, ''), email) into who from public.profiles where id = new.user_id;
  perform public._alert_admins('admin_alerts', 'Event suggestion: ' || new.title, 'From ' || coalesce(who, 'a member'), '/admin');
  return null;
end;
$$;
drop trigger if exists event_suggested_trg on public.event_suggestions;
create trigger event_suggested_trg after insert on public.event_suggestions
  for each row execute function public.event_suggested();

-- ---------- function permissions ----------
revoke execute on function public.events_after_change() from public, anonymous, authenticated;
revoke execute on function public.event_invitee_added() from public, anonymous, authenticated;
revoke execute on function public.event_suggested()     from public, anonymous, authenticated;
revoke execute on function public.events_feed()             from public, anonymous;
revoke execute on function public.event_attendees(bigint)   from public, anonymous;
revoke execute on function public.register_event(bigint)    from public, anonymous;
revoke execute on function public.unregister_event(bigint)  from public, anonymous;
grant execute on function public.can_see_event(bigint)      to authenticated;
grant execute on function public.events_feed()              to authenticated;
grant execute on function public.event_attendees(bigint)    to authenticated;
grant execute on function public.register_event(bigint)     to authenticated;
grant execute on function public.unregister_event(bigint)   to authenticated;
grant execute on function public._event_when(public.events) to authenticated;

notify pgrst, 'reload schema';
