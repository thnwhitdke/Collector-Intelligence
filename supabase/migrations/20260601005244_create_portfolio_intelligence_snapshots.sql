-- RAGE Phase 2: Portfolio Intelligence Snapshot Layer

create table if not exists public.portfolio_intelligence_snapshots (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,

  total_records integer not null default 0,
  total_collection_value numeric not null default 0,
  average_record_value numeric not null default 0,
  average_collector_iq numeric not null default 0,

  high_value_records integer not null default 0,
  elite_value_records integer not null default 0,

  average_demand_score numeric not null default 0,
  average_supply_pressure numeric not null default 0,
  average_volatility_score numeric not null default 0,
  average_rarity_score numeric not null default 0,

  accelerating_records integer not null default 0,
  volatile_records integer not null default 0,
  high_demand_records integer not null default 0,

  country_distribution jsonb not null default '[]'::jsonb,
  genre_distribution jsonb not null default '[]'::jsonb,
  top_records jsonb not null default '[]'::jsonb,

  snapshot_reason text not null default 'scheduled_recompute',
  created_at timestamptz not null default now()
);

alter table public.portfolio_intelligence_snapshots
enable row level security;

drop policy if exists "Users can read own portfolio intelligence snapshots"
on public.portfolio_intelligence_snapshots;

create policy "Users can read own portfolio intelligence snapshots"
on public.portfolio_intelligence_snapshots
for select
to authenticated
using (auth.uid() = user_id);

create index if not exists idx_portfolio_intelligence_snapshots_user_created
on public.portfolio_intelligence_snapshots(user_id, created_at desc);
