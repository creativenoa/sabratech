-- ============================================================
-- SabraTech — Israeli Tech Talent Directory of Atlanta
-- Run this once in the Supabase SQL Editor of the SabraTech project.
-- ============================================================

-- One table for both companies and individuals; `type` separates them.
create table if not exists public.talents (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  type text not null check (type in ('individual', 'company')),
  name text not null,                    -- person's full name / company name
  title text default '',                 -- individual: current role  | company: tagline
  company text default '',               -- individual: "at <company>"
  bio text default '',                   -- short bio summary (shown under the name)
  description text default '',           -- longer about text
  category text default 'Other',         -- e.g. Software, Data & AI, Cybersecurity...
  skills text[] default '{}',            -- filterable tech-stack tags
  linkedin text default '',
  website text default '',
  github text default '',
  email text default '',
  phone text default '',
  whatsapp text default '',
  address text default '',
  lat double precision,
  lng double precision,
  photo_url text default '',             -- headshot / company logo
  image_pos_x int default 50,
  image_pos_y int default 50,
  image_zoom numeric default 1,
  cv_url text default '',                -- individuals: downloadable CV
  cv_updated_at timestamptz,             -- shown as "CV last updated"
  open_to_work boolean default false,    -- individuals
  freelance boolean default false,       -- individuals
  hiring boolean default false,          -- companies
  show_phone boolean default false,
  show_email boolean default false,
  posts jsonb default '[]',              -- [{title,url,image}] recent posts (pre-blog)
  status text default 'pending',         -- pending | approved | rejected
  published boolean default false
);

create table if not exists public.sponsor_inquiries (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  name text not null,
  company text default '',
  email text not null,
  phone text default '',
  message text default '',
  status text default 'new'              -- new | contacted | closed
);

create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  sort int default 100
);

create table if not exists public.site_content (
  key text primary key,
  value text default ''
);

-- Seed tech categories (edit anytime in Admin)
insert into public.categories (name, sort) values
  ('Software Development', 10), ('Data & AI', 20), ('Cybersecurity', 30),
  ('Cloud & DevOps', 40), ('Product Management', 50), ('UX & Design', 60),
  ('IT & Support', 70), ('Fintech', 80), ('Marketing & Growth', 90),
  ('Sales & BizDev', 100), ('Hardware & IoT', 110), ('Other', 999)
on conflict (name) do nothing;

-- ---------- Row Level Security ----------
alter table public.talents enable row level security;
alter table public.sponsor_inquiries enable row level security;
alter table public.categories enable row level security;
alter table public.site_content enable row level security;

-- Public can read only approved+published profiles
create policy "public_read_published" on public.talents
  for select using (published = true);

-- Anyone can apply (row lands as pending + unpublished; column defaults enforce it)
create policy "anyone_can_apply" on public.talents
  for insert with check (published = false and status = 'pending');

-- Admin (authenticated) full control
create policy "admin_all_talents" on public.talents
  for all to authenticated using (true) with check (true);

create policy "anyone_can_inquire" on public.sponsor_inquiries
  for insert with check (true);
create policy "admin_all_sponsors" on public.sponsor_inquiries
  for all to authenticated using (true) with check (true);

create policy "public_read_categories" on public.categories for select using (true);
create policy "admin_all_categories" on public.categories
  for all to authenticated using (true) with check (true);

create policy "public_read_content" on public.site_content for select using (true);
create policy "admin_all_content" on public.site_content
  for all to authenticated using (true) with check (true);

-- ---------- Storage: photos + CVs ----------
insert into storage.buckets (id, name, public) values
  ('talent-photos', 'talent-photos', true),
  ('talent-cvs', 'talent-cvs', true)
on conflict (id) do nothing;

create policy "anyone_upload_photos" on storage.objects
  for insert with check (bucket_id = 'talent-photos');
create policy "public_read_photos" on storage.objects
  for select using (bucket_id = 'talent-photos');
create policy "anyone_upload_cvs" on storage.objects
  for insert with check (bucket_id = 'talent-cvs');
create policy "public_read_cvs" on storage.objects
  for select using (bucket_id = 'talent-cvs');
create policy "admin_manage_storage" on storage.objects
  for all to authenticated using (bucket_id in ('talent-photos','talent-cvs'))
  with check (bucket_id in ('talent-photos','talent-cvs'));
