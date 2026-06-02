-- Collector Intelligence Moat Build
-- Phase I: Market History Lake
-- Defensive migration: supports existing older market_history tables.

create table if not exists public.market_history (
  id uuid primary key default gen_random_uuid()
);

alter table public.market_history
  alter column record_id type bigint using nullif(record_id::text, '')::bigint;

alter table public.market_history
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists record_id bigint references public.records_clean_safe(id) on delete cascade,
  add column if not exists discogs_release_id bigint,
  add column if not exists source text not null default 'discogs',
  add column if not exists low_price numeric,
  add column if not exists median_price numeric,
  add column if not exists high_price numeric,
  add column if not exists estimated_value numeric,
  add column if not exists for_sale_count integer,
  add column if not exists last_sold_price numeric,
  add column if not exists last_sold_at timestamptz,
  add column if not exists currency text default 'USD',
  add column if not exists confidence numeric,
  add column if not exists rarity_score numeric,
  add column if not exists market_momentum numeric,
  add column if not exists raw_payload jsonb,
  add column if not exists captured_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

create index if not exists market_history_user_id_idx
  on public.market_history(user_id);

create index if not exists market_history_record_id_idx
  on public.market_history(record_id);

create index if not exists market_history_discogs_release_id_idx
  on public.market_history(discogs_release_id);

create index if not exists market_history_captured_at_idx
  on public.market_history(captured_at desc);

create index if not exists market_history_user_record_captured_idx
  on public.market_history(user_id, record_id, captured_at desc);

alter table public.market_history enable row level security;

drop policy if exists "Users can view their own market history" on public.market_history;
create policy "Users can view their own market history"
  on public.market_history
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own market history" on public.market_history;
create policy "Users can insert their own market history"
  on public.market_history
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own market history" on public.market_history;
create policy "Users can update their own market history"
  on public.market_history
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own market history" on public.market_history;
create policy "Users can delete their own market history"
  on public.market_history
  for delete
  using (auth.uid() = user_id);

comment on table public.market_history is
  'Collector Intelligence proprietary market memory table. Stores append-only market snapshots over time for pricing, supply, rarity, and momentum intelligence.';

comment on column public.market_history.captured_at is
  'Moment the market snapshot was captured. This powers trend, volatility, and market memory intelligence.';
