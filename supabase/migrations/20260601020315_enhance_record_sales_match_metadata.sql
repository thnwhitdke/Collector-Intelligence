-- RAGE Phase 9: Pressing-aware match metadata

alter table public.record_sales_matches
add column if not exists candidate_rank integer;

alter table public.record_sales_matches
add column if not exists candidate_group_key text;

alter table public.record_sales_matches
add column if not exists match_signals jsonb not null default '[]'::jsonb;

alter table public.record_sales_matches
add column if not exists is_best_candidate boolean not null default false;

alter table public.record_sales_matches
add column if not exists reviewed_at timestamptz;

alter table public.record_sales_matches
add column if not exists review_note text;

create index if not exists idx_record_sales_matches_sale_rank
on public.record_sales_matches(normalized_sale_id, candidate_rank);

create index if not exists idx_record_sales_matches_best_candidate
on public.record_sales_matches(normalized_sale_id, is_best_candidate);
