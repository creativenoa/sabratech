-- ============================================================
-- SabraTech — phone (push) alerts + Contact Us alerts (2026-10-23)
-- Run after sabratech-leadership-2026-10-22.sql. Idempotent.
-- ============================================================

-- One row per phone/browser a member turned alerts on for.
create table if not exists public.push_subscriptions (
  id         bigint generated always as identity primary key,
  user_id    text not null,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
grant select, insert, delete on public.push_subscriptions to authenticated;
grant usage, select on all sequences in schema public to authenticated;
drop policy if exists push_own on public.push_subscriptions;
create policy push_own on public.push_subscriptions
  for all to authenticated using (user_id = auth.user_id()) with check (user_id = auth.user_id());

-- Save this device for the logged-in member (takes the device over if another
-- member used it before — e.g. a shared family tablet).
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void language plpgsql security definer set search_path = public
as $$
declare uid text := auth.user_id();
begin
  if uid is null then raise exception 'Please log in first'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 200))
  on conflict (endpoint) do update set user_id = uid, p256dh = excluded.p256dh, auth = excluded.auth,
    user_agent = excluded.user_agent, created_at = now();
end;
$$;
revoke execute on function public.save_push_subscription(text, text, text, text) from public, anonymous;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

-- Server-only key store (the push signing keys). No grants, no policies:
-- invisible to the website's visitors; only the server functions read it.
create table if not exists public.app_secrets (
  key        text primary key,
  value      jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from public, anonymous, authenticated;

-- Push queue marker: each alert is pushed at most once.
alter table public.notifications add column if not exists pushed_at timestamptz;
create index if not exists notifications_push_queue on public.notifications (created_at) where pushed_at is null;
-- Alerts that existed before phone alerts were switched on are not sent.
update public.notifications set pushed_at = coalesce(pushed_at, now()) where pushed_at is null;

-- Contact Us messages alert every admin (bell + phone), so a second admin
-- hears about them even before email sending is set up.
create or replace function public.contact_after_insert() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public._alert_admins('admin_alerts',
    'New Contact Us message from ' || coalesce(nullif(trim(coalesce(new.first_name,'') || ' ' || coalesce(new.last_name,'')), ''), new.name, 'a visitor'),
    left(coalesce(new.message, ''), 140), '/admin');
  return null;
end;
$$;
revoke execute on function public.contact_after_insert() from public, anonymous, authenticated;
drop trigger if exists contact_after_insert_trg on public.contact_inquiries;
create trigger contact_after_insert_trg after insert on public.contact_inquiries
  for each row execute function public.contact_after_insert();

notify pgrst, 'reload schema';
