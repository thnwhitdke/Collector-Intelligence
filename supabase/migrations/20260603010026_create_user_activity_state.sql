create table if not exists public.user_activity_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  last_seen_ops_at timestamptz,
  last_seen_collection_at timestamptz,
  last_seen_market_at timestamptz,
  last_seen_portfolio_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_activity_state
enable row level security;

drop policy if exists "Users can view their own activity state"
on public.user_activity_state;

create policy "Users can view their own activity state"
on public.user_activity_state
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own activity state"
on public.user_activity_state;

create policy "Users can insert their own activity state"
on public.user_activity_state
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own activity state"
on public.user_activity_state;

create policy "Users can update their own activity state"
on public.user_activity_state
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_user_activity_state_user_id
on public.user_activity_state(user_id);
