-- RAGE Phase 5: Portfolio Confidence + Explainability

alter table public.portfolio_intelligence_snapshots
add column if not exists intelligence_confidence_score integer not null default 0;

alter table public.portfolio_intelligence_snapshots
add column if not exists intelligence_confidence_label text not null default 'Unknown';

alter table public.portfolio_intelligence_snapshots
add column if not exists intelligence_summary text not null default 'No intelligence summary available yet.';

alter table public.portfolio_intelligence_snapshots
add column if not exists intelligence_reasons jsonb not null default '[]'::jsonb;
