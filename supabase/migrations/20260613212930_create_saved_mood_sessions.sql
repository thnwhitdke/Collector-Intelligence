create table if not exists public.saved_mood_sessions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null,

  title text not null,
  prompt text not null,
  mood text not null,
  reason text,
  estimated_runtime_seconds integer not null default 0,

  session_json jsonb not null,

  created_at timestamptz default now()
);

create index if not exists idx_saved_mood_sessions_user
on public.saved_mood_sessions (user_id);

create index if not exists idx_saved_mood_sessions_created
on public.saved_mood_sessions (created_at desc);
