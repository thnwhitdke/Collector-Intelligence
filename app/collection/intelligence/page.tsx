export const dynamic = "force-dynamic"
export const revalidate = 0

import CINavigation from "@/app/components/CINavigation"
import Link from "next/link"
import { createClient } from "@/src/lib/supabase/server"
import { createAdminClient } from "@/src/lib/supabase/admin"

function pct(part: number, whole: number) {
  if (!whole) return "0%"
  return `${((part / whole) * 100).toFixed(2)}%`
}

function money(value: unknown) {
  return `$${Math.round(Number(value || 0)).toLocaleString()}`
}

function num(value: unknown) {
  return Number(value || 0).toLocaleString()
}

export default async function IntelligencePage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userId = user?.id

  const [
    portfolioRes,
    demandRes,
    rarityRes,
    momentumRes,
    warehouseRes,
    collectionRes,
  ] = await Promise.all([
    supabase
      .from("portfolio_intelligence_v2")
      .select("*")
      .eq("user_id", userId)
      .order("total_records", { ascending: false })
      .limit(1)
      .single(),

    supabase
      .from("intelligence_leaderboard_v2")
      .select("*")
      .eq("user_id", userId)
      .order("demand_score_v2", { ascending: false })
      .limit(10),

    supabase
      .from("intelligence_leaderboard_v2")
      .select("*")
      .eq("user_id", userId)
      .order("rarity_score_v2", { ascending: false })
      .limit(10),

    supabase
      .from("intelligence_leaderboard_v2")
      .select("*")
      .eq("user_id", userId)
      .order("momentum_score_v2", { ascending: false })
      .limit(10),

    admin
      .from("release_warehouse_summary")
      .select("releases, artists, labels, countries, vinyl_releases, refreshed_at")
      .single(),

    supabase
      .from("records_clean_safe")
      .select("id, artist, title, label, country, format, discogs_release_id, estimated_value")
      .eq("user_id", userId)
      .limit(10000),
  ])

  const portfolio = portfolioRes.data
  const demand = demandRes.data ?? []
  const rarity = rarityRes.data ?? []
  const momentum = momentumRes.data ?? []
  const warehouse = warehouseRes.data
  const collection = collectionRes.data ?? []

  const ownedRecords = collection.length
  const ownedArtists = new Set(collection.map((r) => String(r.artist || "").trim()).filter(Boolean)).size
  const ownedLabels = new Set(collection.map((r) => String(r.label || "").trim()).filter(Boolean)).size
  const ownedCountries = new Set(collection.map((r) => String(r.country || "").trim()).filter(Boolean)).size
  const matchedDiscogs = collection.filter((r) => String(r.discogs_release_id || "").trim()).length

  const warehouseReleases = Number(warehouse?.releases || 0)
  const warehouseVinyl = Number(warehouse?.vinyl_releases || 0)
  const warehouseArtists = Number(warehouse?.artists || 0)
  const warehouseLabels = Number(warehouse?.labels || 0)
  const warehouseCountries = Number(warehouse?.countries || 0)

  const Table = ({ title, rows, scoreKey }: any) => (
    <section className="rounded-2xl border border-white/10 bg-[#111111] p-5">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      <div className="space-y-3">
        {(rows || []).map((r: any) => (
          <Link
            key={`${title}-${r.record_id}`}
            href={`/collection/${r.record_id}?returnTo=/collection/intelligence`}
            className="block rounded-xl bg-[#1A1A1A] p-4 transition hover:bg-[#242424]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">{r.artist}</div>
                <div className="text-sm text-[#B8AA96]">{r.title}</div>
                <div className="mt-1 text-xs text-[#8E8170]">{r.intelligence_reason_v2}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{r[scoreKey]}</div>
                <div className="text-xs text-[#B8AA96]">Score</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )

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
            Your collection compared against the Collector Intelligence warehouse: demand,
            scarcity, momentum, coverage, Discogs matching, and market readiness.
          </p>
        </div>

        {portfolio && (
          <section className="grid gap-4 md:grid-cols-4">
            <Card label="Portfolio Value" value={money(portfolio.portfolio_value)} helper="Current intelligence valuation" />
            <Card label="Avg Demand" value={portfolio.avg_demand_score} helper="Demand signal across owned records" />
            <Card label="Avg Scarcity" value={portfolio.avg_rarity_score} helper="Scarcity score across collection" />
            <Card label="Avg Momentum" value={portfolio.avg_momentum_score} helper="Current market movement" />
          </section>
        )}

        <section className="rounded-3xl border border-cyan-400/10 bg-cyan-400/[0.04] p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black">Collection vs Warehouse</h2>
              <p className="mt-2 text-sm text-[#B8AA96]">
                This shows how your personal archive compares to the release universe CI is building.
              </p>
            </div>
            <div className="text-sm text-[#8E8170]">
              Warehouse refresh: {warehouse?.refreshed_at ? new Date(warehouse.refreshed_at).toLocaleString() : "Unknown"}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <Card label="Owned Records" value={num(ownedRecords)} helper={`${pct(ownedRecords, warehouseReleases)} of warehouse releases`} />
            <Card label="Owned Artists" value={num(ownedArtists)} helper={`${pct(ownedArtists, warehouseArtists)} of known artists`} />
            <Card label="Owned Labels" value={num(ownedLabels)} helper={`${pct(ownedLabels, warehouseLabels)} of known labels`} />
            <Card label="Owned Countries" value={num(ownedCountries)} helper={`${pct(ownedCountries, warehouseCountries)} of known countries`} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <Card label="Warehouse Releases" value={num(warehouseReleases)} helper={`${num(warehouseVinyl)} vinyl references`} />
            <Card label="Warehouse Artists" value={num(warehouseArtists)} helper="Known artist universe" />
            <Card label="Warehouse Labels" value={num(warehouseLabels)} helper="Known label universe" />
            <Card label="Warehouse Countries" value={num(warehouseCountries)} helper="Known country coverage" />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card
            label="Discogs Match Coverage"
            value={pct(matchedDiscogs, ownedRecords)}
            helper={`${num(matchedDiscogs)} of ${num(ownedRecords)} records have Discogs IDs`}
          />
          <Card
            label="Warehouse Readiness"
            value={warehouseReleases >= 2000000 ? "Strong" : "Building"}
            helper="Add Record and Want List now search CI Warehouse + Discogs Live"
          />
          <Card
            label="Automation Status"
            value="Active"
            helper="Vercel crons refresh market, value, sales, tracks, queue, and snapshots"
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <Table title="Highest Demand" rows={demand} scoreKey="demand_score_v2" />
          <Table title="Rarest Releases" rows={rarity} scoreKey="rarity_score_v2" />
          <Table title="Highest Momentum" rows={momentum} scoreKey="momentum_score_v2" />
        </div>
      </div>
    </main>
  )
}

function Card({
  label,
  value,
  helper,
}: {
  label: string
  value: any
  helper: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
      <div className="text-sm text-[#B8AA96]">{label}</div>
      <div className="mt-2 text-3xl font-black text-white">{value}</div>
      <div className="mt-2 text-xs leading-5 text-[#8E8170]">{helper}</div>
    </div>
  )
}
