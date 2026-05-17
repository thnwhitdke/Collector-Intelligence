'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@supabase/supabase-js'
import { enrichSingleRecord } from "@/app/actions/discogs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const PAGE_SIZE = 100

function IconSparkles() {
  return <span>✦</span>
}

function IconDatabase() {
  return <span>◫</span>
}

function IconShield() {
  return <span>⬢</span>
}

function IconActivity() {
  return <span>●</span>
}

function IconImage() {
  return <span>▣</span>
}

function IconTrending() {
  return <span>↗</span>
}

function IconLoad() {
  return <span>↻</span>
}

type QueueRecord = {
  id: string
  artist: string | null
  title: string | null
  cover_url: string | null
  estimated_value: string | null
  discogs_release_id: string | null
  label: string | null
  year_released: string | null
  value_pull_status: string | null
}

const fallbackCover =
  'https://upload.wikimedia.org/wikipedia/en/b/ba/Radioheadokcomputer.png'

function getStatusTone(status: string | null) {
  if (status === 'up_to_date') {
    return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
  }

  if (status === 'rare_no_sales_history') {
    return 'border-purple-400/20 bg-purple-400/10 text-purple-200'
  }

  return 'border-yellow-400/20 bg-yellow-400/10 text-yellow-200'
}

function getPrettyStatus(status: string | null) {
  if (status === 'up_to_date') {
    return 'Fully Updated'
  }

  if (status === 'rare_no_sales_history') {
    return 'Rare / No Sales History'
  }

  return 'Needs Updates'
}

