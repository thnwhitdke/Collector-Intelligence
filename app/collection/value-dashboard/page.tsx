'use client'

import React from 'react'
import { motion } from 'framer-motion'

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

function IconCpu() {
  return <span>⌘</span>
}

function IconTrending() {
  return <span>↗</span>
}

const demoQueue = [
  {
    id: '1',
    artist: 'David Bowie',
    title: 'Liza Jane',
    cover_url:
      'https://upload.wikimedia.org/wikipedia/en/5/5f/David_Bowie_-_Liza_Jane.jpg',
    estimated_value: '$3,733',
    discogs_low_price: '$2,950',
    discogs_median_price: '$3,400',
    discogs_high_price: '$5,200',
    queue_priority: 1,
    value_pull_status: 'rare_no_sales_history',
    value_last_updated: 'Apr 2, 2026',
    value_pull_last_attempted_at: 'May 16, 2026',
    value_pull_note:
      'This release has no recorded Discogs sales history. That usually means it is extremely rare or rarely sold publicly.',
    discogs_release_id: '481920',
    label: 'Decca',
    catalogue_number: 'F-11889',
    year_released: '1964',
  },
  {
    id: '2',
    artist: 'Pink Floyd',
    title: 'Wish You Were Here',
    cover_url:
      'https://upload.wikimedia.org/wikipedia/en/a/a4/Pink_Floyd%2C_Wish_You_Were_Here_%281975%29.png',
    estimated_value: '$1,120',
    discogs_low_price: '$800',
    discogs_median_price: '$980',
    discogs_high_price: '$1,900',
    queue_priority: 3,
    value_pull_status: 'needs_updates',
    value_last_updated: 'Mar 28, 2026',
    value_pull_last_attempted_at: 'May 14, 2026',
    value_pull_note:
      'This release still needs additional pricing or metadata updates.',
    discogs_release_id: '920114',
    label: 'Harvest',
    catalogue_number: 'SHVL 814',
    year_released: '1975',
  },
  {
    id: '3',
    artist: 'The Smashing Pumpkins',
    title: 'Oceania',
    cover_url:
      'https://upload.wikimedia.org/wikipedia/en/8/87/Oceania_cover.jpg',
    estimated_value: '$92',
    discogs_low_price: '$65',
    discogs_median_price: '$84',
    discogs_high_price: '$145',
    queue_priority: 5,
    value_pull_status: 'up_to_date',
    value_last_updated: 'May 10, 2026',
    value_pull_last_attempted_at: 'May 10, 2026',
    value_pull_note:
      'Pricing and album artwork are fully updated.',
    discogs_release_id: '3728472',
    label: 'EMI',
    catalogue_number: '509999 780252 1 5',
    year_released: '2012',
  },
]

