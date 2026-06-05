'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/src/lib/supabase/client'
import CINavigation from '@/app/components/CINavigation'

const supabase = createClient()

const PAGE_SIZE = 60
const fallbackCover =
  'https://upload.wikimedia.org/wikipedia/en/b/ba/Radioheadokcomputer.png'

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
  previousValue?: number
  latestValue: number
  delta?: number
  percentChange?: number
  deltaFromPrevious?: number
  percentFromPrevious?: number
  deltaFromFirst?: number
  percentFromFirst?: number
  direction: string
  health?: string
  snapshotCount?: number
}

type DashboardRecord = Record<string, string | number | null>

function numeric(value: string | number | null | undefined) {
  const parsed = Number(String(value ?? '0').replace(/[$,]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function money(value: string | number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(numeric(value))
}

function percent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '0%'
  return `${value > 0 ? '+' : ''}${Number(value).toFixed(1)}%`
}

function getOpportunityTier(record: QueueRecord) {
  const iq = record.collector_iq_score || 0
  const rarity = record.rarity_index || 0
  const signal = record.market_signal || ''
  const momentum = record.market_momentum || ''

  if (
    signal === 'Bullish' ||
    momentum === 'Accelerating' ||
    momentum === 'Supply Compression' ||
    (iq >= 120 && rarity >= 40)
  ) {
    return { label: '🔥 Opportunity', tone: 'text-orange-300', border: 'border-orange-400/20 bg-orange-400/10' }
  }

  if (rarity >= 50 || iq >= 100) {
    return { label: '💎 Hidden Gem', tone: 'text-cyan-300', border: 'border-cyan-400/20 bg-cyan-400/10' }
  }

  if (signal === 'Bearish' || momentum === 'Cooling Down') {
    return { label: '⚠ Risk Watch', tone: 'text-rose-300', border: 'border-rose-400/20 bg-rose-400/10' }
  }

  if (iq >= 100) {
    return { label: '🧠 Elite Tier', tone: 'text-fuchsia-300', border: 'border-fuchsia-400/20 bg-fuchsia-400/10' }
  }

  return { label: '● Stable Asset', tone: 'text-zinc-300', border: 'border-white/10 bg-white/[0.04]' }
}

function getCommentary(record: QueueRecord) {
  const iq = record.collector_iq_score || 0
  const rarity = record.rarity_index || 0
  const signal = record.market_signal || ''
  const momentum = record.market_momentum || ''

  if (signal === 'Bullish' && momentum === 'Supply Compression') {
    return 'Supply tightening and bullish activity suggest strengthening collector demand.'
  }

  if (signal === 'Bullish') {
    return 'Positive market behavior suggests growing collector interest.'
  }

  if (rarity >= 85) {
    return 'High rarity may indicate scarcity-driven upside potential.'
  }

  if (iq >= 100) {
    return 'Collector intelligence places this release among elite portfolio holdings.'
  }

  if (signal === 'Bearish' || momentum === 'Cooling Down') {
    return 'Market softness suggests closer monitoring may be warranted.'
  }

  return 'Market behavior currently appears stable.'
}

function getStatusLabel(status: string | null) {
  if (status === 'up_to_date') return 'Updated'
  if (status === 'rare_no_sales_history') return 'Rare / No Sales'
  if (status === 'needs_repair') return 'Repair Queue'
  return 'Needs Update'
}

export default function ValueDashboardPage() {
  const [records, setRecords] = useState<QueueRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [lastAction, setLastAction] = useState('Initializing Portfolio Intelligence...')
  const [movers, setMovers] = useState<DashboardMover[]>([])
  const [portfolioTrend, setPortfolioTrend] = useState<PortfolioTrend | null>(null)
  const [portfolioHealth, setPortfolioHealth] = useState<any>(null)
  const [portfolioSnapshot, setPortfolioSnapshot] = useState<any>(null)
  const [portfolioDNA, setPortfolioDNA] = useState<any>(null)
  const [opportunityRadar, setOpportunityRadar] = useState<any>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null)
    })
  }, [])

  const loadIntelligence = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/intelligence', {
        cache: 'no-store',
      })

      const data = await response.json()

   if (data.success) {
  setMovers(data.movers || [])
  setPortfolioTrend(data.portfolioTrend || null)

  setPortfolioSnapshot(
    data.portfolioSnapshot || null
  )

  setPortfolioHealth(
    data.portfolioHealth || null
  )

  setPortfolioDNA(
    data.portfolioDNA || null
  )

  setOpportunityRadar(
    data.opportunityRadar || null
  )
}

      setLastRefresh(new Date())
    } catch (err) {
      console.error(err)
    }
  }, [])

  const loadRecords = useCallback(
    async (reset = false) => {
      if (loading || !userId) return

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
        .eq('user_id', userId || '')
        .order('estimated_value', {
          ascending: false,
          nullsFirst: false,
        })

      if (search.trim()) {
        query = query.or(
          `artist.ilike.%${search.trim()}%,title.ilike.%${search.trim()}%,label.ilike.%${search.trim()}%`,
        )
      }

      if (statusFilter === 'high_demand') {
        query = query.gte('demand_score', 50)
      }

      if (statusFilter === 'accelerating') {
        query = query.ilike('market_momentum', '%Accelerating%')
      }

      if (statusFilter === 'volatile') {
        query = query.gte('volatility_score', 50)
      }

      if (statusFilter === 'elite') {
        query = query.gte('collector_iq_score', 85)
      }

      if (statusFilter === 'hidden_gems') {
        query = query.gte('rarity_score', 40).gte('collector_iq_score', 70)
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
        (record: DashboardRecord, index: number) => ({
          id: String(record.id || index),
          artist: String(record.artist || record.artist_name || 'Unknown Artist'),
          title: String(record.title || record.release_title || 'Unknown Release'),
          cover_url:
            record.cover_url || record.discogs_image_url || record.image_url
              ? String(record.cover_url || record.discogs_image_url || record.image_url)
              : null,
          estimated_value:
            record.estimated_value != null ? String(record.estimated_value) : '0',
          discogs_release_id:
            record.discogs_release_id != null
              ? String(record.discogs_release_id)
              : null,
          label: String(record.label || 'Unknown Label'),
          year_released: String(record.year_released || record.year || ''),
          value_pull_status: String(record.value_pull_status || 'needs_updates'),
          market_num_for_sale:
            record.market_num_for_sale != null ? Number(record.market_num_for_sale) : 0,
          rarity_index:
            record.rarity_index != null ? Number(record.rarity_index) : 0,
          market_momentum:
            record.market_momentum != null ? String(record.market_momentum) : null,
          collector_iq_score:
            record.collector_iq_score != null ? Number(record.collector_iq_score) : null,
          market_trend:
            record.market_trend != null ? String(record.market_trend) : null,
          market_signal:
            record.market_signal != null ? String(record.market_signal) : null,
          value_last_updated:
            record.value_last_updated != null ? String(record.value_last_updated) : null,
        }),
      )

      if (reset) {
        setRecords(normalized)
      } else {
        setRecords((prev) => [...prev, ...normalized])
      }

      setHasMore(normalized.length === PAGE_SIZE)
      setPage(currentPage + 1)
      setLastAction(`Loaded ${reset ? normalized.length : records.length + normalized.length} portfolio assets.`)
      setLastRefresh(new Date())
      setLoading(false)
    },
    [loading, page, search, statusFilter, records.length, userId],
  )

  useEffect(() => {
    if (!userId) return

    const timer = setTimeout(() => {
      loadRecords(true)
      loadIntelligence()
    }, 0)

    return () => clearTimeout(timer)
  }, [userId, search, statusFilter])

  useEffect(() => {
    const interval = setInterval(() => {
      loadRecords(true)
      loadIntelligence()
    }, 300000)

    return () => clearInterval(interval)
  }, [loadRecords, loadIntelligence])

  useEffect(() => {
    function handleScroll() {
      if (loading || !hasMore) return

      const scrollPosition = window.innerHeight + window.scrollY
      const triggerPoint = document.documentElement.scrollHeight - 1200

      if (scrollPosition >= triggerPoint) {
        loadRecords(false)
      }
    }

    window.addEventListener('scroll', handleScroll)

    return () => window.removeEventListener('scroll', handleScroll)
  }, [loading, hasMore, loadRecords])

  const totalCollectionValue = records.reduce(
    (sum, record) => sum + numeric(record.estimated_value),
    0,
  )

  const highestValueRecord = [...records].sort(
    (a, b) => numeric(b.estimated_value) - numeric(a.estimated_value),
  )[0]

  const totalForSale = records.reduce(
    (sum, record) => sum + (record.market_num_for_sale || 0),
    0,
  )

  const opportunityCount = records.filter(
    (r) => getOpportunityTier(r).label === '🔥 Opportunity',
  ).length

  const hiddenGemCount = records.filter(
    (r) => getOpportunityTier(r).label === '💎 Hidden Gem',
  ).length

  const riskCount = records.filter(
    (r) => getOpportunityTier(r).label === '⚠ Risk Watch',
  ).length

  const eliteCount = records.filter(
    (r) => getOpportunityTier(r).label === '🧠 Elite Tier',
  ).length

  const iqRecords = records.filter((r) => Number(r.collector_iq_score || 0) > 0)

  const avgIq =
    iqRecords.length > 0
      ? Math.round(
          iqRecords.reduce((sum, r) => sum + (r.collector_iq_score || 0), 0) /
            iqRecords.length,
        )
      : 0

  const rarityRecords = records.filter((r) => Number(r.rarity_index || 0) > 0)

  const avgRarity =
    rarityRecords.length > 0
      ? Math.round(
          rarityRecords.reduce((sum, r) => sum + (r.rarity_index || 0), 0) /
            rarityRecords.length,
        )
      : 0

  const gainers = movers.filter((m) => m.direction === 'up').slice(0, 5)
  const decliners = movers.filter((m) => m.direction === 'down').slice(0, 5)

  const topGenres = (portfolioDNA?.genres || []).slice(0, 6)
  const topCountries = (portfolioDNA?.countries || []).slice(0, 6)

  return (
    <main className="min-h-screen bg-[#050403] px-6 py-8 text-[#F4EFE6] lg:px-10">
      <CINavigation />

      <div className="mx-auto flex max-w-[1800px] flex-col gap-8">
        <section className="relative overflow-hidden rounded-[44px] border border-[#3A2A14] bg-[radial-gradient(circle_at_top_left,rgba(255,210,30,0.16),transparent_34%),linear-gradient(135deg,#170F08,#060403_54%,#130B05)] p-9 shadow-[0_24px_100px_rgba(0,0,0,.72)]">
          <div className="absolute right-[-90px] top-[-90px] h-80 w-80 rounded-full bg-[#D8B65A]/10 blur-3xl" />
          <div className="absolute bottom-[-130px] left-[36%] h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />

          <div className="relative grid gap-8 xl:grid-cols-[1.25fr_0.75fr] xl:items-center">
            <div>
              <div className="inline-flex rounded-full border border-[#D8B65A]/25 bg-[#D8B65A]/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.35em] text-[#F4CD68]">
                Collector Intelligence Moat
              </div>

              <h1 className="mt-6 max-w-5xl text-5xl font-black leading-[0.92] tracking-tight md:text-7xl">
                Portfolio{' '}
                <span className="text-[#FFD21E]">Intelligence</span>
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-7 text-[#B8AA96]">
                Strategic valuation, concentration, risk, opportunity, and
                collector behavior analytics for your private music archive.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/collection"
                  className="rounded-2xl border border-[#D8B65A]/25 bg-[#D8B65A]/10 px-5 py-3 text-sm font-black text-[#F4CD68]"
                >
                  Collection Archive
                </Link>

                <Link
                  href="/collection/market-leaders"
                  className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 py-3 text-sm font-black text-cyan-100"
                >
                  Market Leaders
                </Link>

                <Link
                  href="/collection/market-intelligence"
                  className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/10 px-5 py-3 text-sm font-black text-fuchsia-100"
                >
                  Market Intelligence
                </Link>
              </div>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-black/35 p-5 shadow-2xl backdrop-blur-xl">
              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
                  Portfolio Engine
                </p>

                <p className="mt-2 text-3xl font-black text-white">
                  Live
                </p>
              </div>

              <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8E8170]">
                  Latest Activity
                </p>

                <p className="mt-2 text-sm font-bold text-white">
                  {lastRefresh
                    ? `Updated ${lastRefresh.toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}`
                    : lastAction}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
       <Kpi
  label="Portfolio Health"
  value={
    portfolioHealth
      ? `${portfolioHealth.score}`
      : "—"
  }
  accent
/>

<Kpi
  label="Confidence"
  value={
    portfolioHealth?.label || "—"
  }
/>

<Kpi
  label="Collection Value"
  value={
    portfolioSnapshot
      ? money(
          portfolioSnapshot.total_collection_value
        )
      : money(totalCollectionValue)
  }
/>

<Kpi
  label="High Value Assets"
  value={
    opportunityRadar
      ? String(
          opportunityRadar.highValueAssets
        )
      : "0"
  }
/>

<Kpi
  label="Elite Holdings"
  value={
    opportunityRadar
      ? String(
          opportunityRadar.eliteValueAssets
        )
      : "0"
  }
/>{portfolioHealth && (
  <div className="mb-6 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-5">
    <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">
      Portfolio Intelligence
    </div>

    <div className="mt-2 text-lg font-bold text-white">
      {portfolioHealth.label}
    </div>

    <div className="mt-2 text-sm text-zinc-300">
      {portfolioHealth.summary}
    </div>

    <ul className="mt-4 space-y-1 text-sm text-zinc-400">
      {portfolioHealth.reasons?.map(
        (
          reason: string,
          index: number,
        ) => (
          <li key={index}>
            • {reason}
          </li>
        ),
      )}
    </ul>
  </div>
)}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <DistributionCard
            title="Collection DNA"
            subtitle="Dominant genre signals across your archive"
            rows={topGenres}
            tone="cyan"
          />

          <DistributionCard
            title="Geographic Pressing Profile"
            subtitle="Country and market origin concentration"
            rows={topCountries}
            tone="amber"
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Signal
            label="🔥 High Demand"
            value={opportunityRadar?.highDemandAssets ?? opportunityCount}
            helper="Records with demand intelligence"
            tone="orange"
          />
          <Signal
            label="⚡ Accelerating"
            value={opportunityRadar?.acceleratingAssets ?? 0}
            helper="Momentum signals detected"
            tone="cyan"
          />
          <Signal
            label="⚠ Volatile"
            value={opportunityRadar?.volatileAssets ?? riskCount}
            helper="Pricing or market instability"
            tone="rose"
          />
          <Signal
            label="💎 Elite Holdings"
            value={opportunityRadar?.eliteValueAssets ?? eliteCount}
            helper="Premium portfolio assets"
            tone="fuchsia"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[34px] border border-cyan-500/20 bg-cyan-500/[0.06] p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
              Portfolio Growth Intelligence
            </p>

            <h2 className="mt-3 text-3xl font-black text-white">
              Historical Portfolio Trend
            </h2>

            {portfolioTrend ? (
              <div className="mt-6">
                <p className="text-6xl font-black text-white">
                  {portfolioTrend.direction === 'up'
                    ? '↗'
                    : portfolioTrend.direction === 'down'
                      ? '↘'
                      : '→'}{' '}
                  {percent(portfolioTrend.percentFromFirst ?? portfolioTrend.percentFromPrevious ?? portfolioTrend.percentChange)}
                </p>

                <p className="mt-4 text-lg font-bold text-cyan-100">
                  Historical movement {(portfolioTrend.deltaFromFirst ?? portfolioTrend.delta ?? 0) >= 0 ? '+' : ''}
                  {money(portfolioTrend.deltaFromFirst ?? portfolioTrend.delta ?? 0)}
                </p>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <Mini label="First Value" value={money(portfolioTrend.firstValue)} />
                  <Mini label="Latest Value" value={money(portfolioTrend.latestValue)} />
                </div>
              </div>
            ) : (
              <p className="mt-6 text-sm text-cyan-100/60">
                Historical portfolio intelligence is building.
              </p>
            )}
          </div>

          <div className="rounded-[34px] border border-purple-500/20 bg-purple-500/[0.06] p-6 shadow-[0_0_40px_rgba(168,85,247,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-purple-300">
              Market Movers
            </p>

            <h2 className="mt-3 text-3xl font-black text-white">
              Top Portfolio Movers
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <MoverPanel title="Biggest Gainers" movers={gainers} empty="No gainers detected yet." />
              <MoverPanel title="Risk Decliners" movers={decliners} empty="No decliners detected yet." />
            </div>
          </div>
        </section>

        <section className="rounded-[34px] border border-[#32281D] bg-[#0F0C09] p-6 shadow-2xl">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#D8B65A]">
                Portfolio Control Layer
              </p>

              <h2 className="mt-3 text-3xl font-black">
                Portfolio Signal Search
                <span className="ml-3 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  Portfolio UI v2.1 — Signal Filters Active
                </span>
              </h2>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search artist, title, or label..."
                className="h-14 min-w-[320px] rounded-2xl border border-[#3A3025] bg-[#090705] px-5 text-white outline-none"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-14 rounded-2xl border border-[#3A3025] bg-[#090705] px-5 text-white outline-none"
              >
                <option value="all">All Records</option>
                <option value="high_demand">High Demand</option>
                <option value="accelerating">Accelerating</option>
                <option value="volatile">Volatile</option>
                <option value="elite">Elite Holdings</option>
                <option value="hidden_gems">Hidden Gems</option>
              </select>
            </div>
          </div>
        </section>

        <section className="grid gap-5 pb-12">
          {records.slice(0, 180).map((record, index) => {
            const tier = getOpportunityTier(record)

            return (
              <Link
                key={`${record.id}-${index}`}
                href={`/collection/${record.id}`}
                className={`group overflow-hidden rounded-[34px] border bg-gradient-to-br from-[#130F0B] to-[#070504] p-5 shadow-2xl shadow-black/40 transition duration-300 hover:-translate-y-1 hover:border-[#D8B65A]/35 ${tier.border}`}
              >
                <div className="grid items-start gap-5 xl:grid-cols-[150px_1fr_280px]">
                  <div className="h-[150px] w-[150px] overflow-hidden rounded-[26px] border border-white/10 bg-black">
                    <img
                      src={record.cover_url || fallbackCover}
                      alt={record.title || 'Record'}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  <div>
                    <div className={`inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${tier.border} ${tier.tone}`}>
                      {tier.label}
                    </div>

                    <p className="mt-5 text-sm font-black uppercase tracking-[0.3em] text-[#D8B65A]">
                      {record.artist}
                    </p>

                    <h3 className="mt-2 text-4xl font-black text-white">
                      {record.title}
                    </h3>

                    <p className="mt-3 text-sm text-[#A89782]">
                      {[record.label, record.year_released].filter(Boolean).join(' • ') || 'Release details pending'}
                    </p>

                    <p className="mt-5 max-w-3xl text-sm leading-6 text-[#B8AA96]">
                      {getCommentary(record)}
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-black/40 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                      Estimated Value
                    </p>

                    <p className="mt-2 text-3xl font-black text-[#E5C67A]">
                      {money(record.estimated_value)}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <Mini label="IQ" value={String(record.collector_iq_score ?? '—')} />
                      <Mini label="Rarity" value={`${record.rarity_index ?? '—'}/100`} />
                      <Mini label="For Sale" value={String(record.market_num_for_sale ?? '—')} />
                      <Mini label="Status" value={getStatusLabel(record.value_pull_status)} />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </section>

        {hasMore ? (
          <button
            disabled={loading}
            onClick={() => loadRecords(false)}
            className="mx-auto mb-12 rounded-2xl border border-[#D8B65A]/30 bg-[#D8B65A]/10 px-6 py-4 text-sm font-black text-[#F4CD68] disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More Assets'}
          </button>
        ) : null}
      </div>
    </main>
  )
}

function Kpi({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-[28px] border border-[#32281D] bg-[#100D09] p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-[#8E8170]">
        {label}
      </p>

      <p className={accent ? 'mt-3 text-3xl font-black text-[#D8B65A]' : 'mt-3 text-3xl font-black text-white'}>
        {value}
      </p>
    </div>
  )
}

function Signal({
  label,
  value,
  helper,
  tone,
}: {
  label: string
  value: number
  helper: string
  tone: 'orange' | 'cyan' | 'rose' | 'fuchsia'
}) {
  const tones = {
    orange: 'border-orange-500/20 bg-orange-500/[0.08] text-orange-200',
    cyan: 'border-cyan-500/20 bg-cyan-500/[0.08] text-cyan-200',
    rose: 'border-rose-500/20 bg-rose-500/[0.08] text-rose-200',
    fuchsia: 'border-fuchsia-500/20 bg-fuchsia-500/[0.08] text-fuchsia-200',
  }

  return (
    <div className={`rounded-[28px] border p-5 ${tones[tone]}`}>
      <p className="text-xs font-black uppercase tracking-[0.22em]">
        {label}
      </p>
      <p className="mt-3 text-4xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-[#B8AA96]">{helper}</p>
    </div>
  )
}

function DistributionCard({
  title,
  subtitle,
  rows,
  tone,
}: {
  title: string
  subtitle: string
  rows: Array<{ label: string; count: number }>
  tone: 'cyan' | 'amber'
}) {
  const total = rows.reduce((sum, row) => sum + Number(row.count || 0), 0)

  const styles = {
    cyan: 'border-cyan-500/20 bg-cyan-500/[0.06] text-cyan-200',
    amber: 'border-[#D8B65A]/20 bg-[#D8B65A]/[0.07] text-[#F4CD68]',
  }

  return (
    <div className={`rounded-[34px] border p-6 shadow-2xl ${styles[tone]}`}>
      <p className="text-xs font-black uppercase tracking-[0.3em]">
        {title}
      </p>

      <h2 className="mt-3 text-2xl font-black text-white">
        {subtitle}
      </h2>

      <div className="mt-6 space-y-4">
        {rows.length > 0 ? (
          rows.map((row) => {
            const pct = total > 0 ? Math.round((Number(row.count) / total) * 100) : 0

            return (
              <div key={row.label}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-bold text-white">{row.label}</span>
                  <span className="text-zinc-400">{row.count}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full rounded-full bg-current"
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>
              </div>
            )
          })
        ) : (
          <p className="text-sm text-zinc-400">
            Portfolio DNA is still building.
          </p>
        )}
      </div>
    </div>
  )
}

function Mini({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#7B7061]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-white">
        {value}
      </p>
    </div>
  )
}

function MoverPanel({
  title,
  movers,
  empty,
}: {
  title: string
  movers: DashboardMover[]
  empty: string
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-200">
        {title}
      </p>

      <div className="mt-4 space-y-3">
        {movers.length > 0 ? (
          movers.map((mover) => (
            <div
              key={mover.recordId}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
            >
              <p className="font-black text-white">{mover.artist}</p>
              <p className="text-xs text-zinc-500">{mover.title}</p>
              <p className="mt-2 text-sm font-bold text-cyan-300">
                {mover.direction === 'up'
                  ? '↗'
                  : mover.direction === 'down'
                    ? '↘'
                    : '→'}{' '}
                {percent(mover.percentChange)} • {money(mover.delta)}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">{empty}</p>
        )}
      </div>
    </div>
  )
}
