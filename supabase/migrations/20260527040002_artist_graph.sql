-- ==========================================
-- CIU Artist Intelligence Layer
-- Phase 1 Knowledge Graph
-- ==========================================

create table if not exists artists (
  id uuid primary key default gen_random_uuid(),

  artist_name text unique not null,

  discogs_artist_id bigint,

  country text,

  artist_iq_score numeric default 50,

  momentum_score numeric default 0,

  release_count integer default 0,

  created_at timestamptz default now()
);

alter table records_clean_safe
add column if not exists artist_id uuid;

create index if not exists idx_artists_name
on artists (artist_name);

create index if not exists idx_records_artist_id
on records_clean_safe (artist_id);
