-- עדכון 2: מיקום וזום לתמונה הראשית
alter table public.businesses
  add column if not exists image_pos_x int default 50,
  add column if not exists image_pos_y int default 50,
  add column if not exists image_zoom numeric default 1;
