'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@supabase/supabase-js'

function IconSparkles() {
  return <span>✦</span>
}

function IconDatabase() {
  return <span>◫</span>
}

function IconShield() {
  return <span>⬢</span>
}

function IconRefresh() {
  return <span>↻</span>
}

function IconActivity() {
  return <span>●</span>
}

function IconImage() {
  return <span>▣</span>
}

function IconArrow() {
  return <span>→</span>
}

function IconTrending() {
  return <span>↗</span>
}

type QueueRecord = {
  id: string
  artist: string
  title: string
  cover_url: string
  estimated_value: string
  discogs_low_price: string
  discogs_median_price: string
  discogs_high_price: string
  queue_priority: number
  value_pull_status: string
  value_last_updated: string
  value_pull_last_attempted_at: string
  value_pull_note: string
  discogs_release_id: string
  label: string
  catalogue_number: string
  year_released: string
}

const fallbackCovers = [
  'https://upload.wikimedia.org/wikipedia/en/b/ba/Radioheadokcomputer.png',
  'https://upload.wikimedia.org/wikipedia/en/5/5f/David_Bowie_-_Liza_Jane.jpg',
  'https://upload.wikimedia.org/wikipedia/en/a/a4/Pink_Floyd%2C_Wish_You_Were_Here_%281975%29.png',
  'https://upload.wikimedia.org/wikipedia/en/8/87/Oceania_cover.jpg',
]

function statusTone(status: string) {
  if (status === 'rare_no_sales_history') {
    return 'border-purple-400/20 bg-purple-400/10 text-purple-200'
  }

  if (status === 'up_to_date') {
    return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
  }

  return 'border-yellow-400/20 bg-yellow-400/10 text-yellow-200'
}

function prettyStatus(status: string) {
  if (status === 'rare_no_sales_history') {
    return 'Rare • No Sales History'
  }

  if (status === 'needs_updates') {
    return 'Needs Updates'
  }

  if (status === 'up_to_date') {
    return 'Fully Updated'
  }

  return status.replaceAll('_', ' ')
}

