const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const token = process.env.DISCOGS_TOKEN;
const userAgent = process.env.DISCOGS_USER_AGENT || 'CollectorIntelligence/1.0';

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^usa$/, 'us')
    .replace(/^united states$/, 'us')
    .replace(/^uk$/, 'united kingdom');
}

async function fetchReleaseCountry(releaseId) {
  const response = await fetch(`https://api.discogs.com/releases/${releaseId}`, {
    headers: {
      Authorization: `Discogs token=${token}`,
      'User-Agent': userAgent,
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      country: null,
    };
  }

  const json = await response.json();

  return {
    ok: true,
    status: response.status,
    country: json.country || null,
  };
}

async function run() {
  if (!token) {
    console.error('Missing DISCOGS_TOKEN');
    return;
  }

  const { data, error } = await supabase
    .from('records_clean_safe')
    .select('id, artist, title, country, discogs_release_id')
    .not('discogs_release_id', 'is', null)
    .order('value_pull_last_attempted_at', { ascending: false, nullsFirst: false })
    .limit(50);

  if (error) {
    console.error(error);
    return;
  }

  const mismatches = [];

  for (const record of data || []) {
    const releaseId = String(record.discogs_release_id || '').trim();

    if (!releaseId) continue;

    const result = await fetchReleaseCountry(releaseId);

    if (!result.ok) {
      console.log(`Skipped ${record.id}: Discogs HTTP ${result.status}`);
      continue;
    }

    const current = record.country || null;
    const discogsCountry = result.country || null;

    if (normalize(current) !== normalize(discogsCountry)) {
      mismatches.push({
        id: record.id,
        artist: record.artist,
        title: record.title,
        current_country: current,
        discogs_country: discogsCountry,
        release: releaseId,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 900));
  }

  console.log({
    checked: data?.length || 0,
    mismatches: mismatches.length,
  });

  console.table(mismatches.slice(0, 25));
}

run();
