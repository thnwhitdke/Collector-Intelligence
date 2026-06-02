require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const sql = `
    create table if not exists public.want_market_history (
      id bigserial primary key,
      want_id bigint not null,
      user_id uuid not null,
      discogs_release_id bigint not null,
      captured_at timestamptz not null default now(),
      lowest_price numeric,
      for_sale integer,
      want_count integer,
      have_count integer,
      marketplace_url text,
      signal text,
      created_at timestamptz not null default now()
    );

    create index if not exists want_market_history_want_id_idx
    on public.want_market_history(want_id);

    create index if not exists want_market_history_user_id_idx
    on public.want_market_history(user_id);

    create index if not exists want_market_history_captured_at_idx
    on public.want_market_history(captured_at desc);
  `;

  const { error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error(error);
    console.log('');
    console.log('If exec_sql is not available, create this table in the Supabase SQL Editor.');
    return;
  }

  console.log('want_market_history table created or already existed.');
}

run();
