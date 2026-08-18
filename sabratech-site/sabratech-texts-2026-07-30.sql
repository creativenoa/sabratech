-- ============================================================================
-- SabraTech — remove "talent" from user-facing copy. 2026-07-30
-- site_content overrides the defaults in src/lib/data.js, so these three rows
-- are what the live site actually renders. No deploy needed.
-- Upsert, so it works whether the key exists or not. Safe to re-run.
-- ============================================================================

insert into public.site_content (key, value) values
  ('home_featured_kicker', 'Featured'),

  ('footer_tagline', 'The Israeli entrepreneur, tech and AI directory of greater Atlanta'),

  ('about_body',
'SabraTech was created to map and connect the Israeli tech ecosystem of greater Atlanta — the founders, engineers, designers, product leaders, and startups that carry the startup-nation spirit into Georgia.

Whether you are an Israeli professional looking for your next role, a startup searching for an exceptional addition to their team, or a local partner who wants to work with Israeli innovators — this is where you find each other.')

on conflict (key) do update set value = excluded.value;

-- Verify — should return 3 rows, none containing the word "talent".
select key, value from public.site_content
where key in ('home_featured_kicker','footer_tagline','about_body')
order by key;
