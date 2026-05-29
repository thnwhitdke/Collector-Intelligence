alter table artist_metrics
add column if not exists rarity_score numeric;

alter table artist_metrics
add column if not exists neighbor_reach integer;

alter table artist_metrics
add column if not exists artist_iq_score numeric;
