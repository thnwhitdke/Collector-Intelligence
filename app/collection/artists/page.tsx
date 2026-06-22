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

function pct(value: unknown) {
  return `${Number(value || 0).toFixed(2)}%`
}

export default async function ArtistIntelligencePage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: artists } = await admin
    .from("artist_collection_depth_metrics")
    .select("*")
    .eq("user_id", user?.id)
    .order("coverage_percent", { ascending: false })
    .limit(100)

  const rows = artists ?? []

  const topCoverage = rows.filter((r: any) => Number(r.warehouse_releases || 0) >= 10).slice(0, 10)
  const deepest = [...rows].sort((a: any, b: any) => Number(b.owned_records || 0) - Number(a.owned_records || 0)).slice(0, 10)
  const opportunities = rows
    .filter((r: any) => Number(r.warehouse_releases || 0) >= 100 && Number(r.coverage_percent || 0) < 5)
    .sort((a: any, b: any) => Number(b.owned_records || 0) - Number(a.owned_records || 0))
    .slice(0, 10)

  const ArtistList = ({ title, helper, data }: any) => (
    <section className="rounded-3xl border border-white/10 bg-[#111111] p-6">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-2 text-sm text-[#B8AA96]">{helper}</p>

      <div className="mt-6 space-y-3">
        {data.map((row: any) => (
          <Link
            key={`${title}-${row.artist}`}
            href={`/collection?q=${encodeURIComponent(displayArtistName(row.artist))}`}
            className="block rounded-2xl border border-white/10 bg-[#1A1A1A] p-4 transition hover:bg-[#242424]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-black text-white">{displayArtistName(row.artist)}</div>
                <div className="mt-1 text-sm text-[#8E8170]">
                  {num(row.owned_records)} owned • {num(row.warehouse_releases)} warehouse releases
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-[#F4CD68]">{pct(row.coverage_percent)}</div>
                <div className="text-xs uppercase tracking-[0.18em] text-[#B8AA96]">Coverage</div>
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
            Artist Intelligence
          </div>
          <h1 className="mt-3 text-4xl font-black">Collection DNA</h1>
          <p className="mt-2 max-w-4xl text-[#B8AA96]">
            Artist depth, dominance, and completion signals compared against the 5M-release Collector Intelligence warehouse.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-[#111111] p-6">
            <div className="text-sm text-[#B8AA96]">Tracked Artists</div>
            <div className="mt-2 text-4xl font-black">{num(rows.length)}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#111111] p-6">
            <div className="text-sm text-[#B8AA96]">Top Coverage</div>
            <div className="mt-2 text-4xl font-black">{topCoverage[0] ? pct(topCoverage[0].coverage_percent) : "0.00%"}</div>
            <div className="mt-1 text-sm text-[#8E8170]">{topCoverage[0] ? displayArtistName(topCoverage[0].artist) : "Building"}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#111111] p-6">
            <div className="text-sm text-[#B8AA96]">Deepest Artist</div>
            <div className="mt-2 text-4xl font-black">{deepest[0] ? num(deepest[0].owned_records) : "0"}</div>
            <div className="mt-1 text-sm text-[#8E8170]">{deepest[0] ? displayArtistName(deepest[0].artist) : "Building"}</div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <ArtistList title="Most Complete Artists" helper="Highest warehouse coverage among artists with meaningful warehouse presence." data={topCoverage} />
          <ArtistList title="Deepest Holdings" helper="Artists with the largest number of owned records in your collection." data={deepest} />
          <ArtistList title="Expansion Opportunities" helper="Artists where you already have depth but warehouse coverage remains low." data={opportunities} />
        </div>
      </div>
    </main>
  )
}
