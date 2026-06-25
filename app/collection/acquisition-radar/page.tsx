export const dynamic = "force-dynamic"
export const revalidate = 0

import Link from "next/link"
import { redirect } from "next/navigation"
import CINavigation from "@/app/components/CINavigation"
import { createClient } from "@/src/lib/supabase/server"
import { createAdminClient } from "@/src/lib/supabase/admin"
import { displayArtistName } from "@/src/lib/display/artist"

function num(value: unknown) {
  return Number(value || 0).toLocaleString()
}

function money(value: unknown) {
  return `$${Math.round(Number(value || 0)).toLocaleString()}`
}

function score(value: unknown) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))))
}

function Card({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper: string
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#111111] p-6">
      <div className="text-xs font-black uppercase tracking-[0.35em] text-[#8E8170]">{label}</div>
      <div className="mt-4 text-4xl font-black text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-[#B8AA96]">{helper}</div>
    </div>
  )
}

function HuntCard({ item }: { item: any }) {
  const artist = displayArtistName(item.artist || item.master_artist || item.record_artist || "Unknown Artist")
  const title = item.title || item.release_title || item.record_title || item.name || "Unknown Release"
  const signal = item.signal || item.signal_type || item.observation_type || item.market_signal || "Market Watch"
  const forSale = Number(item.for_sale ?? item.num_for_sale ?? item.market_num_for_sale ?? 0)
  const wants = Number(item.want_count ?? item.wants ?? item.community_want ?? item.demand_score ?? 0)
  const pressure = score(
    item.acquisition_pressure ??
      item.signal_score ??
      item.score ??
      (forSale === 0 && wants > 0 ? 95 : wants > 0 ? Math.min(95, wants / Math.max(1, forSale + 1)) : 0)
  )

  const status =
    pressure >= 90 ? "Critical Hunt" : pressure >= 70 ? "Active Hunt" : pressure >= 40 ? "Monitor" : "Low Signal"

  return (
    <div className="rounded-3xl border border-white/10 bg-[#111111] p-6">
      <div className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300">{status}</div>
      <div className="mt-5 text-2xl font-black text-white">{artist}</div>
      <div className="mt-2 text-lg font-bold text-[#F4EFE6]">{title}</div>
      <div className="mt-3 text-sm text-[#8E8170]">{signal}</div>

      <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="text-xs text-[#8E8170]">For Sale</div>
          <div className="text-xl font-black text-white">{num(forSale)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="text-xs text-[#8E8170]">Want</div>
          <div className="text-xl font-black text-white">{num(wants)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="text-xs text-[#8E8170]">Pressure</div>
          <div className="text-xl font-black text-cyan-200">{pressure}</div>
        </div>
      </div>
    </div>
  )
}

function ValueTargetCard({ record }: { record: any }) {
  const value = Number(record.estimated_value || 0)

  return (
    <Link
      href={`/collection/${record.id}?returnTo=/collection/acquisition-radar`}
      className="block rounded-3xl border border-white/10 bg-[#111111] p-6 transition hover:bg-[#181818]"
    >
      <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">Collection Gap</div>
      <div className="mt-5 text-2xl font-black text-white">{displayArtistName(record.artist)}</div>
      <div className="mt-2 text-lg font-bold text-[#F4EFE6]">{record.title}</div>
      <div className="mt-3 text-sm text-[#8E8170]">
        {record.label || "Unknown label"} · {record.country || "Unknown country"} · {record.format || "Unknown format"}
      </div>
      <div className="mt-5 text-3xl font-black text-white">{value > 0 ? money(value) : "Needs Value"}</div>
      <div className="mt-1 text-xs text-[#B8AA96]">Current estimated value</div>
    </Link>
  )
}

export default async function AcquisitionRadarPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const userId = user.id

  const [collectionRes, observationsRes, wantRes] = await Promise.all([
    supabase
      .from("records_clean_safe")
      .select("id, artist, title, label, country, format, discogs_release_id, estimated_value")
      .eq("user_id", userId)
      .limit(10000),

    admin
      .from("market_observations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(24),

    supabase
      .from("want_list")
      .select("*")
      .eq("user_id", userId)
      .limit(50),
  ])

  const collection = collectionRes.data || []
  const observations = observationsRes.data || []
  const wantList = wantRes.data || []

  const valuableRecords = [...collection]
    .filter((r: any) => Number(r.estimated_value || 0) > 0)
    .sort((a: any, b: any) => Number(b.estimated_value || 0) - Number(a.estimated_value || 0))
    .slice(0, 6)

  const huntItems = observations.slice(0, 8)

  const critical = huntItems.filter((x: any) => Number(x.acquisition_pressure || x.score || x.signal_score || 0) >= 90).length
  const active = huntItems.filter((x: any) => Number(x.acquisition_pressure || x.score || x.signal_score || 0) >= 70).length

  return (
    <main className="min-h-screen bg-[#090909] text-[#F4EFE6]">
      <CINavigation />

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        <section className="rounded-[2rem] border border-yellow-400/15 bg-gradient-to-br from-yellow-400/[0.16] via-[#111111] to-black p-8 md:p-10">
          <div className="text-xs font-black uppercase tracking-[0.45em] text-yellow-300">
            Collector Intelligence Acquisition Radar
          </div>
          <h1 className="mt-5 text-5xl font-black tracking-tight md:text-7xl">
            What Should I <span className="text-yellow-300">Hunt?</span>
          </h1>
          <p className="mt-5 max-w-4xl text-base leading-7 text-[#B8AA96]">
            Ranked acquisition opportunities based on favorite-artist market observations, visible demand,
            supply pressure, want-list activity, and your current collection profile.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Card label="Critical" value={num(critical)} helper="High-pressure market observations" />
          <Card label="Active Hunt" value={num(active)} helper="Signals worth reviewing now" />
          <Card label="Want List" value={num(wantList.length)} helper="User-tracked acquisition targets" />
          <Card label="Market Signals" value={num(huntItems.length)} helper="Latest market observations reviewed" />
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#111111] p-6">
          <div className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300">Available Now</div>
          <h2 className="mt-3 text-3xl font-black">Market Hunt Signals</h2>
          <p className="mt-2 text-sm text-[#B8AA96]">
            These are dynamic observations from the market intelligence engine. They are not user-filtered by a missing
            market_observations.user_id column.
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {huntItems.length ? (
              huntItems.map((item: any, index: number) => <HuntCard key={item.id || index} item={item} />)
            ) : (
              <div className="rounded-3xl border border-white/10 bg-black/25 p-6 text-[#B8AA96]">
                No current market observations found. Run the market observations cron to populate this section.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#111111] p-6">
          <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">Collection Context</div>
          <h2 className="mt-3 text-3xl font-black">High-Value Reference Points</h2>
          <p className="mt-2 text-sm text-[#B8AA96]">
            These are not recommendations to buy. They provide context for the kinds of records already driving
            value inside your collection.
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {valuableRecords.map((record: any) => (
              <ValueTargetCard key={record.id} record={record} />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
