create table if not exists public.user_release_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source text not null default 'discogs',
  source_release_id text not null,
  action_type text not null check (action_type in ('want', 'reviewed', 'ignored')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, source_release_id, action_type)
);

alter table public.user_release_actions enable row level security;

drop policy if exists "user_release_actions_select_own" on public.user_release_actions;
create policy "user_release_actions_select_own"
on public.user_release_actions
for select
using (auth.uid() = user_id);

drop policy if exists "user_release_actions_insert_own" on public.user_release_actions;
create policy "user_release_actions_insert_own"
on public.user_release_actions
for insert
with check (auth.uid() = user_id);

drop policy if exists "user_release_actions_delete_own" on public.user_release_actions;
create policy "user_release_actions_delete_own"
on public.user_release_actions
for delete
using (auth.uid() = user_id);

create index if not exists user_release_actions_user_release_idx
on public.user_release_actions(user_id, source_release_id);

create index if not exists user_release_actions_user_type_idx
on public.user_release_actions(user_id, action_type);
