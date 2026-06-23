export const dynamic = "force-dynamic"
export const revalidate = 0

import CINavigation from "@/app/components/CINavigation"
import Link from "next/link"
import { redirect } from "next/navigation"
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

  if (!user) {
    redirect("/auth/login")
  }

  const [{ data: rarityRows }, { data: allRarityRows }] = await Promise.all([
    admin
      .from("record_warehouse_rarity_metrics")
      .select("*")
      .eq("user_id", user.id)
      .order("warehouse_similar_releases", { ascending: true })
      .limit(5000),

    admin
      .from("record_warehouse_rarity_metrics")
      .select("warehouse_rarity_label")
      .eq("user_id", user.id)
      .limit(10000),
  ])

  const recordIds = (rarityRows ?? []).map((r: any) => r.record_id)

  const { data: records } = recordIds.length
    ? await admin
        .from("records_clean_safe")
        .select("id, estimated_value, market_consensus_value, discogs_median_price, market_num_for_sale, discogs_for_sale")
        .in("id", recordIds)
    : { data: [] }

  const recordById = new Map((records ?? []).map((r: any) => [Number(r.id), r]))

  function pressingAvailability(forSale: number | null) {
    if (forSale === null || forSale === undefined) return "Unknown"
    if (forSale === 0) return "Elite"
    if (forSale <= 3) return "Very Rare"
    if (forSale <= 10) return "Rare"
    if (forSale <= 25) return "Uncommon"
    return "Common"
  }

  const rows = (rarityRows ?? []).map((row: any) => {
    const record = recordById.get(Number(row.record_id))
    const forSaleRaw = record?.market_num_for_sale ?? record?.discogs_for_sale
    const forSale = forSaleRaw === null || forSaleRaw === undefined ? null : Number(forSaleRaw)

    return {
      ...row,
      value: Number(record?.market_consensus_value || record?.estimated_value || record?.discogs_median_price || 0),
      copies_for_sale: forSale,
      collector_rarity_label: pressingAvailability(forSale),
    }
  })

  const rarityCounts = {
    Elite: rows.filter((r: any) => r.collector_rarity_label === "Elite").length,
    "Very Rare": rows.filter((r: any) => r.collector_rarity_label === "Very Rare").length,
    Rare: rows.filter((r: any) => r.collector_rarity_label === "Rare").length,
    Uncommon: rows.filter((r: any) => r.collector_rarity_label === "Uncommon").length,
    Common: rows.filter((r: any) => r.collector_rarity_label === "Common").length,
  }

  const filteredRows =
    activeRarity === "all"
      ? rows
      : rows.filter((r: any) => r.collector_rarity_label === activeRarity)

  const sortedFilteredRows = [...filteredRows]
    .sort((a: any, b: any) => Number(b.value || 0) - Number(a.value || 0))
    .slice(0, 50)

  const segmentHelpers: Record<string, string> = {
    all: "Highest-value records across all warehouse match profile segments.",
    Elite: "No current marketplace copies found for this specific pressing.",
    "Very Rare": "Three or fewer current marketplace copies found for this specific pressing.",
    Rare: "Ten or fewer current marketplace copies found for this specific pressing.",
    Uncommon: "Twenty-five or fewer current marketplace copies found for this specific pressing.",
    Common: "More than twenty-five current marketplace copies found for this specific pressing.",
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
                  {row.label || "Unknown label"} • {row.copies_for_sale ?? "—"} copies for sale
                </div>
              </div>
              <div className="text-right">
                <div className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-200">
                  {row.collector_rarity_label}
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
            Pressing Rarity
          </div>
          <h1 className="mt-3 text-4xl font-black">Portfolio Rarity Intelligence</h1>
          <p className="mt-2 max-w-4xl text-[#B8AA96]">
            Items are classified by how available this specific pressing is in the current marketplace.
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
            title={activeRarity === "all" ? "Highest Value Indexed Records" : `${activeRarity} Pressing Records`}
            helper={segmentHelpers[activeRarity] ?? "Records sorted by highest current value inside the selected segment."}
            data={sortedFilteredRows}
          />
        </div>
      </div>
    </main>
  )
}
