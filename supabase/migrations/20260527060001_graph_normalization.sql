create table if not exists record_genres (
  record_id bigint not null,
  genre_id uuid not null,
  primary key (record_id, genre_id)
);

create table if not exists record_styles (
  record_id bigint not null,
  style_id uuid not null,
  primary key (record_id, style_id)
);

create index if not exists idx_record_genres_record
on record_genres(record_id);

create index if not exists idx_record_genres_genre
on record_genres(genre_id);

create index if not exists idx_record_styles_record
on record_styles(record_id);

create index if not exists idx_record_styles_style
on record_styles(style_id);