function statusTone(status: string) {
  if (status === 'rare_no_sales_history') {
    return 'border-purple-400/20 bg-purple-400/10 text-purple-200'
  }

  if (status === 'up_to_date') {
    return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
  }

  if (status === 'discogs_error') {
    return 'border-red-400/20 bg-red-400/10 text-red-200'
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

  const filteredQueue = demoQueue.filter((record) => {
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
      label: 'Records Needing Updates',
      value: String(filteredQueue.length),
      icon: <IconActivity />,
      accent: 'from-yellow-400 to-orange-500',
    },
    {
      label: 'Missing Information',
      value: '1',
      icon: <IconDatabase />,
      accent: 'from-cyan-400 to-blue-500',
    },
    {
      label: 'Missing Covers',
      value: '0',
      icon: <IconImage />,
      accent: 'from-fuchsia-400 to-purple-500',
    },
    {
      label: 'Collection Value In Queue',
      value: '$4.8K',
      icon: <IconTrending />,
      accent: 'from-emerald-400 to-green-500',
    },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020202] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[600px] w-[600px] rounded-full bg-yellow-500/10 blur-[180px]" />
        <div className="absolute right-0 top-0 h-[700px] w-[700px] rounded-full bg-blue-500/10 blur-[220px]" />
        <div className="absolute bottom-0 left-1/3 h-[600px] w-[600px] rounded-full bg-fuchsia-500/10 blur-[220px]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1800px] flex-col gap-8 px-6 py-8 lg:px-10">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-[42px] border border-white/10 bg-[#060606]/95 p-10 shadow-[0_0_80px_rgba(255,196,0,0.08)] backdrop-blur-2xl"
        >
          <div className="relative z-10 grid gap-10 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-5 py-2 text-xs font-black uppercase tracking-[0.35em] text-yellow-300">
                <IconSparkles />
                Collection Updates
              </div>

              <h1 className="mt-6 max-w-5xl text-6xl font-black leading-[0.9] tracking-[-0.04em] md:text-8xl">
                Collection
                <span className="bg-gradient-to-r from-yellow-300 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
                  {' '}
                  Update Center
                </span>
              </h1>

              <p className="mt-8 max-w-3xl text-xl leading-relaxed text-zinc-400">
                This page helps keep your collection updated automatically. It refreshes record values, restores missing album covers, and shows releases that may need attention.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl">
              <div className="relative z-10 flex flex-col gap-5">
                <div className="flex items-center justify-between rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-5 py-4">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
                      Discogs Connection
                    </div>

                    <div className="mt-2 text-2xl font-black text-white">
                      Connected
                    </div>
                  </div>

                  <div className="text-4xl text-emerald-400">
                    <IconShield />
                  </div>
                </div>

                <button className="group flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-5 text-sm font-black uppercase tracking-[0.25em] text-black transition-all duration-300 hover:scale-[1.02]">
                  Update Record Values
                  <IconArrow />
                </button>

                <button className="group flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5 text-sm font-bold uppercase tracking-[0.25em] text-white transition-all duration-300 hover:border-cyan-400/40 hover:bg-cyan-400/10">
                  Recover Missing Covers
                  <IconRefresh />
                </button>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="rounded-[32px] border border-white/10 bg-[#050505]/90 p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                    {metric.label}
                  </div>

                  <div className="mt-5 text-4xl font-black tracking-tight text-white">
                    {metric.value}
                  </div>
                </div>

                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${metric.accent}`}
                >
                  <div className="text-2xl text-black">{metric.icon}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </section>

        <section className="grid gap-6">
          <div className="rounded-[38px] border border-white/10 bg-[#050505]/95 p-6">
            <div className="grid gap-4 xl:grid-cols-[1fr_260px_220px]">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                  Search Your Collection
                </div>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search artist or release title..."
                  className="mt-4 h-16 w-full rounded-2xl border border-white/10 bg-black/50 px-6 text-lg text-white outline-none"
                />
              </div>

              <div>
                <div className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                  Filter Results
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-4 h-16 w-full rounded-2xl border border-white/10 bg-black/50 px-5 text-white outline-none"
                >
                  <option value="all">All Records</option>
                  <option value="needs_updates">Needs Updates</option>
                  <option value="rare_no_sales_history">Rare / No Sales History</option>
                  <option value="up_to_date">Fully Updated</option>
                </select>
              </div>

              <div className="rounded-[28px] border border-yellow-400/15 bg-yellow-400/10 p-5">
                <div className="text-xs font-black uppercase tracking-[0.3em] text-yellow-300">
                  Records Showing
                </div>

                <div className="mt-3 text-5xl font-black text-white">
                  {filteredQueue.length}
                </div>
              </div>
            </div>
          </div>

          {filteredQueue.map((record, index) => (
            <motion.article
              key={record.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="group relative overflow-hidden rounded-[38px] border border-white/10 bg-[#050505]/95 p-6 transition-all duration-500 hover:border-yellow-400/20"
            >
              <div className="grid items-start gap-5 xl:grid-cols-[140px_1fr_260px]">
                <div className="relative h-[140px] w-[140px] overflow-hidden rounded-[24px] border border-white/10 bg-black shrink-0">
                  <img
                    src={record.cover_url}
                    alt={record.title}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://placehold.co/600x600/111111/facc15?text=${encodeURIComponent(record.title)}`
                    }}
                  />
                </div>

                <div>
                  <div className="flex flex-wrap gap-3">
                    <div
                      className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${statusTone(
                        record.value_pull_status,
                      )}`}
                    >
                      {prettyStatus(record.value_pull_status)}
                    </div>
                  </div>

                  <div className="mt-6 text-sm font-black uppercase tracking-[0.3em] text-yellow-300">
                    {record.artist}
                  </div>

                  <h3 className="mt-2 text-4xl font-black leading-none tracking-tight text-white xl:text-5xl">
                    {record.title}
                  </h3>

                  <p className="mt-5 max-w-3xl text-lg leading-relaxed text-zinc-400">
                    {[record.label, record.catalogue_number, record.year_released]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>

                  <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      ['Estimated Value', record.estimated_value],
                      ['Low Sale', record.discogs_low_price],
                      ['Median Sale', record.discogs_median_price],
                      ['High Sale', record.discogs_high_price],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-white/10 bg-black/40 p-3"
                      >
                        <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                          {label}
                        </div>

                        <div className="mt-2 text-xl font-black text-white">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                      Update Notes
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                      {record.value_pull_note}
                    </p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-black/40 p-5 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <div className="text-yellow-300">
                      <IconActivity />
                    </div>

                    <div className="text-lg font-black text-white">
                      Update Details
                    </div>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                        Last Value Refresh
                      </div>

                      <div className="mt-2 text-2xl font-black text-white">
                        {record.value_last_updated}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                        Last Update Attempt
                      </div>

                      <div className="mt-2 text-xl font-black text-white">
                        {record.value_pull_last_attempted_at}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                        Discogs Release ID
                      </div>

                      <div className="mt-2 text-xl font-black text-white">
                        #{record.discogs_release_id}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </section>
      </div>
    </main>
  )
}
