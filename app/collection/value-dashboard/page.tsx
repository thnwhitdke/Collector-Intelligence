'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import CINavigation from '@/app/components/CINavigation'
import { createClient } from '@/src/lib/supabase/client'

export const dynamic = 'force-dynamic'

const supabase = createClient()
const fallbackCover = 'https://upload.wikimedia.org/wikipedia/en/b/ba/Radioheadokcomputer.png'

type Filter = 'all' | 'high_value' | 'elite' | 'high_demand' | 'accelerating' | 'volatile' | 'hidden_gems'

type AssetRecord = {
  id: number
  artist: string | null
  title: string | null
  cover_url: string | null
  discogs_image_url: string | null
  estimated_value: string | number | null
  market_consensus_value: string | number | null
  discogs_median_price: string | number | null
  discogs_low_price?: string | number | null
  discogs_high_price?: string | number | null
  manual_comp_price?: string | number | null
  valuation_source?: string | null
  label: string | null
  year: number | null
  year_released: string | null
  collector_iq_score: number | null
  rarity_score: number | null
  demand_score: number | null
  volatility_score: number | null
  market_momentum: string | null
  market_signal: string | null
  value_pull_status: string | null
  value_source: string | null
  genre: string | null
  style: string | null
  country: string | null
}

type ValueHistoryRow = {
  record_id: number
  estimated_value: number | null
  snapshot_date: string
}

type Mover = {
  recordId: number
  artist: string | null
  title: string | null
  delta: number
  percentChange: number
  direction: 'up' | 'down'
}

