alter table public.records_clean_safe
add column if not exists market_consensus_value numeric;

alter table public.records_clean_safe
add column if not exists market_consensus_confidence integer;

alter table public.records_clean_safe
add column if not exists market_consensus_source text;

alter table public.records_clean_safe
add column if not exists market_consensus_reason text;
