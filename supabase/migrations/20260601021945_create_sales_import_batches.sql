-- RAGE Phase 10: Sales Import Batch Tracking

create table if not exists public.sales_import_batches (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete cascade,

  source_key text not null,
  original_filename text,
  import_status text not null default 'pending',

  total_rows integer not null default 0,
  inserted_rows integer not null default 0,
  failed_rows integer not null default 0,
  normalized_rows integer not null default 0,
  matched_rows integer not null default 0,

  notes text,
  error_message text,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.sales_import_batches
enable row level security;

drop policy if exists "Users can read own sales import batches"
on public.sales_import_batches;

create policy "Users can read own sales import batches"
on public.sales_import_batches
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own sales import batches"
on public.sales_import_batches;

create policy "Users can insert own sales import batches"
on public.sales_import_batches
for insert
to authenticated
with check (user_id = auth.uid());

create index if not exists idx_sales_import_batches_user_created
on public.sales_import_batches(user_id, created_at desc);

create index if not exists idx_sales_import_batches_source_status
on public.sales_import_batches(source_key, import_status);
