create or replace view artist_iq_leaderboard as
select
  a.id as artist_id,
  a.artist_name,
  am.total_records,
  am.style_count,
  am.genre_count,
  am.portfolio_share,
  am.rarity_score,
  am.neighbor_reach,
  am.artist_iq_score
from artist_metrics am
join artists a
  on a.id = am.artist_id
order by am.artist_iq_score desc;

create or replace view artist_dominance_view as
select
  a.id as artist_id,
  a.artist_name,
  am.total_records,
  round((am.portfolio_share * 100)::numeric,2) as portfolio_percent
from artist_metrics am
join artists a
  on a.id = am.artist_id
order by am.portfolio_share desc;

create or replace view artist_rarity_view as
select
  a.id as artist_id,
  a.artist_name,
  am.total_records,
  am.style_count,
  am.rarity_score
from artist_metrics am
join artists a
  on a.id = am.artist_id
order by am.rarity_score desc;

create or replace view artist_neighbor_reach_view as
select
  a.id as artist_id,
  a.artist_name,
  am.total_records,
  am.neighbor_reach
from artist_metrics am
join artists a
  on a.id = am.artist_id
order by am.neighbor_reach desc;
