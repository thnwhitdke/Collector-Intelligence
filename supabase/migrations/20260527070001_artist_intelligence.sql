create table if not exists artist_metrics (
  artist_id uuid primary key references artists(id) on delete cascade,

  total_records integer default 0,
  style_count integer default 0,
  genre_count integer default 0,

  portfolio_share numeric,
  style_diversity numeric,

  calculated_at timestamptz default now()
);

create index if not exists idx_artist_metrics_share
on artist_metrics(portfolio_share desc);
