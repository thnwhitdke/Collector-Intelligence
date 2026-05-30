const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  const { data, error } = await supabase
    .from('records_clean_safe')
    .select(`
      id,
      artist,
      title,
      discogs_release_id,
      discogs_image_url
    `)
    .not('discogs_release_id', 'is', null)

  if (error) {
    console.error(error)
    return
  }

  const grouped = {}

  for (const r of data) {
    const rel = r.discogs_release_id
    if (!grouped[rel]) grouped[rel] = []
    grouped[rel].push(r)
  }

  const suspicious = []

  for (const rel in grouped) {
    const rows = grouped[rel]

    const titles = new Set(
      rows.map(r =>
        (r.title || '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
      )
    )

    if (rows.length >= 3 && titles.size >= 3) {
      suspicious.push({
        release: rel,
        count: rows.length,
        titles: titles.size,
        rows
      })
    }
  }

  suspicious.sort((a,b)=>b.count-a.count)

  console.log('\nSUSPICIOUS RELEASE COLLISIONS\n')

  suspicious.forEach(s => {
    console.log(
      `RELEASE ${s.release} | records=${s.count} | titles=${s.titles}`
    )

    s.rows.slice(0,10).forEach(r=>{
      console.log(
        `${r.id} | ${r.artist} | ${r.title}`
      )
    })

    console.log('---')
  })

  console.log(
    `\nTOTAL COLLISIONS: ${suspicious.length}`
  )
}

run()
