alter table public.track_mood_intelligence
add column if not exists comfort_score integer not null default 0;

alter table public.track_mood_intelligence
add column if not exists warmth_score integer not null default 0;

alter table public.track_mood_intelligence
add column if not exists familiarity_score integer not null default 0;

create index if not exists idx_track_mood_comfort
on public.track_mood_intelligence (comfort_score desc);

create index if not exists idx_track_mood_warmth
on public.track_mood_intelligence (warmth_score desc);

create index if not exists idx_track_mood_familiarity
on public.track_mood_intelligence (familiarity_score desc);
