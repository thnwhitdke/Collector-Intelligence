drop view if exists public.intelligence_leaderboard_v2;
drop view if exists public.portfolio_intelligence_v2;
drop view if exists public.ci_intelligence_engine_v2;

create view public.ci_intelligence_engine_v2 as
select
  r.id as record_id,
  r.user_id,
  r.artist,
  r.title,
  r.discogs_release_id,

  r.market_consensus_value,
  r.market_low_price,
  r.market_median_price,
  r.market_high_price,
  r.market_num_for_sale,
  r.market_for_sale_ratio,
  r.market_trend,
  r.market_momentum,

  coalesce(e.auction_count, 0) as auction_count,
  e.median_price as auction_median_price,
  e.avg_price as auction_avg_price,
  e.low_price as auction_low_price,
  e.high_price as auction_high_price,
  e.latest_sale as auction_latest_sale,

  round(
    least(100,
      greatest(0,
        case
          when coalesce(e.auction_count,0) >= 25 then 40
          when coalesce(e.auction_count,0) >= 15 then 32
          when coalesce(e.auction_count,0) >= 8 then 24
          when coalesce(e.auction_count,0) >= 3 then 16
          when coalesce(e.auction_count,0) >= 1 then 8
          else 0
        end
        + case
            when coalesce(r.market_consensus_value,0) >= 1000 then 35
            when coalesce(r.market_consensus_value,0) >= 500 then 28
            when coalesce(r.market_consensus_value,0) >= 250 then 20
            when coalesce(r.market_consensus_value,0) >= 100 then 12
            when coalesce(r.market_consensus_value,0) >= 50 then 7
            when coalesce(r.market_consensus_value,0) > 0 then 3
            else 0
          end
        + case
            when coalesce(r.market_num_for_sale,999999) <= 1 then 15
            when coalesce(r.market_num_for_sale,999999) <= 5 then 10
            when coalesce(r.market_num_for_sale,999999) <= 15 then 5
            else 0
          end
      )
    )::numeric, 2
  ) as demand_score_v2,

  round(
    least(100,
      greatest(0,
        case
          when r.market_num_for_sale is null then 35
          when r.market_num_for_sale = 0 then 95
          when r.market_num_for_sale <= 1 then 90
          when r.market_num_for_sale <= 2 then 85
          when r.market_num_for_sale <= 5 then 75
          when r.market_num_for_sale <= 10 then 60
          when r.market_num_for_sale <= 25 then 45
          when r.market_num_for_sale <= 75 then 30
          else 15
        end
        + case
            when coalesce(r.market_consensus_value,0) >= 1000 then 5
            when coalesce(r.market_consensus_value,0) >= 500 then 4
            when coalesce(r.market_consensus_value,0) >= 250 then 3
            when coalesce(r.market_consensus_value,0) >= 100 then 2
            else 0
          end
        - case
            when coalesce(e.auction_count,0) >= 25 then 10
            when coalesce(e.auction_count,0) >= 15 then 7
            when coalesce(e.auction_count,0) >= 8 then 4
            else 0
          end
      )
    )::numeric, 2
  ) as rarity_score_v2,

  round(
    least(100,
      greatest(0,
        35
        + case
            when coalesce(e.auction_count,0) >= 25 then 25
            when coalesce(e.auction_count,0) >= 15 then 20
            when coalesce(e.auction_count,0) >= 8 then 14
            when coalesce(e.auction_count,0) >= 3 then 8
            when coalesce(e.auction_count,0) >= 1 then 4
            else 0
          end
        + case
            when e.latest_sale >= current_date - interval '90 days' then 20
            when e.latest_sale >= current_date - interval '180 days' then 14
            when e.latest_sale >= current_date - interval '365 days' then 8
            else 0
          end
        + case
            when r.market_trend ilike '%up%' or r.market_momentum ilike '%rising%' then 15
            when r.market_trend ilike '%down%' or r.market_momentum ilike '%falling%' then -15
            else 0
          end
      )
    )::numeric, 2
  ) as momentum_score_v2,

  case
    when r.market_consensus_value is not null
      and coalesce(e.auction_count,0) >= 8
      and r.market_num_for_sale is not null
      then 'High'
    when r.market_consensus_value is not null
      and coalesce(e.auction_count,0) >= 3
      then 'Medium'
    when r.market_consensus_value is not null
      then 'Baseline'
    else 'Low'
  end as intelligence_confidence_v2,

  case
    when r.market_consensus_value is null then 'Missing consensus value'
    when coalesce(e.auction_count,0) >= 8 and r.market_num_for_sale is not null then 'Consensus + strong auction history + supply data'
    when coalesce(e.auction_count,0) >= 3 then 'Consensus + auction history'
    when r.market_num_for_sale is not null then 'Consensus + supply data'
    else 'Consensus only'
  end as intelligence_reason_v2,

  now() as calculated_at

from public.records_clean_safe r
left join public.external_market_comp_summary e
  on e.record_id = r.id;

create view public.portfolio_intelligence_v2 as
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

create view public.intelligence_leaderboard_v2 as
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
