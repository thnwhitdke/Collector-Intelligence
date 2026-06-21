alter table external_release_reference_items
add column if not exists collection_era text;

alter table external_release_reference_items
add column if not exists source_label text;

update external_release_reference_items
set
  collection_era = 'legacy_collection',
  source_label = 'Joe Legacy Collection'
where source_file = 'thnwhitdke-collection-20260621-1620.csv';

drop materialized view if exists legacy_recovery_summary;
drop materialized view if exists legacy_release_recovery;
drop materialized view if exists legacy_artist_intelligence;

create materialized view legacy_artist_intelligence as
select
  artist,
  count(*) as observations,
  count(distinct discogs_release_id) as legacy_unique_releases,
  round(count(*)::numeric / nullif(count(distinct discogs_release_id), 0), 2) as repeat_factor
from external_release_reference_items
where collection_era = 'legacy_collection'
group by artist;

create materialized view legacy_release_recovery as
with legacy as (
  select
    discogs_release_id::text as discogs_release_id,
    max(artist) as artist,
    max(title) as title,
    max(released_year) as released_year
  from external_release_reference_items
  where collection_era = 'legacy_collection'
    and discogs_release_id is not null
  group by discogs_release_id
),
current_collection as (
  select distinct discogs_release_id::text as discogs_release_id
  from records_clean_safe
  where discogs_release_id is not null
    and trim(discogs_release_id::text) <> ''
)
select
  l.discogs_release_id,
  l.artist,
  l.title,
  nullif(l.released_year, 0) as released_year,
  case when c.discogs_release_id is not null then true else false end as recovered
from legacy l
left join current_collection c
  on c.discogs_release_id = l.discogs_release_id;

create materialized view legacy_recovery_summary as
select
  count(*) as legacy_unique_releases,
  count(*) filter (where recovered = true) as recovered_releases,
  count(*) filter (where recovered = false) as missing_releases,
  round(
    100.0 * count(*) filter (where recovered = true) / nullif(count(*), 0),
    2
  ) as recovery_rate_percent
from legacy_release_recovery;

create unique index if not exists legacy_release_recovery_release_idx
on legacy_release_recovery(discogs_release_id);

create index if not exists legacy_artist_intelligence_artist_idx
on legacy_artist_intelligence(artist);
