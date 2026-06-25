export const dynamic = "force-dynamic"
export const revalidate = 0

import Link from "next/link"
import { redirect } from "next/navigation"
import CINavigation from "@/app/components/CINavigation"
import CollectionWorldMap from "@/app/components/CollectionWorldMap"
import { createClient } from "@/src/lib/supabase/server"
import { createAdminClient } from "@/src/lib/supabase/admin"
import { displayArtistName } from "@/src/lib/display/artist"

function money(value: unknown) {
  return `$${Math.round(Number(value || 0)).toLocaleString()}`
}

function num(value: unknown) {
  return Number(value || 0).toLocaleString()
}

function pct(value: unknown) {
  return `${Math.round(Number(value || 0))}%`
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

function Card({
  eyebrow,
  title,
  value,
  helper,
  href,
  tone = "default",
}: {
  eyebrow?: string
  title?: string
  value: string
  helper: string
  href?: string
  tone?: "default" | "gold" | "cyan" | "danger"
}) {
  const toneClass =
    tone === "gold"
      ? "border-yellow-400/25 bg-yellow-400/[0.06]"
      : tone === "cyan"
        ? "border-cyan-400/25 bg-cyan-400/[0.06]"
        : tone === "danger"
          ? "border-red-400/25 bg-red-400/[0.06]"
          : "border-white/10 bg-[#111111]"

  const body = (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      {eyebrow ? (
        <div className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-yellow-300">
          {eyebrow}
        </div>
      ) : null}
      {title ? <div className="text-sm text-[#B8AA96]">{title}</div> : null}
      <div className="mt-2 text-3xl font-black text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-[#8E8170]">{helper}</div>
    </div>
  )

  return href ? (
    <Link href={href} className="block transition hover:scale-[1.01]">
      {body}
    </Link>
  ) : (
    body
  )
}

function PriorityCard({
  label,
  title,
  helper,
  href,
  action,
  tone = "gold",
}: {
  label: string
  title: string
  helper: string
  href: string
  action: string
  tone?: "gold" | "cyan" | "danger"
}) {
  return (
    <section className={`rounded-3xl border p-6 ${tone === "danger" ? "border-red-400/25 bg-red-400/[0.06]" : tone === "cyan" ? "border-cyan-400/25 bg-cyan-400/[0.06]" : "border-yellow-400/25 bg-yellow-400/[0.06]"}`}>
      <div className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300">{label}</div>
      <h2 className="mt-4 text-3xl font-black text-white">{title}</h2>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-[#B8AA96]">{helper}</p>
      <Link
        href={href}
        className="mt-6 inline-flex rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
      >
        {action}
      </Link>
    </section>
  )
}

function Gauge({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-[#B8AA96]">{label}</span>
        <span className="font-bold text-white">{Math.round(value)}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-yellow-300"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  )
}

function FeedCard({ item }: { item: any }) {
  const artist = displayArtistName(item.artist || item.master_artist || "Market Signal")
  const title = item.title || item.release_title || item.observation_title || item.signal || "Market observation"
  const type = item.signal_type || item.observation_type || item.signal || "Market Intelligence"
  const detail =
    item.summary ||
    item.reason ||
    item.description ||
    `${num(item.for_sale || 0)} for sale · ${num(item.want_count || item.wants || 0)} want · score ${num(item.score || item.signal_score || 0)}`

  return (
    <Link href="/collection/market-intelligence" className="block rounded-3xl border border-white/10 bg-[#080808] p-5 transition hover:bg-[#151515]">
      <div className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300">{type}</div>
      <div className="mt-4 text-2xl font-black text-white">{artist}</div>
      <div className="mt-2 text-lg font-bold text-[#F4EFE6]">{title}</div>
      <div className="mt-4 text-sm text-[#B8AA96]">{detail}</div>
    </Link>
  )
}

function InsightCard({
  title,
  body,
  href,
}: {
  title: string
  body: string
  href: string
}) {
  return (
    <Link href={href} className="block rounded-3xl border border-cyan-400/15 bg-cyan-400/[0.05] p-6 transition hover:bg-cyan-400/[0.08]">
      <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">AI Observation</div>
      <h3 className="mt-4 text-2xl font-black text-white">{title}</h3>
      <p className="mt-4 text-sm leading-7 text-[#B8AA96]">{body}</p>
    </Link>
  )
}

export default async function DailyBriefingPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const userId = user.id

  const [
    portfolioRes,
    collectionRes,
    marketRes,
    artistDepthRes,
    trendRes,
    valueQueueRes,
  ] = await Promise.all([
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
      .from("market_observations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8),

    admin
      .from("artist_collection_depth_metrics")
      .select("*")
      .eq("user_id", userId)
      .gte("owned_records", 5)
      .gt("warehouse_releases", 0)
      .order("owned_records", { ascending: false })
      .limit(8),

    admin
      .from("market_trend_signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6),

    supabase
      .from("records_clean_safe")
      .select("id")
      .eq("user_id", userId)
      .or("estimated_value.is.null,estimated_value.eq.0")
      .limit(500),
  ])

  const portfolio: any = portfolioRes.data || {}
  const collection: any[] = collectionRes.data || []
  const market: any[] = marketRes.data || []
  const artistDepth: any[] = artistDepthRes.data || []
  const trends: any[] = trendRes.data || []
  const valueQueueCount = valueQueueRes.data?.length || 0

  const records = collection.length
  const portfolioValue = Number(portfolio.portfolio_value || portfolio.total_collection_value || 0)
  const avgDemand = Number(portfolio.avg_demand_score || 0)
  const avgRarity = Number(portfolio.avg_rarity_score || 0)
  const avgMomentum = Number(portfolio.avg_momentum_score || 0)

  const matchedDiscogs = collection.filter((r) => String(r.discogs_release_id || "").trim()).length
  const matchCoverage = records ? (matchedDiscogs / records) * 100 : 0
  const healthScore = Math.round(Math.min(100, Math.max(60, matchCoverage * 0.65 + 35)))

  const countryBuckets = new Map<string, { country: string; count: number; formats: Map<string, number>; labels: Map<string, number> }>()

  for (const record of collection) {
    const country = String(record.country || "Unknown").trim() || "Unknown"
    const format = String(record.format || "").trim()
    const label = String(record.label || "").trim()

    const bucket = countryBuckets.get(country) || {
      country,
      count: 0,
      formats: new Map<string, number>(),
      labels: new Map<string, number>(),
    }

    bucket.count += 1
    if (format) bucket.formats.set(format, (bucket.formats.get(format) || 0) + 1)
    if (label) bucket.labels.set(label, (bucket.labels.get(label) || 0) + 1)
    countryBuckets.set(country, bucket)
  }

  const countryMapData = [...countryBuckets.values()]
    .map((bucket) => {
      const topFormat = [...bucket.formats.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null
      const topLabel = [...bucket.labels.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null

      return {
        country: bucket.country,
        count: bucket.count,
        percentage: records ? (bucket.count / records) * 100 : 0,
        topFormat,
        topLabel,
      }
    })
    .sort((a, b) => b.count - a.count)

  const topArtist = artistDepth[0]
  const topArtistName = topArtist?.artist ? displayArtistName(topArtist.artist) : "your strongest artist cluster"
  const topCountry = countryMapData[0]

  const feedItems =
    market.length > 0
      ? market
      : trends.length > 0
        ? trends
        : [
            {
              artist: "Collector Intelligence",
              title: "Market intelligence is building",
              signal_type: "System Status",
              summary: "As nightly jobs complete, this feed will surface rare listings, supply compression, market movement, and acquisition signals.",
            },
          ]

  return (
    <main className="min-h-screen bg-[#060606] text-[#F4EFE6]">
      <CINavigation />

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        <section className="rounded-[2rem] border border-yellow-400/15 bg-gradient-to-br from-yellow-400/[0.14] via-[#111111] to-black p-8 md:p-10">
          <div className="text-xs font-black uppercase tracking-[0.45em] text-yellow-300">
            Daily Collector Briefing
          </div>
          <h1 className="mt-5 text-5xl font-black tracking-tight md:text-7xl">
            Collector Briefing <span className="text-yellow-300">Today</span>
          </h1>
          <p className="mt-5 max-w-4xl text-base leading-7 text-[#B8AA96]">
            {todayLabel()} · A synthesized command brief combining portfolio health, market movement,
            acquisition signals, geographic coverage, data integrity, and warehouse readiness.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Card title="Records" value={num(records)} helper="Collection rows tracked" />
          <Card title="Portfolio Value" value={money(portfolioValue)} helper="Current market consensus" />
          <Card title="Health Score" value={pct(healthScore)} helper="Match, value, and integrity readiness" />
          <Card title="Market Signals" value={num(feedItems.length)} helper="Current observations and alerts" />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <PriorityCard
            label="Today's Action Center"
            title={valueQueueCount > 0 ? `${num(valueQueueCount)} valuation reviews needed` : "Collection health looks stable"}
            helper={
              valueQueueCount > 0
                ? "Review records with missing or uncertain valuations before relying on portfolio totals."
                : "No urgent valuation cleanup was detected. Continue reviewing market movement and acquisition opportunities."
            }
            href={valueQueueCount > 0 ? "/collection/value-queue" : "/collection/intelligence"}
            action={valueQueueCount > 0 ? "Open Value Queue" : "Open Intelligence Center"}
            tone={valueQueueCount > 0 ? "gold" : "cyan"}
          />

          <PriorityCard
            label="Recommended Action"
            title={avgMomentum >= 50 ? "Review momentum leaders before the market moves." : "Review collection intelligence signals."}
            helper="This recommendation is generated from current portfolio scoring, market observations, and nightly warehouse processing."
            href="/collection/market-intelligence"
            action="Open Market Intelligence"
            tone="cyan"
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <section className="rounded-3xl border border-white/10 bg-[#111111] p-6">
            <div className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300">Collection Health</div>
            <h2 className="mt-3 text-2xl font-black">Readiness Gauges</h2>
            <div className="mt-6 space-y-5">
              <Gauge label="Portfolio Health" value={healthScore} />
              <Gauge label="Discogs Match Coverage" value={matchCoverage} />
              <Gauge label="Demand Signal" value={avgDemand} />
              <Gauge label="Scarcity Signal" value={avgRarity} />
              <Gauge label="Momentum Signal" value={avgMomentum} />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#111111] p-6">
            <div className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300">Collection Pulse</div>
            <h2 className="mt-3 text-2xl font-black">Portfolio Snapshot</h2>
            <div className="mt-6 space-y-3 text-sm">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">{num(records)} records tracked</div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">{money(portfolioValue)} market consensus portfolio value</div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">{topArtistName} leads current artist depth</div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">{topCountry?.country || "Unknown"} is your top collection country</div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#111111] p-6">
            <div className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300">Database Health</div>
            <h2 className="mt-3 text-2xl font-black">Integrity Status</h2>
            <div className="mt-6 space-y-3 text-sm">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">{pct(healthScore)} health score</div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">{num(matchedDiscogs)} Discogs-linked records</div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">{num(valueQueueCount)} valuation review items</div>
              <Link href="/collection/integrity-center" className="inline-flex rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-black text-cyan-100">
                Open Integrity Center
              </Link>
            </div>
          </section>
        </section>

        <CollectionWorldMap data={countryMapData} />

        <section className="grid gap-5 lg:grid-cols-2">
          <InsightCard
            title={`${topArtistName} is your deepest strategic cluster.`}
            body="Artist depth helps identify where your collection is most differentiated. High concentration can signal specialization, collecting identity, and future acquisition strategy."
            href="/collection/artists"
          />

          <InsightCard
            title="Warehouse intelligence is now becoming a competitive advantage."
            body="As the warehouse expands toward 10M releases and nightly intelligence scoring continues, Collector Intelligence can compare owned records against a much larger release universe."
            href="/collection/intelligence"
          />
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#111111] p-6">
          <div className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300">Market Intelligence Feed</div>
          <h2 className="mt-3 text-3xl font-black">Latest Market Observations</h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {feedItems.slice(0, 8).map((item: any, index: number) => (
              <FeedCard key={`${item.id || index}-${item.artist || "signal"}`} item={item} />
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <Card
            eyebrow="Automation"
            value="Online"
            helper="Hetzner runs the nightly intelligence engine, warehouse scoring, market jobs, and portfolio refreshes."
            href="/collection/operations-center"
            tone="cyan"
          />
          <Card
            eyebrow="Warehouse"
            value="Building"
            helper="Discogs warehouse expansion and Warehouse Intelligence V2 continue processing in the background."
            href="/collection/intelligence"
            tone="gold"
          />
          <Card
            eyebrow="Next Step"
            value="Review"
            helper="Use this briefing to decide what to clean, watch, acquire, or trust today."
            href="/collection/acquisition-radar"
            tone="default"
          />
        </section>
      </div>
    </main>
  )
}
