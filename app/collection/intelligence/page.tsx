export const dynamic = "force-dynamic"
export const revalidate = 0

import Link from "next/link"
import { redirect } from "next/navigation"
import CINavigation from "@/app/components/CINavigation"
import CollectionIntelligenceRadar from "@/app/components/CollectionIntelligenceRadar"
import { createClient } from "@/src/lib/supabase/server"
import { createAdminClient } from "@/src/lib/supabase/admin"
import { displayArtistName } from "@/src/lib/display/artist"

function money(value: unknown) {
  return `$${Math.round(Number(value || 0)).toLocaleString()}`
}

function num(value: unknown) {
  return Number(value || 0).toLocaleString()
}

function pct(part: number, whole: number) {
  if (!whole) return "0%"
  return `${((part / whole) * 100).toFixed(2)}%`
}

function score(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function Card({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
      <div className="text-sm text-[#B8AA96]">{label}</div>
      <div className="mt-2 text-3xl font-black text-white">{value}</div>
      <div className="mt-2 text-xs leading-5 text-[#8E8170]">{helper}</div>
    </div>
  )
}

function DataList({
  title,
  helper,
  rows,
  metricLabel,
  metric,
}: {
  title: string
  helper: string
  rows: any[]
  metricLabel: string
  metric: (row: any) => string
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#111111] p-6">
      <h2 className="text-2xl font-black text-white">{title}</h2>
      <p className="mt-2 text-sm text-[#8E8170]">{helper}</p>

      <div className="mt-5 space-y-3">
        {rows.length ? (
          rows.map((r: any, index: number) => (
            <Link
              key={`${title}-${r.id || r.record_id || r.name || index}`}
              href={r.id || r.record_id ? `/collection/${r.id || r.record_id}?returnTo=/collection/intelligence` : "/collection/intelligence"}
              className="block rounded-2xl bg-[#1A1A1A] p-4 transition hover:bg-[#242424]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-black text-white">{displayArtistName(r.artist || r.name || "Unknown")}</div>
                  <div className="text-sm font-semibold text-[#B8AA96]">{r.title || r.subtitle || ""}</div>
                  <div className="mt-1 text-xs text-[#8E8170]">{r.reason || r.detail || ""}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-white">{metric(r)}</div>
                  <div className="text-xs text-[#B8AA96]">{metricLabel}</div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl bg-[#1A1A1A] p-4 text-sm text-[#8E8170]">
            No usable records found for this signal yet.
          </div>
        )}
      </div>
    </section>
  )
}

function BarList({
  title,
  helper,
  rows,
}: {
  title: string
  helper: string
  rows: { label: string; value: number; helper: string }[]
}) {
  const max = Math.max(1, ...rows.map((r) => r.value))

  return (
    <section className="rounded-3xl border border-white/10 bg-[#111111] p-6">
      <h2 className="text-2xl font-black text-white">{title}</h2>
      <p className="mt-2 text-sm text-[#8E8170]">{helper}</p>

      <div className="mt-6 space-y-5">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex justify-between gap-4 text-sm">
              <span className="font-bold text-white">{row.label}</span>
              <span className="text-[#B8AA96]">{row.helper}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-yellow-300"
                style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default async function IntelligencePage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const userId = user.id

  const [portfolioRes, collectionRes, warehouseRes, auctionRes] = await Promise.all([
    supabase
      .from("portfolio_intelligence_v2")
      .select("*")
      .eq("user_id", userId)
      .order("total_records", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("records_clean_safe")
      .select("id, artist, title, label, country, format, discogs_release_id, estimated_value")
      .eq("user_id", userId)
      .limit(10000),

    admin
      .from("release_warehouse_metrics")
      .select("releases, artists, labels, countries, vinyl_releases, refreshed_at")
      .single(),

    admin
      .from("external_market_comp_summary_safe")
      .select("record_id, auction_count, median_price, high_price")
      .eq("source", "popsike")
      .limit(10000),
  ])

  const portfolio: any = portfolioRes.data || {}
  const collection: any[] = collectionRes.data || []
  const warehouse: any = warehouseRes.data || {}
  const auctions: any[] = auctionRes.data || []

  const auctionByRecord = new Map(auctions.map((a: any) => [String(a.record_id), a]))

  const enriched = collection.map((record: any) => {
    const auction = auctionByRecord.get(String(record.id)) || {}
    const estimatedValue = Number(record.estimated_value || 0)
    const auctionCount = Number(auction.auction_count || 0)
    const highPrice = Number(auction.high_price || 0)
    const medianPrice = Number(auction.median_price || 0)

    const confidence =
      (record.discogs_release_id ? 30 : 0) +
      (estimatedValue > 0 ? 25 : 0) +
      (auctionCount > 0 ? 25 : 0) +
      (record.label ? 10 : 0) +
      (record.country ? 10 : 0)

    return {
      ...record,
      estimatedValue,
      auctionCount,
      highPrice,
      medianPrice,
      confidence: score(confidence),
    }
  })

  const ownedRecords = enriched.length
  const ownedArtists = new Set(enriched.map((r) => String(r.artist || "").trim()).filter(Boolean)).size
  const ownedLabels = new Set(enriched.map((r) => String(r.label || "").trim()).filter(Boolean)).size
  const matchedDiscogs = enriched.filter((r) => String(r.discogs_release_id || "").trim()).length
  const valuedRecords = enriched.filter((r) => r.estimatedValue > 0).length
  const auctionSupported = enriched.filter((r) => r.auctionCount > 0).length

  const portfolioValue =
    Number(portfolio.portfolio_value || portfolio.total_collection_value || 0) ||
    enriched.reduce((sum, r) => sum + r.estimatedValue, 0)

  const warehouseReleases = Number(warehouse.releases || 0)
  const warehouseVinyl = Number(warehouse.vinyl_releases || 0)

  const highestValue = [...enriched]
    .filter((r) => r.estimatedValue > 0)
    .sort((a, b) => b.estimatedValue - a.estimatedValue)
    .slice(0, 10)
    .map((r) => ({
      ...r,
      reason: `${r.label || "Unknown label"} • ${r.country || "Unknown country"} • ${r.format || "Unknown format"}`,
    }))

  const bestAuctionEvidence = [...enriched]
    .filter((r) => r.auctionCount > 0 || r.highPrice > 0 || r.medianPrice > 0)
    .sort((a, b) => b.highPrice - a.highPrice)
    .slice(0, 10)
    .map((r) => ({
      ...r,
      reason: `${num(r.auctionCount)} Popsike sales • median ${money(r.medianPrice)} • ${r.label || "Unknown label"}`,
    }))

  const highestConfidence = [...enriched]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10)
    .map((r) => ({
      ...r,
      reason: `${r.discogs_release_id ? "Discogs linked" : "No Discogs ID"} • ${r.auctionCount ? "Popsike supported" : "No auction support"} • ${r.estimatedValue ? "Valued" : "Unvalued"}`,
    }))

  const artistValueMap = new Map<string, { label: string; value: number; count: number }>()
  const labelValueMap = new Map<string, { label: string; value: number; count: number }>()

  for (const r of enriched) {
    const artist = displayArtistName(r.artist || "Unknown Artist")
    const label = String(r.label || "Unknown Label").split("|")[0].trim() || "Unknown Label"

    const av = artistValueMap.get(artist) || { label: artist, value: 0, count: 0 }
    av.value += r.estimatedValue
    av.count += 1
    artistValueMap.set(artist, av)

    const lv = labelValueMap.get(label) || { label, value: 0, count: 0 }
    lv.value += r.estimatedValue
    lv.count += 1
    labelValueMap.set(label, lv)
  }

  const artistValueRows = [...artistValueMap.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .map((r) => ({ label: r.label, value: r.value, helper: `${money(r.value)} • ${num(r.count)} records` }))

  const labelValueRows = [...labelValueMap.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .map((r) => ({ label: r.label, value: r.value, helper: `${money(r.value)} • ${num(r.count)} records` }))

  const valueBands = [
    { label: "Under $25", min: 0, max: 24.99 },
    { label: "$25–$49", min: 25, max: 49.99 },
    { label: "$50–$99", min: 50, max: 99.99 },
    { label: "$100–$249", min: 100, max: 249.99 },
    { label: "$250+", min: 250, max: Infinity },
  ].map((band) => {
    const count = enriched.filter((r) => r.estimatedValue >= band.min && r.estimatedValue <= band.max).length
    return { label: band.label, value: count, helper: `${num(count)} records` }
  })

  const avgDemand = Number(portfolio.avg_demand_score || 0)
  const avgRarity = Number(portfolio.avg_rarity_score || 0)
  const avgMomentum = Number(portfolio.avg_momentum_score || 0)
  const matchCoverage = ownedRecords ? (matchedDiscogs / ownedRecords) * 100 : 0
  const valueCoverage = ownedRecords ? (valuedRecords / ownedRecords) * 100 : 0
  const auctionCoverage = ownedRecords ? (auctionSupported / ownedRecords) * 100 : 0

  return (
    <main className="min-h-screen bg-[#090909] text-[#F4EFE6]">
      <CINavigation />

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
            Collection Intelligence
          </div>
          <h1 className="mt-3 text-4xl font-black">Collection Intelligence Command Center</h1>
          <p className="mt-2 max-w-4xl text-[#B8AA96]">
            Strategic analysis of your collection using real collection data: value distribution, Popsike auction support,
            confidence, warehouse coverage, artist concentration, and label exposure.
          </p>
        </div>

        <section className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          <Card label="Portfolio Value" value={money(portfolioValue)} helper="Current intelligence valuation" />
          <Card label="Records" value={num(ownedRecords)} helper="Collection rows tracked" />
          <Card label="Value Coverage" value={pct(valuedRecords, ownedRecords)} helper={`${num(valuedRecords)} records with values`} />
          <Card label="Auction Support" value={pct(auctionSupported, ownedRecords)} helper={`${num(auctionSupported)} records with Popsike evidence`} />
        </section>

        <section className="rounded-3xl border border-cyan-400/10 bg-cyan-400/[0.04] p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black">Collection vs Warehouse</h2>
              <p className="mt-2 text-sm text-[#B8AA96]">
                Your owned records compared to the release universe Collector Intelligence is building.
              </p>
            </div>
            <div className="text-sm text-[#8E8170]">
              Warehouse refresh: {warehouse?.refreshed_at ? new Date(warehouse.refreshed_at).toLocaleString() : "Unknown"}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <Card label="Owned Records" value={num(ownedRecords)} helper={`${pct(ownedRecords, warehouseReleases)} of warehouse releases`} />
            <Card label="Owned Artists" value={num(ownedArtists)} helper="Unique artists in your collection" />
            <Card label="Owned Labels" value={num(ownedLabels)} helper="Unique labels in your collection" />
            <Card label="Discogs Match Coverage" value={pct(matchedDiscogs, ownedRecords)} helper={`${num(matchedDiscogs)} linked records`} />
            <Card label="Warehouse Releases" value={num(warehouseReleases)} helper={`${num(warehouseVinyl)} vinyl references`} />
            <Card label="Value Coverage" value={pct(valueCoverage, 100)} helper="Records with usable value data" />
            <Card label="Auction Evidence" value={pct(auctionCoverage, 100)} helper="Records supported by Popsike sales" />
            <Card label="Warehouse Status" value={warehouseReleases >= 5000000 ? "Strong" : "Building"} helper="Reference universe coverage" />
          </div>
        </section>

        <CollectionIntelligenceRadar
          demand={avgDemand}
          rarity={avgRarity}
          momentum={avgMomentum}
          depth={Math.min(100, Math.round((ownedArtists / Math.max(1, ownedRecords)) * 1000))}
          coverage={matchCoverage}
          valueStrength={Math.min(100, Math.round(portfolioValue / 2000))}
        />

        <section className="grid gap-6 lg:grid-cols-2">
          <DataList
            title="Highest Market Value"
            helper="Most valuable records using current estimated value."
            rows={highestValue}
            metricLabel="Market Value"
            metric={(r) => money(r.estimatedValue)}
          />

          <DataList
            title="Best Auction Evidence"
            helper="Records with the strongest Popsike auction support."
            rows={bestAuctionEvidence}
            metricLabel="Popsike High"
            metric={(r) => (r.highPrice > 0 ? money(r.highPrice) : "—")}
          />

          <DataList
            title="Highest Confidence Records"
            helper="Records where valuation is most trustworthy because multiple evidence sources exist."
            rows={highestConfidence}
            metricLabel="Confidence"
            metric={(r) => `${r.confidence}%`}
          />

          <BarList
            title="Value Distribution"
            helper="How your collection is distributed across value bands."
            rows={valueBands}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <BarList
            title="Top Artists by Portfolio Value"
            helper="Artists driving the largest share of your collection value."
            rows={artistValueRows}
          />

          <BarList
            title="Top Labels by Portfolio Value"
            helper="Labels driving the largest share of your collection value."
            rows={labelValueRows}
          />
        </section>
      </div>
    </main>
  )
}
