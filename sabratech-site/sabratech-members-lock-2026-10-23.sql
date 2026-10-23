-- 2026-10-23: members-only data lock.
-- Before: logged-out visitors (and pending members) could read the whole directory
-- straight from the database; the site only blurred it on screen.
-- After: directory views return rows only to APPROVED members. The public homepage
-- gets just the two counts through directory_counts().
-- Backup branch: backup-before-members-lock-2026-10-23

create or replace function public.is_approved_member()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.profiles where id = auth.user_id() and status = 'approved');
$$;

create or replace view public.talents_directory as
 SELECT id, created_at, type, name, first_name, last_name, title, company, bio, description,
    category, skills, linkedin, website, github,
    CASE WHEN show_email THEN email ELSE NULL::text END AS email,
    CASE WHEN show_phone THEN phone ELSE NULL::text END AS phone,
    CASE WHEN show_whatsapp THEN whatsapp ELSE NULL::text END AS whatsapp,
    CASE WHEN show_on_map THEN address ELSE NULL::text END AS address,
    CASE WHEN show_on_map THEN lat ELSE NULL::double precision END AS lat,
    CASE WHEN show_on_map THEN lng ELSE NULL::double precision END AS lng,
    photo_url, image_pos_x, image_pos_y, image_zoom, cv_url, cv_updated_at,
    open_to_work, freelance, hiring, show_phone, show_email, show_whatsapp, show_on_map,
    posts, status, published
   FROM talents
  WHERE published = true AND public.is_approved_member();

create or replace view public.business_team as
 SELECT m.business_id, m.role,
    COALESCE(CASE WHEN i.id IS NOT NULL THEN _listing_name(i.*) ELSE NULL::text END,
             NULLIF(p.full_name, ''::text), 'Member'::text) AS member_name,
    i.id AS individual_id, i.title AS member_title, i.photo_url AS member_photo
   FROM business_members m
     JOIN talents b ON b.id = m.business_id AND b.published
     JOIN profiles p ON p.id = m.user_id AND p.status = 'approved'::text
     LEFT JOIN talents i ON i.owner_id = m.user_id AND i.type = 'individual'::text AND i.published
  WHERE m.status = 'approved'::text AND public.is_approved_member();

create or replace view public.member_businesses as
 SELECT i.id AS individual_id, b.id AS business_id, b.name AS business_name,
    b.photo_url AS business_photo, m.role
   FROM business_members m
     JOIN talents b ON b.id = m.business_id AND b.published AND b.type = 'company'::text
     JOIN talents i ON i.owner_id = m.user_id AND i.type = 'individual'::text AND i.published
  WHERE m.status = 'approved'::text AND public.is_approved_member();

revoke select on public.talents_directory from anonymous;

-- Homepage stats only (numbers, no names).
create or replace function public.directory_counts()
returns json language sql stable security definer set search_path to 'public' as $$
  select json_build_object(
    'companies',   count(*) filter (where type = 'company'),
    'individuals', count(*) filter (where type = 'individual'))
  from public.talents where published = true;
$$;
grant execute on function public.directory_counts() to anonymous, authenticated;
grant execute on function public.is_approved_member() to anonymous, authenticated;
