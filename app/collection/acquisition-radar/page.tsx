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

function clamp(value: unknown) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))))
}

function first(...values: any[]) {
  for (const value of values) {
    const s = String(value ?? "").trim()
    if (s && s !== "null" && s !== "undefined") return s
  }
  return ""
}

function splitArtistTitle(value: string) {
  const text = String(value || "").trim()

  if (text.includes(" = ")) {
    const [left, ...rest] = text.split(" = ")
    return { artist: "", title: first(left, rest.join(" = ")) }
  }

  if (text.includes(" - ")) {
    const [artist, ...rest] = text.split(" - ")
    return { artist: artist.trim(), title: rest.join(" - ").trim() }
  }

  return { artist: "", title: text }
}

function normalizeObservation(item: any) {
  const rawTitle = first(
    item.title,
    item.release_title,
    item.record_title,
    item.observation_title,
    item.name,
    item.master_title
  )

  const parsed = splitArtistTitle(rawTitle)

  const artist = first(
    item.artist,
    item.master_artist,
    item.record_artist,
    item.artist_name,
    item.release_artist,
    parsed.artist
  )

  const title = first(
    item.release_title,
    item.record_title,
    item.master_title,
    parsed.title,
    rawTitle,
    "Observed release"
  )

  const signal = first(
    item.signal,
    item.signal_type,
    item.observation_type,
    item.market_signal,
    item.event_type,
    "Market Watch"
  )

  const forSale = Number(
    item.for_sale ??
      item.num_for_sale ??
      item.market_num_for_sale ??
      item.available_count ??
      item.supply_count ??
      0
  )

  const wants = Number(
    item.want_count ??
      item.wants ??
      item.community_want ??
      item.demand_count ??
      item.watchers ??
      0
  )

  const score = clamp(
    item.acquisition_pressure ??
      item.signal_score ??
      item.score ??
      item.demand_score ??
      (forSale === 0 && wants > 0
        ? 95
        : wants > 0
          ? Math.min(95, wants / Math.max(1, forSale + 1))
          : 0)
  )

  const pressure =
    score ||
    clamp(
      forSale === 0 && wants > 0
        ? 95
        : wants > 0
          ? Math.min(95, wants / Math.max(1, forSale + 1))
          : 0
    )

  const reason =
    first(item.summary, item.reason, item.description) ||
    (forSale === 0 && wants > 0
      ? "No active supply was found while collector interest exists."
      : forSale <= 2 && wants > 25
        ? "Limited supply relative to visible collector interest."
        : wants > 100
          ? "High collector interest detected."
          : "This item is being monitored for acquisition relevance.")

  return {
    id: item.id,
    artist: artist ? displayArtistName(artist) : "External Market Signal",
    title,
    signal,
    forSale,
    wants,
    pressure,
    reason,
  }
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

function HuntSignalCard({ item }: { item: any }) {
  const signal = normalizeObservation(item)

  const level =
    signal.pressure >= 90
      ? "Critical Hunt"
      : signal.pressure >= 70
        ? "Active Hunt"
        : signal.pressure >= 40
          ? "Monitor"
          : "Market Watch"

  const tone =
    signal.pressure >= 90
      ? "text-yellow-300"
      : signal.pressure >= 70
        ? "text-cyan-300"
        : "text-[#B8AA96]"

  return (
    <div className="rounded-3xl border border-white/10 bg-[#111111] p-6">
      <div className={`text-xs font-black uppercase tracking-[0.35em] ${tone}`}>{level}</div>

      <div className="mt-5 text-2xl font-black text-white">{signal.artist}</div>
      <div className="mt-2 text-lg font-bold text-[#F4EFE6]">{signal.title}</div>
      <div className="mt-3 text-sm font-semibold text-[#8E8170]">{signal.signal}</div>

      <p className="mt-4 text-sm leading-6 text-[#B8AA96]">{signal.reason}</p>

      <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="text-xs text-[#8E8170]">For Sale</div>
          <div className="text-xl font-black text-white">{num(signal.forSale)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="text-xs text-[#8E8170]">Want</div>
          <div className="text-xl font-black text-white">{num(signal.wants)}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="text-xs text-[#8E8170]">Pressure</div>
          <div className="text-xl font-black text-cyan-200">{signal.pressure}</div>
        </div>
      </div>
    </div>
  )
}

function WantCard({ item }: { item: any }) {
  const artist = displayArtistName(
    first(item.artist, item.master_artist, item.record_artist, item.release_artist, "Wanted Release")
  )

  const title = first(item.title, item.release_title, item.record_title, item.name, "Untitled target")
  const lowest = Number(item.lowest_price || item.lowestPrice || item.market_low_price || item.price || 0)
  const pressure = clamp(item.acquisition_pressure || item.pressure || item.score || item.demand_score || 0)

  return (
    <div className="rounded-3xl border border-cyan-400/15 bg-cyan-400/[0.045] p-6">
      <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">Want List Target</div>
      <div className="mt-5 text-2xl font-black text-white">{artist}</div>
      <div className="mt-2 text-lg font-bold text-[#F4EFE6]">{title}</div>

      <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="text-xs text-[#8E8170]">Lowest Seen</div>
          <div className="text-xl font-black text-white">{lowest > 0 ? money(lowest) : "Watching"}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="text-xs text-[#8E8170]">Pressure</div>
          <div className="text-xl font-black text-cyan-200">{pressure || "—"}</div>
        </div>
      </div>
    </div>
  )
}

function CollectionReferenceCard({ record }: { record: any }) {
  return (
    <Link
      href={`/collection/${record.id}?returnTo=/collection/acquisition-radar`}
      className="block rounded-3xl border border-white/10 bg-[#111111] p-6 transition hover:bg-[#181818]"
    >
      <div className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300">Value Reference</div>
      <div className="mt-5 text-2xl font-black text-white">{displayArtistName(record.artist)}</div>
      <div className="mt-2 text-lg font-bold text-[#F4EFE6]">{record.title}</div>
      <div className="mt-3 text-sm text-[#8E8170]">
        {record.label || "Unknown label"} · {record.country || "Unknown country"} · {record.format || "Unknown format"}
      </div>
      <div className="mt-5 text-3xl font-black text-white">{money(record.estimated_value)}</div>
      <div className="mt-1 text-xs text-[#B8AA96]">Owned collection value benchmark</div>
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

  const [collectionRes, observationsRes, wantRes, artistDepthRes] = await Promise.all([
    supabase
      .from("records_clean_safe")
      .select("id, artist, title, label, country, format, discogs_release_id, estimated_value")
      .eq("user_id", userId)
      .limit(10000),

    admin
      .from("market_observations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(32),

    supabase
      .from("want_list")
      .select("*")
      .eq("user_id", userId)
      .limit(24),

    admin
      .from("artist_collection_depth_metrics")
      .select("*")
      .eq("user_id", userId)
      .gte("owned_records", 5)
      .gt("warehouse_releases", 0)
      .order("owned_records", { ascending: false })
      .limit(8),
  ])

  const collection = collectionRes.data || []
  const observations = observationsRes.data || []
  const wantList = wantRes.data || []
  const artistDepth = artistDepthRes.data || []

  const normalizedSignals = observations
    .map(normalizeObservation)
    .sort((a, b) => b.pressure - a.pressure)

  const critical = normalizedSignals.filter((x) => x.pressure >= 90).length
  const active = normalizedSignals.filter((x) => x.pressure >= 70 && x.pressure < 90).length
  const monitor = normalizedSignals.filter((x) => x.pressure > 0 && x.pressure < 70).length

  const highValueReferences = [...collection]
    .filter((r: any) => Number(r.estimated_value || 0) > 0)
    .sort((a: any, b: any) => Number(b.estimated_value || 0) - Number(a.estimated_value || 0))
    .slice(0, 6)

  const topArtist = artistDepth[0]
  const topArtistName = topArtist?.artist ? displayArtistName(topArtist.artist) : "your strongest artists"

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
            Acquisition guidance based on external market observations, want-list targets, supply pressure,
            visible demand, and your current collector profile.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Card label="Critical" value={num(critical)} helper="High-pressure external market signals" />
          <Card label="Active Hunt" value={num(active)} helper="Signals worth reviewing soon" />
          <Card label="Monitor" value={num(monitor)} helper="Lower-pressure market observations" />
          <Card label="Want List" value={num(wantList.length)} helper="Your tracked acquisition targets" />
        </section>

        <section className="rounded-3xl border border-cyan-400/15 bg-cyan-400/[0.04] p-6">
          <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">Collector Context</div>
          <h2 className="mt-3 text-3xl font-black">Your hunting profile</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[#B8AA96]">
            Your strongest collection cluster is <strong className="text-white">{topArtistName}</strong>. This page does not duplicate
            the Daily Briefing or Intelligence page: it focuses only on acquisition decisions — what to watch, hunt, or ignore.
          </p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#111111] p-6">
          <div className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300">External Signals</div>
          <h2 className="mt-3 text-3xl font-black">Market Hunt Signals</h2>
          <p className="mt-2 text-sm text-[#B8AA96]">
            Dynamic market observations ranked by acquisition pressure. These are global signals, not user-owned records.
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {observations.length ? (
              observations.slice(0, 8).map((item: any, index: number) => (
                <HuntSignalCard key={item.id || index} item={item} />
              ))
            ) : (
              <div className="rounded-3xl border border-white/10 bg-black/25 p-6 text-[#B8AA96]">
                No current market observations found. Run the market observations cron to populate this section.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-cyan-400/15 bg-[#111111] p-6">
          <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">Personal Targets</div>
          <h2 className="mt-3 text-3xl font-black">Want List Intelligence</h2>
          <p className="mt-2 text-sm text-[#B8AA96]">
            These are your own tracked targets. This is the personal layer of the acquisition radar.
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {wantList.length ? (
              wantList.slice(0, 8).map((item: any, index: number) => (
                <WantCard key={item.id || index} item={item} />
              ))
            ) : (
              <div className="rounded-3xl border border-white/10 bg-black/25 p-6 text-[#B8AA96]">
                No want-list targets yet.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#111111] p-6">
          <div className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300">Owned Benchmarks</div>
          <h2 className="mt-3 text-3xl font-black">High-Value Collection References</h2>
          <p className="mt-2 text-sm text-[#B8AA96]">
            These are not recommendations. They show the type and value level of records already driving your portfolio.
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {highValueReferences.map((record: any) => (
              <CollectionReferenceCard key={record.id} record={record} />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
