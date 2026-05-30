const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function extractReleaseId(url) {
  if (!url) return null;
  const m = String(url).match(/release\/(\d+)/i);
  return m ? m[1] : null;
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

async function run() {
  console.log('Starting Discogs URL release mismatch repair...');

  const { data, error } = await supabase
    .from('records_clean_safe')
    .select('id, artist, title, discogs_url, discogs_release_id')
    .not('discogs_url', 'is', null)
    .limit(5000);

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Loaded ${data.length} records with Discogs URLs.`);

  let repaired = 0;
  let skippedReview = 0;
  let skippedNoMismatch = 0;
  let checked = 0;

  for (const r of data || []) {
    checked++;

    const urlId = extractReleaseId(r.discogs_url);
    const storedId = String(r.discogs_release_id || '');

    if (!urlId || !storedId || urlId === storedId) {
      skippedNoMismatch++;
      continue;
    }

    const titleMatch = norm(r.discogs_url).includes(norm(r.title));

    if (!titleMatch) {
      skippedReview++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('records_clean_safe')
      .update({
        discogs_release_id: urlId,
        discogs_image_url: null,
        discogs_thumbnail_url: null,
        cover_url: null,
        value_last_updated: null,
        enrichment_status: 'needs_repair',
        value_pull_status: 'needs_updates',
        value_pull_note: `Discogs release ID corrected from ${storedId} to ${urlId} based on Discogs URL.`,
        value_pull_last_attempted_at: new Date().toISOString()
      })
      .eq('id', r.id);

    if (updateError) {
      console.error('Failed:', r.id, updateError.message);
      continue;
    }

    repaired++;

    if (repaired % 50 === 0) {
      console.log(`Progress: repaired ${repaired} records...`);
    }
  }

  console.log('DONE');
  console.log({
    checked,
    repaired,
    skippedReview,
    skippedNoMismatch
  });
}

run();
