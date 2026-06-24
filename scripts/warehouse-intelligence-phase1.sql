create table if not exists public.warehouse_release_intelligence (
  id bigserial primary key,
  warehouse_release_id bigint unique,
  artist text,
  title text,
  label text,
  country text,
  released_year integer,
  warehouse_rarity_score numeric,
  artist_release_count integer,
  label_release_count integer,
  country_release_count integer,
  global_rank integer,
  collector_grade text,
  computed_at timestamptz default now()
);

create index if not exists warehouse_release_intelligence_release_id_idx
on public.warehouse_release_intelligence (warehouse_release_id);

create index if not exists warehouse_release_intelligence_rank_idx
on public.warehouse_release_intelligence (global_rank);

create index if not exists warehouse_release_intelligence_grade_idx
on public.warehouse_release_intelligence (collector_grade);
