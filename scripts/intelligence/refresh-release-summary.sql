create table if not exists release_reference_summary (
  id bigserial primary key,
  summary_date date not null default current_date,
  source text not null,
  total_releases bigint not null,
  countries bigint,
  artists bigint,
  labels bigint,
  genres bigint,
  styles bigint,
  created_at timestamptz not null default now(),
  unique(summary_date, source)
);

insert into release_reference_summary (
  summary_date,
  source,
  total_releases,
  countries,
  artists,
  labels,
  genres,
  styles
)
select
  current_date,
  source,
  count(*) as total_releases,
  count(distinct country) as countries,
  count(distinct artist) as artists,
  count(distinct label) as labels,
  count(distinct genres::text) as genres,
  count(distinct styles::text) as styles
from release_reference
group by source
on conflict (summary_date, source)
do update set
  total_releases = excluded.total_releases,
  countries = excluded.countries,
  artists = excluded.artists,
  labels = excluded.labels,
  genres = excluded.genres,
  styles = excluded.styles,
  created_at = now();