function numeric(value: unknown) {
  const parsed = Number(String(value ?? '0').replace(/[$,]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function money(value: unknown, cents = false) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(numeric(value))
}

function signedMoney(value: unknown) {
  const n = numeric(value)
  const sign = n > 0 ? '+' : n < 0 ? '-' : ''
  return `${sign}${money(Math.abs(n), true)}`
}

function percent(value: unknown) {
  const n = numeric(value)
  if (!n) return '0%'
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
}

function consensusValue(record: AssetRecord) {
  const source = String(record.value_source || '').toLowerCase()
  const valuationSource = String(record.valuation_source || '').toLowerCase()
  const status = String(record.value_pull_status || '').toLowerCase()

  const manualComp = numeric(record.manual_comp_price)
  if (manualComp > 0 || valuationSource.includes('manual') || source.includes('manual')) {
    return manualComp || numeric(record.market_consensus_value) || numeric(record.estimated_value)
  }

  if (
    source === 'suppressed_valuation_anomaly' ||
    status === 'valuation_anomaly' ||
    status === 'needs_manual_value_review'
  ) {
    return 0
  }

  const low = numeric(record.discogs_low_price)
  const median = numeric(record.discogs_median_price)
  const high = numeric(record.discogs_high_price)

  const impossibleSpread =
    low > 0 &&
    median > 0 &&
    median / low > 20 &&
    source.includes('repair')

  if (impossibleSpread) return 0

  if (
    status === 'no_discogs_value_available' &&
    source.includes('discogs_median_repair')
  ) {
    return 0
  }

  return numeric(record.market_consensus_value)
}

function statusLabel(status: string | null) {
  if (status === 'up_to_date') return 'Updated'
  if (status === 'rare_no_sales_history') return 'Rare / No Sales'
  if (status === 'needs_repair') return 'Repair'
  return 'Needs Signal'
}

function filterName(filter: Filter) {
  if (filter === 'high_value') return 'High Value Assets'
  if (filter === 'elite') return 'Elite Holdings'
  if (filter === 'high_demand') return 'High Demand'
  if (filter === 'accelerating') return 'Accelerating'
  if (filter === 'volatile') return 'Volatile'
  if (filter === 'hidden_gems') return 'Hidden Gems'
  return 'All Records'
}

function assetTier(record: AssetRecord) {
  const value = consensusValue(record)
  const demand = numeric(record.demand_score)
  const volatility = numeric(record.volatility_score)
  const rarity = numeric(record.rarity_score)
  const momentum = String(record.market_momentum || '').toLowerCase()

  if (value > 1000) return 'Elite Holding'
  if (value > 500) return 'High Value'
  if (demand >= 50) return 'High Demand'
  if (momentum.includes('acceler')) return 'Accelerating'
  if (volatility >= 50) return 'Volatile'
  if (rarity >= 40) return 'Hidden Gem'
  return 'Stable'
}

function topDistribution(records: AssetRecord[], key: keyof AssetRecord, limit = 6) {
  const map = new Map<string, number>()

  records.forEach((record) => {
    const label = String(record[key] || 'Unknown').trim() || 'Unknown'
    map.set(label, (map.get(label) || 0) + 1)
  })

  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

function buildMovers(records: AssetRecord[], history: ValueHistoryRow[]) {
  const recordMap = new Map(records.map((record) => [Number(record.id), record]))
  const grouped = new Map<number, ValueHistoryRow[]>()

  history.forEach((row) => {
    if (!row.record_id || !row.estimated_value) return
    if (!grouped.has(row.record_id)) grouped.set(row.record_id, [])
    grouped.get(row.record_id)!.push(row)
  })

  const rawMovers: Mover[] = []

  grouped.forEach((rows, recordId) => {
    const sorted = [...rows].sort(
      (a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime(),
    )

    const latest = sorted[0]
    const previous = sorted.find((row) => row.snapshot_date !== latest.snapshot_date)

    if (!latest || !previous) return

    const latestValue = numeric(latest.estimated_value)
    const previousValue = numeric(previous.estimated_value)
    const delta = Number((latestValue - previousValue).toFixed(2))

    if (Math.abs(delta) < 25) return

    const percentChange = previousValue > 0 ? Number(((delta / previousValue) * 100).toFixed(2)) : 0
    const record = recordMap.get(recordId)

    rawMovers.push({
      recordId,
      artist: record?.artist || 'Unknown Artist',
      title: record?.title || 'Unknown Release',
      delta,
      percentChange,
      direction: delta > 0 ? 'up' : 'down',
    })
  })

  const bestByRelease = new Map<string, Mover>()

  rawMovers.forEach((mover) => {
    const key = `${String(mover.artist || '').toLowerCase().trim()}|${String(mover.title || '').toLowerCase().trim()}`
    const current = bestByRelease.get(key)

    if (!current || Math.abs(mover.delta) > Math.abs(current.delta)) {
      bestByRelease.set(key, mover)
    }
  })

  const artistCounts = new Map<string, number>()

  return Array.from(bestByRelease.values())
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || Math.abs(b.percentChange) - Math.abs(a.percentChange))
    .filter((mover) => {
      const artist = String(mover.artist || 'Unknown Artist').toLowerCase().trim()
      const count = artistCounts.get(artist) || 0

      if (count >= 2) return false

      artistCounts.set(artist, count + 1)
      return true
    })
}


export default function ValueDashboardPage() {
  const [authReady, setAuthReady] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [records, setRecords] = useState<AssetRecord[]>([])
  const [history, setHistory] = useState<ValueHistoryRow[]>([])
  const [portfolioSnapshots, setPortfolioSnapshots] = useState<Array<{ created_at: string; total_collection_value: number | string | null; total_records: number | null }>>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setUserId(user?.id || null)
      setAuthReady(true)
    }

    init()
  }, [])

  useEffect(() => {
    async function load() {
      if (!userId) return

      setLoading(true)

      const { data: recordData, error } = await supabase
        .from('records_clean_safe')
        .select(`
          id,
          artist,
          title,
          cover_url,
          discogs_image_url,
          estimated_value,
          market_consensus_value,
          discogs_median_price,
          discogs_low_price,
          discogs_high_price,
          manual_comp_price,
          valuation_source,
          label,
          year,
          year_released,
          collector_iq_score,
          rarity_score,
          demand_score,
          volatility_score,
          market_momentum,
          market_signal,
          value_pull_status,
          value_source,
          genre,
          style,
          country
        `)
        .eq('user_id', userId)
        .order('market_consensus_value', { ascending: false, nullsFirst: false })
        .limit(5000)

      if (error) {
        console.error(error)
        setRecords([])
        setLoading(false)
        return
      }

      const safeRecords = (recordData || []) as AssetRecord[]
      setRecords(safeRecords)

      const ids = safeRecords.map((record) => record.id)
      const historyRows: ValueHistoryRow[] = []

      for (let i = 0; i < ids.length; i += 500) {
        const batch = ids.slice(i, i + 500)

        const { data: batchHistory, error: historyError } = await supabase
          .from('value_history')
          .select('record_id, estimated_value, snapshot_date')
          .in('record_id', batch)
          .order('snapshot_date', { ascending: false })

        if (historyError) {
          console.error(historyError)
          continue
        }

        historyRows.push(...((batchHistory || []) as ValueHistoryRow[]))
      }

      setHistory(historyRows)

      const { data: snapshotRows, error: snapshotError } = await supabase
        .from('portfolio_intelligence_snapshots')
        .select('created_at, total_collection_value, total_records')
        .eq('user_id', userId)
        .gte('total_records', Math.max(100, Math.floor(safeRecords.length * 0.95)))
        .order('created_at', { ascending: true })

      if (snapshotError) {
        console.error(snapshotError)
        setPortfolioSnapshots([])
      } else {
        setPortfolioSnapshots(snapshotRows || [])
      }

      setLastRefresh(new Date())
      setLoading(false)
    }

    load()
  }, [userId])

  const portfolioValue = useMemo(
    () => records.reduce((sum, record) => sum + consensusValue(record), 0),
    [records],
  )

  const valuedRecords = useMemo(
    () => records.filter((record) => consensusValue(record) > 0).length,
    [records],
  )

  const healthScore = records.length
    ? Math.round((valuedRecords / records.length) * 100)
    : 0

  const confidence =
    healthScore >= 90 ? 'High' : healthScore >= 70 ? 'Moderate' : healthScore >= 40 ? 'Developing' : 'Low'

  const highValue = records.filter((record) => consensusValue(record) > 500)
  const elite = records.filter((record) => consensusValue(record) > 1000)
  const highDemand = records.filter((record) => numeric(record.demand_score) >= 50)
  const accelerating = records.filter((record) =>
    String(record.market_momentum || '').toLowerCase().includes('acceler'),
  )
  const volatile = records.filter((record) => numeric(record.volatility_score) >= 50)

  const dnaGenres = topDistribution(records, 'genre')
  const dnaCountries = topDistribution(records, 'country')
  const movers = buildMovers(records, history)
  const gainers = movers.filter((mover) => mover.direction === 'up').slice(0, 5)
  const decliners = movers.filter((mover) => mover.direction === 'down').slice(0, 5)

  const trend = useMemo(() => {
    const rows = portfolioSnapshots
      .map((snapshot) => ({
        createdAt: snapshot.created_at,
        value: numeric(snapshot.total_collection_value),
      }))
      .filter((snapshot) => snapshot.value > 0)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

    if (rows.length < 2) return null

    const first = rows[0].value
    const latest = rows[rows.length - 1].value
    const previous = rows[rows.length - 2].value
    const delta = latest - first
    const percentChange = first > 0 ? (delta / first) * 100 : 0

    return {
      first,
      latest,
      previous,
      delta,
      percentChange,
      direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
      snapshots: rows.length,
    }
  }, [portfolioSnapshots])

  const filteredRecords = useMemo(() => {
    return records
      .filter((record) => {
      const query = search.trim().toLowerCase()
      const value = consensusValue(record)
      const text = [
        record.artist,
        record.title,
        record.label,
        record.genre,
        record.style,
        record.country,
        record.market_signal,
        record.market_momentum,
      ]
        .join(' ')
        .toLowerCase()

      if (query && !text.includes(query)) return false
      if (filter === 'high_value') return value > 500
      if (filter === 'elite') return value > 1000
      if (filter === 'high_demand') return numeric(record.demand_score) >= 50
      if (filter === 'accelerating') return String(record.market_momentum || '').toLowerCase().includes('acceler')
      if (filter === 'volatile') return numeric(record.volatility_score) >= 50
      if (filter === 'hidden_gems') return numeric(record.rarity_score) >= 40 && value < 500

      return true
    })
      .sort((a, b) => consensusValue(b) - consensusValue(a))
  }, [records, search, filter])

  if (!authReady) {
    return (
      <main className="min-h-screen bg-[#050403] px-6 py-8 text-[#F4EFE6] lg:px-10">
        <CINavigation />
        <LoadingState />
      </main>
    )
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-[#050403] px-6 py-8 text-[#F4EFE6] lg:px-10">
        <CINavigation />
        <div className="mx-auto mt-24 max-w-3xl rounded-[34px] border border-amber-500/20 bg-amber-500/[0.06] p-10 text-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">Authentication Required</p>
          <h1 className="mt-4 text-4xl font-black text-white">Sign in to view Portfolio Intelligence</h1>
          <Link href="/auth/login" className="mt-8 inline-flex rounded-2xl bg-[#D8B65A] px-6 py-4 text-sm font-black text-black">
            Sign In
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#050403] px-6 py-8 text-[#F4EFE6] lg:px-10">
      <CINavigation />

      <div className="mx-auto flex max-w-[1800px] flex-col gap-8">
        <section className="relative overflow-hidden rounded-[44px] border border-[#3A2A14] bg-[radial-gradient(circle_at_top_left,rgba(255,210,30,0.16),transparent_34%),linear-gradient(135deg,#170F08,#060403_54%,#130B05)] p-9 shadow-[0_24px_100px_rgba(0,0,0,.72)]">
          <div className="relative grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-center">
            <div>
              <div className="inline-flex rounded-full border border-[#D8B65A]/25 bg-[#D8B65A]/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.35em] text-[#F4CD68]">
                Collector Intelligence Moat
              </div>

              <h1 className="mt-6 max-w-5xl text-5xl font-black leading-[0.92] tracking-tight md:text-7xl">
                Portfolio <span className="text-[#FFD21E]">Intelligence</span>
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-7 text-[#B8AA96]">
                Strategic valuation, concentration, risk, opportunity, and collector behavior analytics for your private music archive.
              </p>
            </div>

            <div className="rounded-[34px] border border-cyan-500/20 bg-black/40 p-6">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">Portfolio Health</p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-6xl font-black text-white">{healthScore || '—'}</p>
                  <p className="mt-2 text-xl font-black text-[#F4CD68]">{confidence}</p>
                </div>
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">Engine</p>
                  <p className="mt-1 text-2xl font-black text-white">{loading ? 'Loading' : 'Live'}</p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-zinc-300">
                {valuedRecords.toLocaleString()} of {records.length.toLocaleString()} records have usable value intelligence.
              </p>

              <p className="mt-5 text-xs font-bold text-zinc-500">
                {lastRefresh
                  ? `Updated ${lastRefresh.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                  : 'Connecting portfolio engine...'}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Kpi label="Portfolio Health" value={loading ? '—' : String(healthScore)} accent />
          <Kpi label="Confidence" value={loading ? '—' : confidence} />
          <Kpi label="Collection Value" value={loading ? '—' : money(portfolioValue)} helper="Show all records" active={filter === 'all'} onClick={() => setFilter('all')} />
          <Kpi label="High Value Assets" value={String(highValue.length)} helper="Filter value > $500" active={filter === 'high_value'} onClick={() => setFilter('high_value')} />
          <Kpi label="Elite Holdings" value={String(elite.length)} helper="Filter value > $1,000" active={filter === 'elite'} onClick={() => setFilter('elite')} />
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <DistributionCard title="Collection DNA" subtitle="Dominant genre signals across your archive" rows={dnaGenres} tone="cyan" />
          <DistributionCard title="Geographic Pressing Profile" subtitle="Country and market-origin concentration" rows={dnaCountries} tone="amber" />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Signal label="🔥 High Demand" value={highDemand.length} helper="Records with demand intelligence" tone="orange" active={filter === 'high_demand'} onClick={() => setFilter(filter === 'high_demand' ? 'all' : 'high_demand')} />
          <Signal label="⚡ Accelerating" value={accelerating.length} helper={accelerating.length > 0 ? 'Momentum signals detected' : 'No current signals'} tone="cyan" active={filter === 'accelerating'} onClick={() => setFilter(filter === 'accelerating' ? 'all' : 'accelerating')} />
          <Signal label="⚠ Volatile" value={volatile.length} helper="Pricing or market instability" tone="rose" active={filter === 'volatile'} onClick={() => setFilter(filter === 'volatile' ? 'all' : 'volatile')} />
          <Signal label="💎 Elite Holdings" value={elite.length} helper="Premium portfolio assets" tone="fuchsia" active={filter === 'elite'} onClick={() => setFilter(filter === 'elite' ? 'all' : 'elite')} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[34px] border border-cyan-500/20 bg-cyan-500/[0.06] p-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">Portfolio Growth Intelligence</p>
            <h2 className="mt-3 text-3xl font-black text-white">Portfolio Value Trend</h2>
            <p className="mt-6 text-6xl font-black text-white">
              {trend?.direction === 'up' ? '↗' : trend?.direction === 'down' ? '↘' : '→'} {percent(trend?.percentChange ?? 0)}
            </p>
            <p className="mt-4 text-lg font-bold text-cyan-100">
              Historical movement {money(trend?.delta ?? 0)}
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <Mini label="First Value" value={money(trend?.first ?? 0)} />
              <Mini label="Latest Value" value={money(trend?.latest ?? portfolioValue)} />
            </div>
          </div>

          <div className="rounded-[34px] border border-purple-500/20 bg-purple-500/[0.06] p-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-purple-300">Recent Market Movers</p>
            <h2 className="mt-3 text-3xl font-black text-white">Top Portfolio Movers</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Based on recent value-history snapshots. Records appear only when movement exceeds $25.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <MoverPanel title="Biggest Gainers" movers={gainers} empty="No recent gainers above $25 were detected." />
              <MoverPanel title="Risk Decliners" movers={decliners} empty="No recent decliners above $25 were detected." />
            </div>
          </div>
        </section>

        <section className="rounded-[34px] border border-[#32281D] bg-[#0F0C09] p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#D8B65A]">Portfolio Control Layer</p>
              <h2 className="mt-3 text-3xl font-black">Portfolio Signal Search</h2>
              <p className="mt-2 text-sm text-[#8E8170]">
                Showing {filteredRecords.length.toLocaleString()} of {records.length.toLocaleString()} records · {filterName(filter)}
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search artist, title, label, country, genre..."
                className="h-14 min-w-[320px] rounded-2xl border border-[#3A3025] bg-[#090705] px-5 text-white outline-none"
              />

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as Filter)}
                className="h-14 rounded-2xl border border-[#3A3025] bg-[#090705] px-5 text-white outline-none"
              >
                <option value="all">All Records</option>
                <option value="high_value">High Value Assets</option>
                <option value="elite">Elite Holdings</option>
                <option value="high_demand">High Demand</option>
                <option value="accelerating">Accelerating</option>
                <option value="volatile">Volatile</option>
                <option value="hidden_gems">Hidden Gems</option>
              </select>
            </div>
          </div>
        </section>

        <section className="grid gap-5 pb-12">
          {loading ? (
            <div className="rounded-[34px] border border-white/10 bg-white/[0.03] p-10 text-center text-zinc-400">
              Loading portfolio assets...
            </div>
          ) : filteredRecords.length > 0 ? (
            filteredRecords.map((record) => (
              <Link
                key={record.id}
                href={`/collection/${record.id}`}
                className="group overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-[#130F0B] to-[#070504] p-5 shadow-2xl shadow-black/40 transition duration-300 hover:-translate-y-1 hover:border-[#D8B65A]/35"
              >
                <div className="grid items-start gap-5 xl:grid-cols-[150px_1fr_280px]">
                  <div className="h-[150px] w-[150px] overflow-hidden rounded-[26px] border border-white/10 bg-black">
                    <img
                      src={record.cover_url || record.discogs_image_url || fallbackCover}
                      alt={record.title || 'Record'}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  <div>
                    <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                      {assetTier(record)}
                    </div>
                    <p className="mt-5 text-sm font-black uppercase tracking-[0.3em] text-[#D8B65A]">{record.artist}</p>
                    <h3 className="mt-2 text-4xl font-black text-white">{record.title}</h3>
                    <p className="mt-3 text-sm text-[#A89782]">
                      {[record.label, record.year_released || record.year].filter(Boolean).join(' • ') || 'Release details pending'}
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-black/40 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">Market Consensus</p>
                    <p className="mt-2 text-3xl font-black text-[#E5C67A]">{money(consensusValue(record))}</p>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <Mini label="IQ" value={String(record.collector_iq_score ?? '—')} />
                      <Mini label="Rarity" value={`${record.rarity_score ?? '—'}/100`} />
                      <Mini label="Demand" value={String(record.demand_score ?? '—')} />
                      <Mini label="Status" value={statusLabel(record.value_pull_status)} />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-[34px] border border-white/10 bg-white/[0.03] p-10 text-center text-zinc-400">
              No portfolio assets match the current search or selected filter.
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function LoadingState() {
  return (
    <div className="mx-auto mt-24 max-w-4xl rounded-[34px] border border-cyan-500/20 bg-cyan-500/[0.06] p-10 text-center">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">Portfolio Intelligence</p>
      <h1 className="mt-4 text-4xl font-black text-white">Loading your portfolio intelligence…</h1>
      <p className="mt-4 text-zinc-400">Connecting authenticated collection, market signals, and portfolio health.</p>
    </div>
  )
}

function Kpi({ label, value, helper, accent = false, active = false, onClick }: {
  label: string
  value: string
  helper?: string
  accent?: boolean
  active?: boolean
  onClick?: () => void
}) {
  const className = `rounded-[28px] border p-6 text-left transition ${
    active ? 'border-[#D8B65A]/60 bg-[#D8B65A]/[0.08] ring-2 ring-[#D8B65A]/25' : 'border-[#32281D] bg-[#100D09]'
  } ${onClick ? 'hover:-translate-y-1 hover:border-[#D8B65A]/45' : ''}`

  const content = (
    <>
      <p className="text-xs uppercase tracking-[0.25em] text-[#8E8170]">{label}</p>
      <p className={accent ? 'mt-3 text-3xl font-black text-[#D8B65A]' : 'mt-3 text-3xl font-black text-white'}>{value}</p>
      {helper ? <p className="mt-2 text-xs font-bold text-[#8E8170]">{active ? 'Active filter' : helper}</p> : null}
    </>
  )

  return onClick ? (
    <button type="button" onClick={onClick} className={className}>{content}</button>
  ) : (
    <div className={className}>{content}</div>
  )
}

function Signal({ label, value, helper, tone, active = false, onClick }: {
  label: string
  value: number
  helper: string
  tone: 'orange' | 'cyan' | 'rose' | 'fuchsia'
  active?: boolean
  onClick?: () => void
}) {
  const tones = {
    orange: 'border-orange-500/20 bg-orange-500/[0.08] text-orange-200',
    cyan: 'border-cyan-500/20 bg-cyan-500/[0.08] text-cyan-200',
    rose: 'border-rose-500/20 bg-rose-500/[0.08] text-rose-200',
    fuchsia: 'border-fuchsia-500/20 bg-fuchsia-500/[0.08] text-fuchsia-200',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[28px] border p-5 text-left transition hover:-translate-y-1 hover:border-[#D8B65A]/45 ${tones[tone]} ${active ? 'ring-2 ring-[#D8B65A]/50' : ''}`}
    >
      <p className="text-xs font-black uppercase tracking-[0.22em]">{label}</p>
      <p className="mt-3 text-4xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-[#B8AA96]">{active ? 'Active filter' : helper}</p>
    </button>
  )
}

function DistributionCard({ title, subtitle, rows, tone }: {
  title: string
  subtitle: string
  rows: Array<{ label: string; count: number }>
  tone: 'cyan' | 'amber'
}) {
  const max = Math.max(...rows.map((row) => Number(row.count || 0)), 1)
  const styles = {
    cyan: 'border-cyan-500/20 bg-cyan-500/[0.06] text-cyan-200',
    amber: 'border-[#D8B65A]/20 bg-[#D8B65A]/[0.07] text-[#F4CD68]',
  }

  return (
    <div className={`rounded-[34px] border p-6 shadow-2xl ${styles[tone]}`}>
      <p className="text-xs font-black uppercase tracking-[0.3em]">{title}</p>
      <h2 className="mt-3 text-2xl font-black text-white">{subtitle}</h2>
      <div className="mt-6 space-y-4">
        {rows.length > 0 ? rows.map((row) => {
          const pct = Math.round((Number(row.count) / max) * 100)
          return (
            <div key={row.label}>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-bold text-white">{row.label}</span>
                <span className="text-zinc-400">{row.count}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
                <div className="h-full rounded-full bg-current" style={{ width: `${Math.max(4, pct)}%` }} />
              </div>
            </div>
          )
        }) : (
          <p className="text-sm text-zinc-400">Portfolio DNA is still building.</p>
        )}
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#7B7061]">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  )
}

function MoverPanel({ title, movers, empty }: { title: string; movers: Mover[]; empty: string }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-200">{title}</p>
      <div className="mt-4 space-y-3">
        {movers.length > 0 ? movers.map((mover) => (
          <Link
            key={mover.recordId}
            href={`/collection/${mover.recordId}`}
            className="block rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-[#D8B65A]/40 hover:bg-white/[0.06]"
          >
            <p className="font-black text-white">{mover.artist}</p>
            <p className="text-xs text-zinc-500">{mover.title}</p>
            <p className="mt-2 text-sm font-bold text-cyan-300">
              {mover.direction === 'up' ? '↗' : '↘'} {percent(mover.percentChange)} · {signedMoney(mover.delta)}
            </p>
          </Link>
        )) : (
          <p className="text-sm leading-6 text-zinc-500">{empty}</p>
        )}
      </div>
    </div>
  )
}
