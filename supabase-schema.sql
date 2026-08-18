-- עצמאיות באטלנטה: סכמת דאטהבייס
create table if not exists public.businesses (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  name text not null,
  category text default 'אחר',
  description text default '',
  contact_name text default '',
  phone text default '',
  email text default '',
  whatsapp text default '',
  website text default '',
  facebook text default '',
  instagram text default '',
  address text default '',
  lat double precision,
  lng double precision,
  image_url text default '',
  offer text default '',
  show_phone boolean default false,
  show_email boolean default false,
  published boolean default true
);

create table if not exists public.submissions (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  business_name text,
  contact_name text,
  category text,
  description text,
  phone text,
  email text,
  whatsapp text,
  website text,
  facebook text,
  instagram text,
  address text,
  offer text,
  category_other text default '',
  image_url text default '',
  show_phone boolean default false,
  show_email boolean default false,
  status text default 'pending'
);

alter table public.businesses enable row level security;
alter table public.submissions enable row level security;

create policy "public_read_published" on public.businesses for select using (published = true);
create policy "admin_all_businesses" on public.businesses for all to authenticated using (true) with check (true);
create policy "anyone_can_submit" on public.submissions for insert with check (true);
create policy "admin_read_submissions" on public.submissions for select to authenticated using (true);
create policy "admin_update_submissions" on public.submissions for update to authenticated using (true);

-- אחסון תמונות לעסקים
insert into storage.buckets (id, name, public) values ('business-images', 'business-images', true)
on conflict (id) do nothing;
create policy "anyone_upload_business_images" on storage.objects for insert with check (bucket_id = 'business-images');
create policy "public_read_business_images" on storage.objects for select using (bucket_id = 'business-images');
