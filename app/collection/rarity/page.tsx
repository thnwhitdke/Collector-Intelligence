export const dynamic = "force-dynamic"
export const revalidate = 0

import CINavigation from "@/app/components/CINavigation"
import Link from "next/link"
import { createClient } from "@/src/lib/supabase/server"
import { createAdminClient } from "@/src/lib/supabase/admin"
import { displayArtistName } from "@/src/lib/display/artist"

function num(value: unknown) {
  return Number(value || 0).toLocaleString()
}

function money(value: unknown) {
  const n = Number(value || 0)
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0)
}

export default async function RarityPage({
  searchParams,
}: {
  searchParams?: Promise<{ rarity?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const activeRarity = resolvedSearchParams?.rarity ?? "all"
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: rarityRows }, { data: allRarityRows }] = await Promise.all([
    admin
      .from("record_warehouse_rarity_metrics")
      .select("*")
      .eq("user_id", user?.id)
      .order("warehouse_similar_releases", { ascending: true })
      .limit(300),

    admin
      .from("record_warehouse_rarity_metrics")
      .select("warehouse_rarity_label")
      .eq("user_id", user?.id)
      .limit(10000),
  ])

  const recordIds = (rarityRows ?? []).map((r: any) => r.record_id)

  const { data: records } = recordIds.length
    ? await admin
        .from("records_clean_safe")
        .select("id, estimated_value, market_consensus_value, discogs_median_price")
        .in("id", recordIds)
    : { data: [] }

  const valueByRecord = new Map(
    (records ?? []).map((r: any) => [
      Number(r.id),
      Number(r.market_consensus_value || r.estimated_value || r.discogs_median_price || 0),
    ])
  )

  const rows = (rarityRows ?? []).map((row: any) => ({
    ...row,
    value: valueByRecord.get(Number(row.record_id)) ?? 0,
  }))

  const rarityCounts = {
    Elite: (allRarityRows ?? []).filter((r: any) => r.warehouse_rarity_label === "Elite").length,
    "Very Rare": (allRarityRows ?? []).filter((r: any) => r.warehouse_rarity_label === "Very Rare").length,
    Rare: (allRarityRows ?? []).filter((r: any) => r.warehouse_rarity_label === "Rare").length,
    Uncommon: (allRarityRows ?? []).filter((r: any) => r.warehouse_rarity_label === "Uncommon").length,
    Common: (allRarityRows ?? []).filter((r: any) => r.warehouse_rarity_label === "Common").length,
  }

  const filteredRows =
    activeRarity === "all"
      ? rows
      : rows.filter((r: any) => r.warehouse_rarity_label === activeRarity)

  const sortedFilteredRows = [...filteredRows]
    .sort((a: any, b: any) => Number(b.value || 0) - Number(a.value || 0))
    .slice(0, 50)

  const segmentHelpers: Record<string, string> = {
    all: "Highest-value records across all warehouse match profile segments.",
    Elite: "Ultra-thin artist-label reference presence. This means the artist and label pairing is rarely represented in the warehouse, not necessarily that market supply is low.",
    "Very Rare": "Very limited artist-label reference presence in the warehouse.",
    Rare: "Limited artist-label reference presence in the warehouse.",
    Uncommon: "Moderate artist-label reference presence in the warehouse.",
    Common: "Broad artist-label reference presence in the warehouse.",
  }

  const CardList = ({ title, helper, data }: any) => (
    <section className="rounded-3xl border border-white/10 bg-[#111111] p-6">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-2 text-sm text-[#B8AA96]">{helper}</p>

      <div className="mt-6 space-y-3">
        {data.map((row: any) => (
          <Link
            key={`${title}-${row.record_id}`}
            href={`/collection/${row.record_id}?returnTo=/collection/rarity`}
            className="block rounded-2xl border border-white/10 bg-[#1A1A1A] p-4 transition hover:bg-[#242424]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-black text-white">{displayArtistName(row.artist)}</div>
                <div className="mt-1 text-sm text-[#B8AA96]">{row.title}</div>
                <div className="mt-1 text-xs text-[#8E8170]">
                  {row.label || "Unknown label"} • {num(row.warehouse_similar_releases)} similar
                </div>
              </div>
              <div className="text-right">
                <div className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-200">
                  {row.warehouse_rarity_label}
                </div>
                <div className="mt-2 text-sm font-black text-[#F4CD68]">{money(row.value)}</div>
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
            Warehouse Match Profile
          </div>
          <h1 className="mt-3 text-4xl font-black">Portfolio Rarity Intelligence</h1>
          <p className="mt-2 max-w-4xl text-[#B8AA96]">
            Your rarest, most unusual, and most valuable warehouse-matched records across the 5M-release Collector Intelligence reference layer.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-5">
          <Link href="/collection/rarity?rarity=all" className={`rounded-3xl border p-6 transition hover:bg-[#1A1A1A] ${activeRarity === "all" ? "border-cyan-400/40 bg-cyan-400/10" : "border-white/10 bg-[#111111]"}`}>
            <div className="text-sm text-[#B8AA96]">All Indexed</div>
            <div className="mt-2 text-4xl font-black">{num((allRarityRows ?? []).length)}</div>
          </Link>

          <Link href="/collection/rarity?rarity=Elite" className={`rounded-3xl border p-6 transition hover:bg-[#1A1A1A] ${activeRarity === "Elite" ? "border-cyan-400/40 bg-cyan-400/10" : "border-white/10 bg-[#111111]"}`}>
            <div className="text-sm text-[#B8AA96]">Elite</div>
            <div className="mt-2 text-4xl font-black">{num(rarityCounts.Elite)}</div>
          </Link>

          <Link href="/collection/rarity?rarity=Very%20Rare" className={`rounded-3xl border p-6 transition hover:bg-[#1A1A1A] ${activeRarity === "Very Rare" ? "border-cyan-400/40 bg-cyan-400/10" : "border-white/10 bg-[#111111]"}`}>
            <div className="text-sm text-[#B8AA96]">Very Rare</div>
            <div className="mt-2 text-4xl font-black">{num(rarityCounts["Very Rare"])}</div>
          </Link>

          <Link href="/collection/rarity?rarity=Rare" className={`rounded-3xl border p-6 transition hover:bg-[#1A1A1A] ${activeRarity === "Rare" ? "border-cyan-400/40 bg-cyan-400/10" : "border-white/10 bg-[#111111]"}`}>
            <div className="text-sm text-[#B8AA96]">Rare</div>
            <div className="mt-2 text-4xl font-black">{num(rarityCounts.Rare)}</div>
          </Link>

          <Link href="/collection/rarity?rarity=Uncommon" className={`rounded-3xl border p-6 transition hover:bg-[#1A1A1A] ${activeRarity === "Uncommon" ? "border-cyan-400/40 bg-cyan-400/10" : "border-white/10 bg-[#111111]"}`}>
            <div className="text-sm text-[#B8AA96]">Uncommon</div>
            <div className="mt-2 text-4xl font-black">{num(rarityCounts.Uncommon)}</div>
          </Link>
        </section>

        <div className="grid gap-6">
          <CardList
            title={activeRarity === "all" ? "Highest Value Indexed Records" : `${activeRarity} Match Profile Records`}
            helper={segmentHelpers[activeRarity] ?? "Records sorted by highest current value inside the selected segment."}
            data={sortedFilteredRows}
          />
        </div>
      </div>
    </main>
  )
}
