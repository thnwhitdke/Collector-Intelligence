create table if not exists genres (
  id uuid primary key default gen_random_uuid(),
  genre_name text unique not null,
  created_at timestamptz default now()
);

create table if not exists styles (
  id uuid primary key default gen_random_uuid(),
  style_name text unique not null,
  created_at timestamptz default now()
);

alter table records_clean_safe
add column if not exists genre_id uuid;

alter table records_clean_safe
add column if not exists style_id uuid;

create index if not exists idx_genres_name
on genres(genre_name);

create index if not exists idx_styles_name
on styles(style_name);

create index if not exists idx_records_genre_id
on records_clean_safe(genre_id);

create index if not exists idx_records_style_id
on records_clean_safe(style_id);
