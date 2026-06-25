create table if not exists research_interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  title text not null,
  participant_label text,
  role_label text,
  transcript_text text not null,
  created_at timestamptz default now()
);

create table if not exists research_segments (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid references research_interviews(id) on delete cascade,
  segment_number int not null,
  segment_text text not null,
  created_at timestamptz default now()
);

create table if not exists research_open_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  code_name text not null,
  code_type text default 'open',
  definition text,
  created_at timestamptz default now(),
  unique(user_id, code_name)
);

create table if not exists research_segment_codes (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid references research_segments(id) on delete cascade,
  code_id uuid references research_open_codes(id) on delete cascade,
  analytic_note text,
  created_at timestamptz default now(),
  unique(segment_id, code_id)
);

create table if not exists research_memos (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid references research_interviews(id) on delete cascade,
  segment_id uuid references research_segments(id) on delete set null,
  code_id uuid references research_open_codes(id) on delete set null,
  memo_type text default 'analytic',
  memo_text text not null,
  created_at timestamptz default now()
);

alter table research_interviews enable row level security;
alter table research_segments enable row level security;
alter table research_open_codes enable row level security;
alter table research_segment_codes enable row level security;
alter table research_memos enable row level security;

drop policy if exists "own interviews" on research_interviews;
create policy "own interviews" on research_interviews
for all using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "own codes" on research_open_codes;
create policy "own codes" on research_open_codes
for all using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "own segments" on research_segments;
create policy "own segments" on research_segments
for all using (
  exists (
    select 1 from research_interviews i
    where i.id = research_segments.interview_id
    and i.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from research_interviews i
    where i.id = research_segments.interview_id
    and i.user_id = auth.uid()
  )
);

drop policy if exists "own segment codes" on research_segment_codes;
create policy "own segment codes" on research_segment_codes
for all using (
  exists (
    select 1
    from research_segments s
    join research_interviews i on i.id = s.interview_id
    where s.id = research_segment_codes.segment_id
    and i.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from research_segments s
    join research_interviews i on i.id = s.interview_id
    where s.id = research_segment_codes.segment_id
    and i.user_id = auth.uid()
  )
);

drop policy if exists "own memos" on research_memos;
create policy "own memos" on research_memos
for all using (
  exists (
    select 1 from research_interviews i
    where i.id = research_memos.interview_id
    and i.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from research_interviews i
    where i.id = research_memos.interview_id
    and i.user_id = auth.uid()
  )
);
