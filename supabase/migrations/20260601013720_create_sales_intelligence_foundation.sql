-- RAGE Phase 7: Sales Intelligence Ingestion Foundation

create table if not exists public.external_sales_sources (
  id bigserial primary key,
  source_key text not null unique,
  source_name text not null,
  source_type text not null default 'manual',
  source_url text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.raw_sales_observations (
  id bigserial primary key,
  source_id bigint references public.external_sales_sources(id) on delete set null,
  source_key text not null,

  external_sale_id text,
  external_url text,

  raw_artist text,
  raw_title text,
  raw_label text,
  raw_catalog_number text,
  raw_format text,
  raw_country text,
  raw_year text,
  raw_condition text,
  raw_description text,

  sale_price numeric,
  sale_currency text default 'USD',
  sale_date date,

  raw_payload jsonb not null default '{}'::jsonb,

  imported_by uuid references auth.users(id) on delete set null,
  import_batch_id uuid default gen_random_uuid(),

  normalization_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.normalized_sales_comps (
  id bigserial primary key,
  raw_observation_id bigint references public.raw_sales_observations(id) on delete cascade,

  normalized_artist text,
  normalized_title text,
  normalized_label text,
  normalized_catalog_number text,
  normalized_format text,
  normalized_country text,
  normalized_year integer,

  sale_price numeric,
  sale_currency text default 'USD',
  sale_date date,

  source_key text not null,
  external_url text,

  normalized_confidence_score integer not null default 0,
  normalized_confidence_label text not null default 'Unknown',

  created_at timestamptz not null default now()
);

create table if not exists public.record_sales_matches (
  id bigserial primary key,

  record_id bigint references public.records_clean_safe(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,

  normalized_sale_id bigint references public.normalized_sales_comps(id) on delete cascade,

  match_score integer not null default 0,
  match_confidence_label text not null default 'Unknown',
  match_reason text,
  matched_by text not null default 'system',

  accepted boolean not null default false,
  rejected boolean not null default false,

  created_at timestamptz not null default now(),

  unique(record_id, normalized_sale_id)
);

alter table public.raw_sales_observations enable row level security;
alter table public.normalized_sales_comps enable row level security;
alter table public.record_sales_matches enable row level security;

drop policy if exists "Users can read own raw sales observations"
on public.raw_sales_observations;

create policy "Users can read own raw sales observations"
on public.raw_sales_observations
for select
to authenticated
using (imported_by = auth.uid());

drop policy if exists "Users can insert own raw sales observations"
on public.raw_sales_observations;

create policy "Users can insert own raw sales observations"
on public.raw_sales_observations
for insert
to authenticated
with check (imported_by = auth.uid());

drop policy if exists "Users can read own record sales matches"
on public.record_sales_matches;

create policy "Users can read own record sales matches"
on public.record_sales_matches
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can update own record sales matches"
on public.record_sales_matches;

create policy "Users can update own record sales matches"
on public.record_sales_matches
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create index if not exists idx_raw_sales_source_key
on public.raw_sales_observations(source_key);

create index if not exists idx_raw_sales_imported_by
on public.raw_sales_observations(imported_by);

create index if not exists idx_raw_sales_sale_date
on public.raw_sales_observations(sale_date desc);

create index if not exists idx_normalized_sales_artist_title
on public.normalized_sales_comps(normalized_artist, normalized_title);

create index if not exists idx_normalized_sales_source_date
on public.normalized_sales_comps(source_key, sale_date desc);

create index if not exists idx_record_sales_matches_record
on public.record_sales_matches(record_id);

create index if not exists idx_record_sales_matches_user
on public.record_sales_matches(user_id);

insert into public.external_sales_sources (
  source_key,
  source_name,
  source_type,
  source_url,
  notes
)
values
  (
    'popsike',
    'Popsike',
    'manual_or_licensed_reference',
    'https://www.popsike.com',
    'Historical collectible vinyl sales reference source. Use only according to account permissions and applicable terms.'
  ),
  (
    'manual_comp',
    'Manual Comparable Sale',
    'manual',
    null,
    'User-entered comparable sales evidence.'
  )
on conflict (source_key) do nothing;
