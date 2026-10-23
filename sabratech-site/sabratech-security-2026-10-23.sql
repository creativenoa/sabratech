-- SabraTech security pass — 2026-10-23
-- Safe to run more than once. Run in the Neon SQL editor (production branch,
-- database neondb) as the same role DATABASE_URL uses (normally neondb_owner).
--
-- Why: /api/upload and /api/file now check the visitor's login on the server.
-- They do it by looking up the login cookie's session token in Neon Auth's own
-- table neon_auth.session (one quick query). That only works if the role in
-- DATABASE_URL may read that table. If it may not, the code silently falls back
-- to asking Neon Auth over HTTP (slower, but still correct) — so this file is a
-- speed-up and a check, not a requirement.
--
-- No table, column or row of SabraTech data is changed by this file.

-- 1) Check: can the current role read the session table? (expect: t, t)
select current_user                                                    as role,
       has_schema_privilege(current_user, 'neon_auth', 'USAGE')         as can_use_schema,
       has_table_privilege(current_user, 'neon_auth.session', 'SELECT') as can_read_sessions;

-- 2) If either value above is false, grant read access to the session table
--    (read-only; only the server-side DATABASE_URL role gets it — the browser's
--    Data API roles "anonymous"/"authenticated" are NOT given anything).
--    Wrapped so it does nothing when the privilege already exists, and simply
--    reports a notice if Neon does not allow the grant.
do $$
begin
  if not has_schema_privilege(current_user, 'neon_auth', 'USAGE') then
    execute format('grant usage on schema neon_auth to %I', current_user);
  end if;
  if not has_table_privilege(current_user, 'neon_auth.session', 'SELECT') then
    execute format('grant select on neon_auth.session to %I', current_user);
  end if;
exception when others then
  raise notice 'Could not grant read access to neon_auth.session (%). The site still works via the Neon Auth fallback.', sqlerrm;
end $$;

-- 3) Make sure the browser roles can NOT read login sessions (expect: f, f).
select has_table_privilege('anonymous', 'neon_auth.session', 'SELECT')     as anon_can_read_sessions,
       has_table_privilege('authenticated', 'neon_auth.session', 'SELECT') as authed_can_read_sessions;

-- 4) Info only: which stored file links exist, by kind. Every one of these is
--    shown through /api/file after the deploy (nothing in the database changes).
select 'talent photo' as kind, count(*) from public.talents where coalesce(photo_url, '') <> ''
union all
select 'talent CV', count(*) from public.talents where coalesce(cv_url, '') <> ''
union all
select 'non-Neon photo/CV links (shown unchanged, not protected)', count(*)
  from public.talents
 where (coalesce(photo_url, '') <> '' and photo_url not like '%neon.tech/%')
    or (coalesce(cv_url, '') <> '' and cv_url not like '%neon.tech/%');
