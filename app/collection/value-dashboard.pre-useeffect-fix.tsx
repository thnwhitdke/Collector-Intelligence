'use client'

import React, { useCallback } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@supabase/supabase-js'
import CINavigation from '@/app/components/CINavigation'

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
  rarity_index?: number | null
  market_momentum?: string | null
  collector_iq_score?: number | null
  market_trend?: string | null
  market_signal?: string | null
  value_pull_status: string | null
  market_num_for_sale: number | null
  value_last_updated: string | null
}

type DashboardMover = {
  recordId: number
  artist?: string | null
  title?: string | null
  percentChange: number
  delta: number
  direction: string
}

type PortfolioTrend = {
  firstValue: number
  latestValue: number
  delta: number
  percentChange: number
  direction: string
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

function getHeatBadge(
  momentum: string | null,
) {
  if (
    momentum === 'Accelerating'
  ) {
    return {
      label: '🔥 Hot',
      tone:
        'text-orange-300',
    }
  }

  if (
    momentum === 'Stable'
  ) {
    return {
      label: '● Stable',
      tone:
        'text-emerald-300',
    }
  }

  if (
    momentum ===
    'Cooling Down'
  ) {
    return {
      label: '❄ Cooling',
      tone:
        'text-cyan-300',
    }
  }

  if (
  momentum ===
  'Supply Compression'
) {
  return {
    label:
      '⚡ Tight Supply',
    tone:
      'text-yellow-300',
  }
}

  return {
    label: '—',
    tone: 'text-zinc-400',
  }
}



function getSignalBadge(
  signal: string | null,
) {

  if (
    signal === 'Bullish'
  ) {
    return {
      label:
        '🟢 Buy Watch',
      tone:
        'text-emerald-300',
    }
  }

  if (
    signal === 'Bearish'
  ) {
    return {
      label:
        '🔴 Risk Watch',
      tone:
        'text-rose-300',
    }
  }

  if (
    signal === 'Neutral'
  ) {
    return {
      label:
        '⚪ Hold',
      tone:
        'text-zinc-300',
    }
  }

  return {
    label: '—',
    tone:
      'text-zinc-500',
  }
}

function getOpportunityTier(
  record: QueueRecord,
) {

  const iq =
    record.collector_iq_score || 0

  const rarity =
    record.rarity_index || 0

  const signal =
    record.market_signal || ''

  const momentum =
    record.market_momentum || ''

  if (
    signal === 'Bullish' &&
    momentum ===
      'Supply Compression' &&
    iq >= 180
  ) {
    return {
      label:
        '🔥 Opportunity',
      tone:
        'text-orange-300',
    }
  }

  if (
    rarity >= 85 &&
    iq >= 140
  ) {
    return {
      label:
        '💎 Hidden Gem',
      tone:
        'text-cyan-300',
    }
  }

  if (
    signal === 'Bearish'
  ) {
    return {
      label:
        '⚠ Risk Watch',
      tone:
        'text-rose-300',
    }
  }

  if (
    iq >= 220
  ) {
    return {
      label:
        '🧠 Elite Tier',
      tone:
        'text-fuchsia-300',
    }
  }

  return {
    label: '—',
    tone:
      'text-zinc-500',
  }
}

function getCommentary(
  record: QueueRecord,
) {

  const iq =
    record.collector_iq_score || 0

  const rarity =
    record.rarity_index || 0

  const signal =
    record.market_signal || ''

  const momentum =
    record.market_momentum || ''

  if (
    signal === 'Bullish' &&
    momentum ===
      'Supply Compression'
  ) {
    return 'Supply tightening and bullish activity suggest strengthening collector demand.'
  }

  if (
    signal === 'Bullish'
  ) {
    return 'Positive market behavior suggests growing collector interest.'
  }

  if (
    rarity >= 85
  ) {
    return 'High rarity may indicate scarcity-driven upside potential.'
  }

  if (
    iq >= 220
  ) {
    return 'Collector intelligence places this release among elite portfolio holdings.'
  }

  if (
    signal === 'Bearish'
  ) {
    return 'Market softness suggests closer monitoring may be warranted.'
  }

  return 'Market behavior currently appears stable.'
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

  const [movers, setMovers] =
  React.useState<DashboardMover[]>([])

const [portfolioTrend, setPortfolioTrend] =
  React.useState<PortfolioTrend | null>(
    null
  )

React.useEffect(() => {
  loadRecords(true)
}, [search, statusFilter])

React.useEffect(() => {
  loadIntelligence()
}, [])

React.useEffect(() => {

  const handleScroll = () => {

    if (
      loading ||
      !hasMore
    ) {
      return
    }

    const scrollPosition =
      window.innerHeight +
      window.scrollY

    const triggerPoint =
      document.documentElement
        .scrollHeight - 1200

    if (
      scrollPosition >=
      triggerPoint
    ) {

      console.log(
        '[Infinite Scroll] Loading next page',
        page,
      )

      loadRecords(false)
    }
  }

  window.addEventListener(
    'scroll',
    handleScroll,
  )

  return () =>
    window.removeEventListener(
      'scroll',
      handleScroll,
    )

}, [
  loading,
  hasMore,
  page,
])


const loadIntelligence = useCallback(async () => {

  try {

    const response =
      await fetch(
        '/api/dashboard/intelligence'
      )

    const data =
      await response.json()

    if (data.success) {

      setMovers(
        data.movers || []
      )

      setPortfolioTrend(
        data.portfolioTrend
      )

    }

  } catch (err) {

    console.error(err)

  }

}, [])

  const loadRecords = useCallback(async (reset = false) => {
    if (loading) {
      return
    }

    setLoading(true)

    const currentPage = reset ? 0 : page
    if (reset) {
  setRecords([])
  setPage(0)
  setHasMore(true)
}

    let query = supabase
  .from('records_clean_safe')
  .select('*')
  .order('id', {
    ascending: false,
  })

    if (search.trim()) {
      query = query.or(
        `artist.ilike.%${search}%,title.ilike.%${search}%,label.ilike.%${search}%`,
      )
    }

    if (statusFilter !== 'all') {
      query = query.eq(
        'value_pull_status',
        statusFilter,
      )
    }

    const { data, error } = await query.range(
      currentPage * PAGE_SIZE,
      currentPage * PAGE_SIZE + PAGE_SIZE - 1,
    )

    if (error) {
      console.error(
        'Supabase Query Error:',
        error,
      )

      setLastAction(
        `Supabase error: ${error.message}`,
      )

      setLoading(false)

      return
    }

    const normalized: QueueRecord[] = (
      data || []
    ).map((record: any, index: number) => {
    

      return {
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
          record.discogs_release_id ||
          'Unavailable',

        label:
          record.label || 'Unknown Label',

        year_released: String(
          record.year_released ||
            record.year ||
            '',
        ),

        value_pull_status:
          record.value_pull_status ||
          'needs_updates',

        market_num_for_sale:
  record.market_num_for_sale || 0,

rarity_index:
  record.rarity_index || 0,

market_momentum:
  record.market_momentum || null,

collector_iq_score:
  record.collector_iq_score || null,

market_trend:
  record.market_trend || null,
  market_signal:
  record.market_signal || null,

        value_last_updated:
          record.value_last_updated ||
          null,
      }
    })

    if (reset) {
      setRecords(normalized)
    } else {
      setRecords((prev) => [
        ...prev,
        ...normalized,
      ])
    }

setHasMore(
  normalized.length === PAGE_SIZE
)

    setPage(currentPage + 1)

   setLastAction(
  `Loaded ${
    reset
      ? normalized.length
      : records.length +
        normalized.length
  } records.`,
)

    setLoading(false)
  }, [loading, page, search, statusFilter, records.length, hasMore])

  function handleCoverUpload(
    recordId: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const imageUrl =
      URL.createObjectURL(file)

    setUploadedCovers((prev) => ({
      ...prev,
      [recordId]: imageUrl,
    }))
  }

  const totalCollectionValue = records.reduce(
    (sum, record) => {
      const numeric = Number(
        String(
          record.estimated_value || '0',
        )
          .replace('$', '')
          .replace(',', ''),
      )

      return (
        sum + (isNaN(numeric) ? 0 : numeric)
      )
    },
    0,
  )

  const highestValueRecord = [...records]
    .sort((a, b) => {
      const aValue = Number(
        String(
          a.estimated_value || '0',
        ).replace('$', ''),
      )

      const bValue = Number(
        String(
          b.estimated_value || '0',
        ).replace('$', ''),
      )

      return bValue - aValue
    })[0]

  const totalForSale = records.reduce(
    (sum, record) =>
      sum +
      (record.market_num_for_sale || 0),
    0,
  )
const opportunityCount =
  records.filter(
    (r) =>
      getOpportunityTier(r)
        .label ===
      '🔥 Opportunity',
  ).length

const hiddenGemCount =
  records.filter(
    (r) =>
      getOpportunityTier(r)
        .label ===
      '💎 Hidden Gem',
  ).length

const riskCount =
  records.filter(
    (r) =>
      getOpportunityTier(r)
        .label ===
      '⚠ Risk Watch',
  ).length

const eliteCount =
  records.filter(
    (r) =>
      getOpportunityTier(r)
        .label ===
      '🧠 Elite Tier',
  ).length
  const metrics = [
    {
      label: 'Collection Value',
      value: `$${totalCollectionValue.toFixed(
        2,
      )}`,
      icon: <IconTrending />,
      accent:
        'from-emerald-400 to-green-500',
    },

    {
      label: 'Most Valuable Artist',
      value: highestValueRecord
        ? highestValueRecord.artist
        : 'Unknown',
      icon: <IconSparkles />,
      accent:
        'from-yellow-400 to-orange-500',
    },

    {
      label: 'Market Listings',
      value: String(totalForSale),
      icon: <IconDatabase />,
      accent:
        'from-cyan-400 to-blue-500',
    },

    {
      label: 'Records Loaded',
      value: `${records.length} / 2860`,
      icon: <IconActivity />,
      accent:
        'from-fuchsia-400 to-purple-500',
    },
  ]

  return (
  <main className="min-h-screen bg-[#020202] px-6 py-8 text-white lg:px-10">

    <CINavigation />

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
                Enterprise-grade collector
                intelligence and valuation
                analytics.
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

{/* SEARCH CONSOLE */}

<section className="rounded-[30px] border border-white/10 bg-[#050505]/80 p-5">

  <div className="flex flex-col gap-4 md:flex-row md:items-center">

    <input
      type="text"
      value={search}
      onChange={(e) =>
        setSearch(e.target.value)
      }
      placeholder="Search artist, title, or label..."
      className="flex-1 rounded-2xl border border-cyan-500/10 bg-black/50 px-5 py-3 text-white placeholder:text-zinc-500 focus:border-cyan-400/30 focus:outline-none"
    />

    <select
      value={statusFilter}
      onChange={(e) =>
        setStatusFilter(
          e.target.value
        )
      }
      className="rounded-2xl border border-cyan-500/10 bg-black/50 px-4 py-3 text-white focus:border-cyan-400/30 focus:outline-none"
    >
      <option value="all">
        All Records
      </option>

      <option value="up_to_date">
        Fully Updated
      </option>

      <option value="needs_updates">
        Needs Updates
      </option>

      <option value="rare_no_sales_history">
        Rare / No Sales
      </option>
    </select>

  </div>

</section>

{/* PORTFOLIO COMMAND CENTER */}

<section className="mb-8">

  <div className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
    Portfolio Command Center
  </div>

  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">

    <div className="rounded-[28px] border border-orange-500/10 bg-orange-500/5 p-5">
      <div className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
        🔥 Hot Market
      </div>
      <div className="mt-2 text-4xl font-black text-white">
        {opportunityCount}
      </div>
      <div className="mt-2 text-sm text-zinc-400">
        Accelerating records
      </div>
    </div>

    <div className="rounded-[28px] border border-yellow-500/10 bg-yellow-500/5 p-5">
      <div className="text-xs font-black uppercase tracking-[0.25em] text-yellow-300">
        ⚡ Tight Supply
      </div>
      <div className="mt-2 text-4xl font-black text-white">
        {hiddenGemCount}
      </div>
      <div className="mt-2 text-sm text-zinc-400">
        Scarcity pressure
      </div>
    </div>

    <div className="rounded-[28px] border border-emerald-500/10 bg-emerald-500/5 p-5">
      <div className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
        🟢 Buy Watch
      </div>
      <div className="mt-2 text-4xl font-black text-white">
        {opportunityCount}
      </div>
      <div className="mt-2 text-sm text-zinc-400">
        Bullish signals
      </div>
    </div>

    <div className="rounded-[28px] border border-rose-500/10 bg-rose-500/5 p-5">
      <div className="text-xs font-black uppercase tracking-[0.25em] text-rose-300">
        🔴 Risk Watch
      </div>
      <div className="mt-2 text-4xl font-black text-white">
        {riskCount}
      </div>
      <div className="mt-2 text-sm text-zinc-400">
        Bearish signals
      </div>
    </div>

    <div className="rounded-[28px] border border-cyan-500/10 bg-cyan-500/5 p-5">
      <div className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
        🧠 IQ Leaders
      </div>
      <div className="mt-2 text-4xl font-black text-white">
        {eliteCount}
      </div>
      <div className="mt-2 text-sm text-zinc-400">
        IQ 180+
      </div>
    </div>

  </div>

</section>


{/* HISTORICAL INTELLIGENCE */}

<section className="grid gap-6 md:grid-cols-2">

  {/* PORTFOLIO TREND */}

  <div className="rounded-3xl border border-cyan-500/20 bg-slate-950/60 p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)]">

    <div className="mb-3 flex items-center gap-2 text-cyan-300">
      <IconTrending />
      <span className="text-xs font-semibold uppercase tracking-[0.25em]">
        Portfolio Intelligence
      </span>
    </div>

    <h3 className="mb-2 text-xl font-semibold text-white">
      Historical Portfolio Trend
    </h3>

    {portfolioTrend ? (
      <>

        <div className="text-3xl font-bold text-white">
          {portfolioTrend.direction === 'up'
            ? '↗'
            : portfolioTrend.direction === 'down'
            ? '↘'
            : '→'}{' '}
          {portfolioTrend.percentChange}%
        </div>

        <div className="mt-2 text-sm text-slate-300">
          Portfolio movement:
          {' '}
          {portfolioTrend.delta >= 0
            ? '+'
            : ''}
          ${portfolioTrend.delta}
        </div>

        <div className="mt-3 text-xs text-slate-500">
          First:
          {' '}
          ${portfolioTrend.firstValue}
          {' • '}
          Current:
          {' '}
          ${portfolioTrend.latestValue}
        </div>

      </>
    ) : (
      <div className="text-sm text-slate-500">
        Historical portfolio intelligence building...
      </div>
    )}

  </div>

  {/* TOP MOVERS */}

  <div className="rounded-3xl border border-purple-500/20 bg-slate-950/60 p-6 shadow-[0_0_40px_rgba(168,85,247,0.08)]">

    <div className="mb-3 flex items-center gap-2 text-purple-300">
      <IconSparkles />
      <span className="text-xs font-semibold uppercase tracking-[0.25em]">
        Market Movers
      </span>
    </div>

    <h3 className="mb-4 text-xl font-semibold text-white">
      Historical Top Movers
    </h3>

    <div className="space-y-3">

      {movers.length > 0 ? (
        movers.map((mover) => (

          <div
            key={mover.recordId}
            className="rounded-2xl border border-white/5 bg-white/[0.03] p-3"
          >

            <div className="font-medium text-white">
              {mover.artist}
            </div>

            <div className="text-xs text-slate-500">
              {mover.title}
            </div>

            <div className="mt-2 text-sm text-cyan-300">
              {mover.direction === 'up'
                ? '↗'
                : mover.direction === 'down'
                ? '↘'
                : '→'}{' '}
              {mover.percentChange}%
              {' • '}
              ${mover.delta}
            </div>

          </div>

        ))
      ) : (

        <div className="text-sm text-slate-500">
          Building historical movers intelligence...
        </div>

      )}

    </div>

  </div>

</section>
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

        <section className="grid gap-6 pb-12">
          {records.map((record, index) => (
            <motion.article
              key={`${record.id}-${index}`}
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: index * 0.002,
              }}
              className="overflow-hidden rounded-[34px] border border-white/10 bg-[#050505]/95 p-5"
            >
              <div className="grid items-start gap-5 xl:grid-cols-[140px_1fr_260px]">

                <div className="h-[140px] w-[140px] overflow-hidden rounded-[24px] border border-white/10 bg-black">

                  <img
                    src={
                      uploadedCovers[
                        record.id
                      ] ||
                      record.cover_url ||
                      fallbackCover
                    }
                    alt={
                      record.title ||
                      'Record'
                    }
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
                    {[
                      record.label,
                      record.year_released,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-black/40 p-5">

                  <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                    Discogs Release ID
                  </div>

                  <div className="mt-2 text-2xl font-black text-white">
                    #
                    {
                      record.discogs_release_id
                    }
                  </div>

                  <div className="mt-4 text-3xl font-black text-yellow-300">
                    {
                      record.estimated_value
                    }
                  </div>

                  <div className="mt-2 text-sm text-zinc-400">
                    {
                      record.market_num_for_sale
                    }{' '}
                    currently for sale
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                      Rarity Index
                    </div>

                    <div className="mt-1 text-2xl font-black text-fuchsia-300">
                      {
                        record.rarity_index
                      }
                      /100
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                      Market Momentum
                    </div>

                   <div
  className={`mt-1 text-2xl font-black ${
   getHeatBadge(
  record.market_momentum ?? null,
).tone
  }`}
>
  {
   getHeatBadge(
  record.market_momentum ?? null,
).label
  }
</div>

                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                    Collector IQ
                    </div>

                  <div className="mt-1 text-2xl font-black text-cyan-300">
                  {
                  record.collector_iq_score
                    ?? '—'
                    }
                  </div>
                  </div>


                  <div className="mt-4">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                      Market Signal
                    </div>

                    <div
                      className={`mt-1 text-xl font-black ${
                        getSignalBadge(
                          record.market_signal ?? null,
                        ).tone
                      }`}
                    >
                      {
                        getSignalBadge(
                          record.market_signal ?? null,
                        ).label
                      }
                    </div>
                  </div>
<div className="mt-4">

  <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
    Opportunity Tier
  </div>

  <div
    className={`mt-1 text-xl font-black ${
      getOpportunityTier(
        record,
      ).tone
    }`}
  >
    {
      getOpportunityTier(
        record,
      ).label
    }
  </div>

</div>

<div className="mt-4">

  <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
    AI Commentary
  </div>

  <div className="mt-2 rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-3 text-sm leading-relaxed text-cyan-100">
    {getCommentary(record)}
  </div>

</div>

<div className="mt-4 text-xs text-zinc-500">
  Last updated:{' '}
  {record.value_last_updated
    ? new Date(
        record.value_last_updated,
      ).toLocaleDateString()
    : 'Unknown'}
</div>
                </div>
              </div>
            </motion.article>
          ))}
        </section>

        {loading && (
          <div className="flex justify-center pb-12">
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-6 py-3 text-sm font-black uppercase tracking-[0.15em] text-cyan-200">
              Loading collection intelligence...
            </div>
          </div>
        )}
      </div>
    </main>
  )
}