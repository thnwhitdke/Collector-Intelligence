create or replace view public.portfolio_intelligence_v2 as
select
  user_id,
  count(*) as total_records,
  round(avg(demand_score_v2),2) as avg_demand_score,
  round(avg(rarity_score_v2),2) as avg_rarity_score,
  round(avg(momentum_score_v2),2) as avg_momentum_score,
  round(avg(market_consensus_value),2) as avg_record_value,
  round(sum(market_consensus_value),2) as portfolio_value
from public.ci_intelligence_engine_v2
group by user_id;

create or replace view public.intelligence_leaderboard_v2 as
select
  record_id,
  artist,
  title,
  market_consensus_value,
  demand_score_v2,
  rarity_score_v2,
  momentum_score_v2,
  intelligence_confidence_v2,
  intelligence_reason_v2
from public.ci_intelligence_engine_v2;
