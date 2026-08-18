-- עדכון 1: קטגוריות וטקסטים ניתנים לעריכה
create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  sort int default 100
);
create table if not exists public.site_content (
  key text primary key,
  value text default ''
);
alter table public.categories enable row level security;
alter table public.site_content enable row level security;
create policy "public_read_categories" on public.categories for select using (true);
create policy "admin_all_categories" on public.categories for all to authenticated using (true) with check (true);
create policy "public_read_content" on public.site_content for select using (true);
create policy "admin_all_content" on public.site_content for all to authenticated using (true) with check (true);
