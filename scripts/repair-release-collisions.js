const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function normalize(s='') {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g,'')
    .trim()
}

async function run() {

  const { data, error } = await supabase
    .from('records_clean_safe')
    .select(`
      id,
      artist,
      title,
      discogs_release_id
    `)
    .not('discogs_release_id','is',null)

  if (error) {
    console.error(error)
    return
  }

  const grouped = {}

  for (const r of data) {
    const rel = r.discogs_release_id
    grouped[rel] ||= []
    grouped[rel].push(r)
  }

  let repaired = 0

  for (const rel in grouped) {

    const rows = grouped[rel]

    const titles = new Set(
      rows.map(r=>normalize(r.title))
    )

    if (
      rows.length >= 3 &&
      titles.size >= 3
    ) {

      console.log(
        `REPAIRING RELEASE ${rel}`
      )

      for (const row of rows) {

        const { error:updateError } =
          await supabase
            .from('records_clean_safe')
            .update({
              discogs_release_id:null,
              discogs_image_url:null,
              discogs_thumbnail_url:null,
              cover_url:null,
              enrichment_status:'needs_repair',
              value_last_updated:null
            })
            .eq('id', row.id)

        if (!updateError) {
          repaired++
        }
      }
    }
  }

  console.log({
    repaired
  })
}

run()
