create table if not exists public.warehouse_intelligence_runs (
  id bigserial primary key,
  engine text not null default 'warehouse_intelligence_v2',
  source_table text not null default 'discogs_master_reference',
  target_table text not null default 'warehouse_release_intelligence',
  status text not null default 'running',
  start_offset integer not null default 0,
  next_offset integer not null default 0,
  batch_size integer not null default 5000,
  batches_requested integer not null default 20,
  batches_completed integer not null default 0,
  rows_processed integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.warehouse_intelligence_progress (
  id integer primary key default 1,
  source_table text not null default 'discogs_master_reference',
  next_offset integer not null default 0,
  total_processed integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.warehouse_intelligence_progress (id, next_offset, total_processed)
values (1, 0, 0)
on conflict (id) do nothing;