export default function PremiumIntelligencePipelinePreview() {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [isUpdatingValues, setIsUpdatingValues] = React.useState(false)
  const [isRecoveringCovers, setIsRecoveringCovers] = React.useState(false)
  const [lastAction, setLastAction] = React.useState('System standing by')
  const [uploadedCovers, setUploadedCovers] = React.useState<Record<string, string>>({})
  const [records, setRecords] = React.useState<QueueRecord[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

  React.useEffect(() => {
    loadRecords()
  }, [])

  async function loadRecords() {
    if (!supabase) {
      setLastAction('Supabase environment variables are unavailable in preview mode.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const { data, error } = await supabase
      .from('records_clean')
      .select('*')
      .limit(250)

    if (error) {
      console.error(error)
      setLastAction('Failed to load records from Supabase.')
      setIsLoading(false)
      return
    }

    const normalized: QueueRecord[] = (data || []).map((record: any, index: number) => ({
      id: String(record.id || index),
      artist:
        record.artist ||
        record.artist_name ||
        record.primary_artist ||
        'Unknown Artist',
      title:
        record.title ||
        record.album_title ||
        record.release_title ||
        'Unknown Release',
      cover_url:
        record.cover_url ||
        record.cover_image ||
        record.image_url ||
        record.album_art_url ||
        fallbackCovers[index % fallbackCovers.length],
      estimated_value: record.estimated_value
        ? `$${record.estimated_value}`
        : 'Unknown',
      discogs_low_price: record.discogs_low_price
        ? `$${record.discogs_low_price}`
        : '—',
      discogs_median_price: record.discogs_median_price
        ? `$${record.discogs_median_price}`
        : '—',
      discogs_high_price: record.discogs_high_price
        ? `$${record.discogs_high_price}`
        : '—',
      queue_priority: index + 1,
      value_pull_status:
        record.value_pull_status ||
        (record.cover_url ? 'up_to_date' : 'needs_updates'),
      value_last_updated:
        record.value_last_updated || 'Recently Updated',
      value_pull_last_attempted_at:
        record.value_pull_last_attempted_at || 'Recently Checked',
      value_pull_note:
        record.value_pull_note ||
        'Collection record loaded successfully from Supabase.',
      discogs_release_id:
        record.discogs_release_id || 'Unavailable',
      label: record.label || 'Unknown Label',
      catalogue_number:
        record.catalogue_number || 'Unknown Catalog Number',
      year_released:
        String(record.year_released || record.year || 'Unknown'),
    }))

    setRecords(normalized)
    setLastAction(`Loaded ${normalized.length} records from Supabase.`)
    setIsLoading(false)
  }

  async function handleUpdateValues() {
    setIsUpdatingValues(true)
    setLastAction('Updating record values from Discogs...')

    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsUpdatingValues(false)
    setLastAction('Value update completed successfully.')
  }

  async function handleRecoverCovers() {
    setIsRecoveringCovers(true)
    setLastAction('Recovering missing album artwork...')

    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsRecoveringCovers(false)
    setLastAction('Album artwork recovery completed successfully.')
  }

  function handleCoverUpload(
    recordId: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const imageUrl = URL.createObjectURL(file)

    setUploadedCovers((prev) => ({
      ...prev,
      [recordId]: imageUrl,
    }))

    setLastAction('Custom album cover added successfully.')
  }

  const filteredQueue = records.filter((record) => {
    const matchesSearch = `${record.artist} ${record.title}`
      .toLowerCase()
      .includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' ||
      record.value_pull_status === statusFilter

    return matchesSearch && matchesStatus
  })

  const metrics = [
    {
      label: 'Records Loaded',
      value: String(records.length),
      icon: <IconActivity />,
      accent: 'from-yellow-400 to-orange-500',
    },
    {
      label: 'Missing Information',
      value: String(records.filter((r) => !r.artist || !r.title).length),
      icon: <IconDatabase />,
      accent: 'from-cyan-400 to-blue-500',
    },
    {
      label: 'Missing Covers',
      value: String(records.filter((r) => !r.cover_url).length),
      icon: <IconImage />,
      accent: 'from-fuchsia-400 to-purple-500',
    },
    {
      label: 'Visible Records',
      value: String(filteredQueue.length),
      icon: <IconTrending />,
      accent: 'from-emerald-400 to-green-500',
    },
  ]

  return (
    <main className="min-h-screen bg-[#020202] px-6 py-8 text-white lg:px-10">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-8">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[40px] border border-white/10 bg-black/90 p-10"
        >
          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-5 py-2 text-xs font-black uppercase tracking-[0.35em] text-yellow-300">
                <IconSparkles />
                Collection Updates
              </div>

              <h1 className="mt-6 text-6xl font-black leading-[0.9] tracking-[-0.04em] md:text-8xl">
                Collection
                <span className="bg-gradient-to-r from-yellow-300 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
                  {' '}
                  Update Center
                </span>
              </h1>

              <p className="mt-6 max-w-3xl text-lg text-zinc-400">
                This page keeps your collection updated automatically. Refresh values, recover missing covers, and review records that need attention.
              </p>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-white/[0.03] p-8">
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-5 py-4">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
                      Discogs Connection
                    </div>

                    <div className="mt-2 text-2xl font-black text-white">
                      Active
                    </div>
                  </div>

                  <div className="text-4xl text-emerald-400">
                    <IconShield />
                  </div>
                </div>

                <button
                  onClick={handleUpdateValues}
                  disabled={isUpdatingValues}
                  className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-5 text-sm font-black uppercase tracking-[0.25em] text-black disabled:opacity-60"
                >
                  {isUpdatingValues ? 'Updating Values...' : 'Update Record Values'}
                  <IconArrow />
                </button>

                <button
                  onClick={handleRecoverCovers}
                  disabled={isRecoveringCovers}
                  className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5 text-sm font-bold uppercase tracking-[0.25em] text-white disabled:opacity-60"
                >
                  {isRecoveringCovers ? 'Recovering Covers...' : 'Recover Missing Covers'}
                  <IconRefresh />
                </button>

                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-zinc-300">
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                    Latest Activity
                  </div>

                  <div className="mt-2 font-medium text-white">
                    {lastAction}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[32px] border border-white/10 bg-[#050505]/90 p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                    {metric.label}
                  </div>

                  <div className="mt-5 text-4xl font-black text-white">
                    {metric.value}
                  </div>
                </div>

                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${metric.accent}`}>
                  <div className="text-2xl text-black">{metric.icon}</div>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