export default function ValueDashboardPage() {
  const [records, setRecords] = React.useState<QueueRecord[]>([])
  const [loading, setLoading] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [page, setPage] = React.useState(0)
  const [hasMore, setHasMore] = React.useState(true)
  const [uploadedCovers, setUploadedCovers] = React.useState<
    Record<string, string>
  >({})
  const [lastAction, setLastAction] = React.useState(
    'Initializing collection intelligence...',
  )

  React.useEffect(() => {
    loadRecords(true)
  }, [])

  async function loadRecords(reset = false) {
    if (loading) {
      return
    }

    setLoading(true)

    const currentPage = reset ? 0 : page

    let query = supabase
      .from('records_clean')
      .select('*')

    if (search.trim()) {
      query = query.or(
  `artist.ilike.%${search}%,title.ilike.%${search}%,label.ilike.%${search}%`
)
    }

    if (statusFilter !== 'all') {
      query = query.eq('value_pull_status', statusFilter)
    }

    const { data, error } = await query.range(
      currentPage * PAGE_SIZE,
      currentPage * PAGE_SIZE + PAGE_SIZE - 1,
    )

    if (error) {
      console.error('Supabase Query Error:', error)
      setLastAction(`Supabase error: ${error.message}`)
      setLoading(false)
      return
    }

    const normalized: QueueRecord[] = (data || []).map(
      (record: any, index: number) => ({
        id: String(record.id || index),

        artist:
          record.artist ||
          record.artist_name ||
          record.primary_artist ||
          'Unknown Artist',

        title:
          record.title ||
          record.release_title ||
          record.album_title ||
          'Unknown Release',

        cover_url:
          record.cover_url ||
          record.cover_image ||
          record.image_url ||
          record.album_art_url ||
          null,

        estimated_value: record.estimated_value
          ? `$${record.estimated_value}`
          : 'Unknown',

        discogs_release_id:
          record.discogs_release_id || 'Unavailable',

        label: record.label || 'Unknown Label',

        year_released: String(
          record.year_released || record.year || '',
        ),

        value_pull_status:
          record.value_pull_status || 'needs_updates',
      }),
    )

    if (reset) {
      setRecords(normalized)
    } else {
      setRecords((prev) => [...prev, ...normalized])
    }

    setHasMore(normalized.length === PAGE_SIZE)
    setPage(currentPage + 1)

    setLastAction(
      `Loaded ${normalized.length} additional records.`,
    )

    setLoading(false)
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
  }

  const metrics = [
    {
      label: 'Records Loaded',
      value: String(records.length),
      icon: <IconActivity />,
      accent: 'from-yellow-400 to-orange-500',
    },
    {
      label: 'Search Results',
      value: String(records.length),
      icon: <IconTrending />,
      accent: 'from-emerald-400 to-green-500',
    },
    {
      label: 'Missing Covers',
      value: String(records.filter((r) => !r.cover_url).length),
      icon: <IconImage />,
      accent: 'from-fuchsia-400 to-purple-500',
    },
    {
      label: 'Metadata Issues',
      value: String(
        records.filter((r) => !r.artist || !r.title).length,
      ),
      icon: <IconDatabase />,
      accent: 'from-cyan-400 to-blue-500',
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
                Collection Intelligence
              </div>

              <h1 className="mt-6 text-6xl font-black leading-[0.9] tracking-[-0.04em] md:text-8xl">
                Collection
                <span className="bg-gradient-to-r from-yellow-300 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
                  {' '}
                  Update Center
                </span>
              </h1>

              <p className="mt-6 max-w-3xl text-lg text-zinc-400">
                Search, analyze, and manage your collection
                with enterprise-grade collector intelligence.
              </p>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-white/[0.03] p-8">

              <div className="flex items-center justify-between rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-5 py-4">

                <div>
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
                    Database Status
                  </div>

                  <div className="mt-2 text-2xl font-black text-white">
                    Connected
                  </div>
                </div>

                <div className="text-4xl text-emerald-400">
                  <IconShield />
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-zinc-300">

                <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                  Latest Activity
                </div>

                <div className="mt-2 font-medium text-white">
                  {lastAction}
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

                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${metric.accent}`}
                >
                  <div className="text-2xl text-black">
                    {metric.icon}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-[38px] border border-white/10 bg-[#050505]/95 p-6">

          <div className="grid gap-4 xl:grid-cols-[1fr_260px_220px]">

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(0)
                  loadRecords(true)
                }
              }}
              placeholder="Search artist, title, label..."
              className="h-16 rounded-2xl border border-white/10 bg-black/50 px-6 text-lg text-white outline-none"
            />

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(0)

                setTimeout(() => {
                  loadRecords(true)
                }, 0)
              }}
              className="h-16 rounded-2xl border border-white/10 bg-black/50 px-5 text-white outline-none"
            >
              <option value="all">All Records</option>
              <option value="needs_updates">
                Needs Updates
              </option>
              <option value="rare_no_sales_history">
                Rare / No Sales History
              </option>
              <option value="up_to_date">
                Fully Updated
              </option>
            </select>

            <div className="flex items-center justify-center rounded-[28px] border border-yellow-400/15 bg-yellow-400/10 text-4xl font-black text-white">
              {records.length}
            </div>
          </div>
        </section>

        {loading && (
          <div className="rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-8 text-xl font-bold text-yellow-200">
            Loading records...
          </div>
        )}

        <section className="grid gap-6 pb-12">

          {records.map((record, index) => (
            <motion.article
              key={record.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.002 }}
              className="overflow-hidden rounded-[34px] border border-white/10 bg-[#050505]/95 p-5"
            >
              <div className="grid items-start gap-5 xl:grid-cols-[140px_1fr_260px]">

                <div className="h-[140px] w-[140px] overflow-hidden rounded-[24px] border border-white/10 bg-black">

                  <img
                    src={
                      uploadedCovers[record.id] ||
                      record.cover_url ||
                      fallbackCover
                    }
                    alt={record.title || 'Record'}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>

                <div>

                  <div
                    className={`inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${getStatusTone(
                      record.value_pull_status,
                    )}`}
                  >
                    {getPrettyStatus(
                      record.value_pull_status,
                    )}
                  </div>

                  <div className="mt-5 text-sm font-black uppercase tracking-[0.3em] text-yellow-300">
                    {record.artist}
                  </div>

                  <h2 className="mt-2 text-4xl font-black text-white">
                    {record.title}
                  </h2>

                  <p className="mt-4 text-zinc-400">
                    {[record.label, record.year_released]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-black/40 p-5">

                  <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                    Discogs Release ID
                  </div>

                  <div className="mt-2 text-2xl font-black text-white">
                    #{record.discogs_release_id}
                  </div>

                  <div className="mt-4 text-3xl font-black text-yellow-300">
                    {record.estimated_value}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-cyan-200 hover:bg-cyan-400/20">

                      <IconImage />
                      Upload Cover

                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) =>
                          handleCoverUpload(
                            record.id,
                            event,
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </section>

        <div className="flex items-center justify-center pb-24">

          {hasMore && !loading && (
            <button
              onClick={() => loadRecords(false)}
              className="flex items-center gap-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-8 py-4 text-sm font-black uppercase tracking-[0.25em] text-yellow-200 transition hover:bg-yellow-400/20"
            >
              <IconLoad />
              Load More Records
            </button>
          )}

          {!hasMore && (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-8 py-4 text-sm font-black uppercase tracking-[0.25em] text-emerald-200">
              End Of Collection Reached
            </div>
          )}
        </div>
      </div>
    </main>
  )
}