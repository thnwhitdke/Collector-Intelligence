const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const token = process.env.DISCOGS_TOKEN;
const userAgent =
  process.env.DISCOGS_USER_AGENT ||
  'CollectorIntelligence/1.0';

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^usa$/, 'us')
    .replace(/^united states$/, 'us')
    .replace(/^uk$/, 'united kingdom');
}

async function fetchReleaseCountry(releaseId) {
  const response = await fetch(
    `https://api.discogs.com/releases/${releaseId}`,
    {
      headers: {
        Authorization: `Discogs token=${token}`,
        'User-Agent': userAgent,
      },
    }
  );

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
    country: json.country || null,
  };
}

async function run() {
  const { data, error } = await supabase
    .from('records_clean_safe')
    .select(
      'id, artist, title, country, discogs_release_id, enrichment_status'
    )
    .not('discogs_release_id', 'is', null)
    .neq('enrichment_status', 'country_repaired')
    .order('id', { ascending: true })
    .limit(50);

  if (error) {
    console.error(error);
    return;
  }

  let checked = 0;
  let updated = 0;
  let skipped = 0;

  for (const record of data || []) {
    checked++;

    const releaseId =
      String(record.discogs_release_id || '');

    if (!releaseId) {
      skipped++;
      continue;
    }

    const result =
      await fetchReleaseCountry(releaseId);

    if (!result.ok || !result.country) {
      console.log(
        `Skip ${record.id} HTTP`
      );
      skipped++;
      continue;
    }

    if (
      normalize(record.country) ===
      normalize(result.country)
    ) {
      skipped++;
      continue;
    }

    const { error:updateError } =
      await supabase
        .from('records_clean_safe')
        .update({
          country: result.country,
          enrichment_status:
            'country_repaired',
          value_pull_last_attempted_at:
            new Date().toISOString(),
        })
        .eq('id', record.id);

    if (updateError) {
      console.error(updateError);
      skipped++;
      continue;
    }

    updated++;

    console.log(
      `Updated ${record.id}: ${record.country} -> ${result.country}`
    );

    await new Promise(
      r => setTimeout(r, 900)
    );
  }

  console.log({
    checked,
    updated,
    skipped
  });
}

run();
