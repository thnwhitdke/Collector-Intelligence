-- RAGE Fortress: records_clean_safe policy hardening + user lookup performance

drop policy if exists "Allow public read access to records_clean_safe"
on public.records_clean_safe;

drop policy if exists "Allow public insert access to records_clean_safe"
on public.records_clean_safe;

drop policy if exists "Allow public update access to records_clean_safe"
on public.records_clean_safe;

create index if not exists idx_records_clean_safe_user_id
on public.records_clean_safe(user_id);
