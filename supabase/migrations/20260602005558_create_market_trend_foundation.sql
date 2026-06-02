-- Collector Intelligence Moat Build
-- Phase I-B: Market Trend Foundation
-- Purpose: convert market_history memory into derived market movement signals.

create table if not exists public.market_trend_signals (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete cascade,
  record_id bigint references public.records_clean_safe(id) on delete cascade,

  latest_history_id bigint references public.market_history(id) on delete cascade,
  previous_history_id bigint references public.market_history(id) on delete set null,

  source text not null default 'market_history',

  latest_estimated_value numeric,
  previous_estimated_value numeric,
  price_delta numeric,
  price_delta_percent numeric,

  latest_for_sale_count integer,
  previous_for_sale_count integer,
  supply_delta integer,
  supply_delta_percent numeric,

  market_momentum numeric,
  volatility_seed numeric,

  signal_label text,
  signal_strength text,

  change_detected boolean not null default false,

  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(record_id)
);

create index if not exists market_trend_signals_user_id_idx
  on public.market_trend_signals(user_id);

create index if not exists market_trend_signals_record_id_idx
  on public.market_trend_signals(record_id);

create index if not exists market_trend_signals_momentum_idx
  on public.market_trend_signals(market_momentum desc);

create index if not exists market_trend_signals_calculated_at_idx
  on public.market_trend_signals(calculated_at desc);

alter table public.market_trend_signals enable row level security;

drop policy if exists "Users can view their own market trend signals" on public.market_trend_signals;
create policy "Users can view their own market trend signals"
  on public.market_trend_signals
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own market trend signals" on public.market_trend_signals;
create policy "Users can insert their own market trend signals"
  on public.market_trend_signals
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own market trend signals" on public.market_trend_signals;
create policy "Users can update their own market trend signals"
  on public.market_trend_signals
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own market trend signals" on public.market_trend_signals;
create policy "Users can delete their own market trend signals"
  on public.market_trend_signals
  for delete
  using (auth.uid() = user_id);

comment on table public.market_trend_signals is
  'Derived Collector Intelligence market movement signals calculated from market_history snapshots. Powers trend, volatility, top movers, and future ticker intelligence.';

comment on column public.market_trend_signals.market_momentum is
  'Composite directional score derived from price and supply movement. Positive suggests strengthening market pressure; negative suggests cooling.';
