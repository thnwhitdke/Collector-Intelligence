create table if not exists public.track_mood_intelligence (
  id uuid primary key default gen_random_uuid(),

  discogs_release_id text not null,
  position text,
  title text not null,
  duration_seconds integer,
  duration_raw text,
  artist_credit text,

  mood text not null,
  confidence integer not null default 0,

  energy_score integer not null default 0,
  reflection_score integer not null default 0,
  grounding_score integer not null default 0,
  focus_score integer not null default 0,
  nostalgia_score integer not null default 0,
  experimental_score integer not null default 0,

  reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique (discogs_release_id, position, title)
);

create index if not exists idx_track_mood_release
on public.track_mood_intelligence (discogs_release_id);

create index if not exists idx_track_mood_mood
on public.track_mood_intelligence (mood);

create index if not exists idx_track_mood_confidence
on public.track_mood_intelligence (confidence desc);
