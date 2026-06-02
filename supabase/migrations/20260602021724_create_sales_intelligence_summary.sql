-- Collector Intelligence Moat Build
-- Phase II-B: Sales Intelligence Summary
-- Purpose: summarize matched historical sales into record-level sold-market intelligence.

create table if not exists public.sales_intelligence_summary (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete cascade,
  record_id bigint references public.records_clean_safe(id) on delete cascade,

  matched_sales_count integer not null default 0,
  accepted_sales_count integer not null default 0,
  best_candidate_sales_count integer not null default 0,

  lowest_sale_price numeric,
  median_sale_price numeric,
  average_sale_price numeric,
  highest_sale_price numeric,
  last_sale_price numeric,
  last_sale_date date,

  currency text default 'USD',

  average_match_score numeric,
  highest_match_score integer,
  confidence_label text,
  confidence_score numeric,

  source_mix jsonb,
  price_samples jsonb,

  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(record_id)
);

create index if not exists sales_intelligence_summary_user_id_idx
  on public.sales_intelligence_summary(user_id);

create index if not exists sales_intelligence_summary_record_id_idx
  on public.sales_intelligence_summary(record_id);

create index if not exists sales_intelligence_summary_median_sale_price_idx
  on public.sales_intelligence_summary(median_sale_price desc);

create index if not exists sales_intelligence_summary_confidence_score_idx
  on public.sales_intelligence_summary(confidence_score desc);

alter table public.sales_intelligence_summary enable row level security;

drop policy if exists "Users can view their own sales intelligence summary" on public.sales_intelligence_summary;
create policy "Users can view their own sales intelligence summary"
  on public.sales_intelligence_summary
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own sales intelligence summary" on public.sales_intelligence_summary;
create policy "Users can insert their own sales intelligence summary"
  on public.sales_intelligence_summary
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own sales intelligence summary" on public.sales_intelligence_summary;
create policy "Users can update their own sales intelligence summary"
  on public.sales_intelligence_summary
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own sales intelligence summary" on public.sales_intelligence_summary;
create policy "Users can delete their own sales intelligence summary"
  on public.sales_intelligence_summary
  for delete
  using (auth.uid() = user_id);

comment on table public.sales_intelligence_summary is
  'Record-level historical sold-market intelligence derived from matched sales comps. Powers true comp valuation, confidence scoring, and future market behavior analytics.';
