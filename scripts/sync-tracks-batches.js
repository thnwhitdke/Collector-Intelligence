require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const LOCAL_URL = 'http://localhost:3000/api/tracks/sync';
const BATCH_SIZE = 25;
const MAX_BATCHES = 10;
const WAIT_BETWEEN_BATCHES_MS = 15000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getProgress() {
  const { data: records, error: recordsError } = await supabase
    .from('records_clean_safe')
    .select('discogs_release_id')
    .not('discogs_release_id', 'is', null);

  if (recordsError) throw recordsError;

  const { data: tracks, error: tracksError } = await supabase
    .from('release_tracks')
    .select('discogs_release_id');

  if (tracksError) throw tracksError;

  const unique = Array.from(
    new Set(records.map((row) => String(row.discogs_release_id)).filter(Boolean))
  );

  const synced = new Set(
    tracks.map((row) => String(row.discogs_release_id)).filter(Boolean)
  );

  const unsynced = unique.filter((id) => !synced.has(id));

  return {
    total: unique.length,
    synced: synced.size,
    remaining: unsynced.length,
    nextBatch: unsynced.slice(0, BATCH_SIZE),
  };
}

async function syncBatch(releaseIds) {
  const response = await fetch(LOCAL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ releaseIds }),
  });

  return response.json();
}

async function run() {
  console.log('Collector Intelligence Track Batch Runner');
  console.log('------------------------------------------');

  for (let batchNumber = 1; batchNumber <= MAX_BATCHES; batchNumber++) {
    const progress = await getProgress();

    const percent = ((progress.synced / progress.total) * 100).toFixed(1);

    console.log('');
    console.log(`Batch ${batchNumber}/${MAX_BATCHES}`);
    console.log(`Progress: ${progress.synced}/${progress.total} synced (${percent}%)`);
    console.log(`Remaining: ${progress.remaining}`);

    if (progress.remaining === 0) {
      console.log('All releases are synced.');
      return;
    }

    if (progress.nextBatch.length === 0) {
      console.log('No batch available.');
      return;
    }

    console.log(`Syncing ${progress.nextBatch.length} release(s)...`);

    const result = await syncBatch(progress.nextBatch);

    console.log(`Processed: ${result.processed ?? 0}`);
    console.log(`Inserted tracks: ${result.inserted ?? 0}`);

    if (!result.ok) {
      console.log('Batch stopped or failed:');
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    const rateLimited = JSON.stringify(result).toLowerCase().includes('rate limit')
      || JSON.stringify(result).includes('429');

    if (rateLimited) {
      console.log('Discogs rate limit detected. Stopping safely.');
      return;
    }

    console.log(`Waiting ${WAIT_BETWEEN_BATCHES_MS / 1000}s before next batch...`);
    await sleep(WAIT_BETWEEN_BATCHES_MS);
  }

  const finalProgress = await getProgress();
  const finalPercent = ((finalProgress.synced / finalProgress.total) * 100).toFixed(1);

  console.log('');
  console.log('Run complete.');
  console.log(`Final progress: ${finalProgress.synced}/${finalProgress.total} synced (${finalPercent}%)`);
  console.log(`Remaining: ${finalProgress.remaining}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
