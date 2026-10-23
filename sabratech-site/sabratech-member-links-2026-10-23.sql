-- ============================================================
-- SabraTech — person ↔ business links (2026-10-23)
-- Which published businesses each published person belongs to (approved
-- team members only). Read by the person's page to show business pills.
-- Idempotent.
-- ============================================================
create or replace view public.member_businesses as
select i.id as individual_id, b.id as business_id, b.name as business_name,
       b.photo_url as business_photo, m.role
  from public.business_members m
  join public.talents b on b.id = m.business_id and b.published and b.type = 'company'
  join public.talents i on i.owner_id = m.user_id and i.type = 'individual' and i.published
 where m.status = 'approved';
grant select on public.member_businesses to authenticated;
notify pgrst, 'reload schema';
