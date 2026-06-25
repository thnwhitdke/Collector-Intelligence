import { NextResponse } from "next/server"
import { createClient } from "@/src/lib/supabase/server"
import { createAdminClient } from "@/src/lib/supabase/admin"
import { displayArtistName } from "@/src/lib/display/artist"

export const dynamic = "force-dynamic"

function num(value: unknown) {
  return Number(value || 0).toLocaleString()
}

function money(value: unknown) {
  return `$${Math.round(Number(value || 0)).toLocaleString()}`
}

function first(...values: any[]) {
  for (const value of values) {
    const s = String(value ?? "").trim()
    if (s && s !== "null" && s !== "undefined") return s
  }
  return ""
}

function score(value: unknown) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))))
}

function splitArtistTitle(value: string) {
  const text = String(value || "").trim()

  if (text.includes(" - ")) {
    const [artist, ...rest] = text.split(" - ")
    return { artist: artist.trim(), title: rest.join(" - ").trim() }
  }

  if (text.includes(" = ")) {
    const [left] = text.split(" = ")
    return { artist: "", title: left.trim() }
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
    parsed.artist,
    "Market Signal"
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

  const pressure = score(
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

  return {
    kind: pressure >= 90 ? "critical" : pressure >= 70 ? "opportunity" : "watch",
    label: pressure >= 90 ? "CRITICAL HUNT" : pressure >= 70 ? "BUY WATCH" : signal.toUpperCase(),
    headline: `${displayArtistName(artist)} • ${title}`,
    detail:
      forSale === 0 && wants > 0
        ? `No active supply • ${num(wants)} want • pressure ${pressure}`
        : `${num(forSale)} for sale • ${num(wants)} want • pressure ${pressure}`,
    href: "/collection/acquisition-radar",
  }
}

export async function GET() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, items: [] }, { status: 401 })
  }

  const userId = user.id

  const [collectionRes, portfolioRes, observationsRes, wantRes, auctionsRes] = await Promise.all([
    supabase
      .from("records_clean_safe")
      .select("id, artist, title, label, country, format, discogs_release_id, estimated_value")
      .eq("user_id", userId)
      .limit(10000),

    supabase
      .from("portfolio_intelligence_v2")
      .select("*")
      .eq("user_id", userId)
      .order("total_records", { ascending: false })
      .limit(1)
      .maybeSingle(),

    admin
      .from("market_observations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12),

    supabase
      .from("want_list")
      .select("*")
      .eq("user_id", userId)
      .limit(12),

    admin
      .from("external_market_comp_summary_safe")
      .select("record_id, auction_count, median_price, high_price")
      .eq("source", "popsike")
      .limit(10000),
  ])

  const collection = collectionRes.data || []
  const portfolio: any = portfolioRes.data || {}
  const observations = observationsRes.data || []
  const wants = wantRes.data || []
  const auctions = auctionsRes.data || []

  const auctionMap = new Map(auctions.map((a: any) => [String(a.record_id), a]))

  const valued = [...collection]
    .filter((r: any) => Number(r.estimated_value || 0) > 0)
    .sort((a: any, b: any) => Number(b.estimated_value || 0) - Number(a.estimated_value || 0))

  const auctionSupported = collection
    .map((r: any) => ({ ...r, auction: auctionMap.get(String(r.id)) }))
    .filter((r: any) => r.auction)
    .sort((a: any, b: any) => Number(b.auction?.high_price || 0) - Number(a.auction?.high_price || 0))

  const countries = new Map<string, number>()
  for (const r of collection) {
    const c = first(r.country, "Unknown")
    countries.set(c, (countries.get(c) || 0) + 1)
  }

  const topCountry = [...countries.entries()].sort((a, b) => b[1] - a[1])[0]
  const portfolioValue = Number(portfolio.portfolio_value || portfolio.total_collection_value || 0)

  const items: any[] = []

  for (const obs of observations.slice(0, 8)) {
    items.push(normalizeObservation(obs))
  }

  if (valued[0]) {
    items.push({
      kind: "portfolio",
      label: "PORTFOLIO LEADER",
      headline: `${displayArtistName(valued[0].artist)} • ${valued[0].title}`,
      detail: `Highest owned value • ${money(valued[0].estimated_value)} • ${valued[0].country || "Unknown country"}`,
      href: `/collection/${valued[0].id}`,
    })
  }

  if (auctionSupported[0]) {
    items.push({
      kind: "auction",
      label: "POPSIKE EVIDENCE",
      headline: `${displayArtistName(auctionSupported[0].artist)} • ${auctionSupported[0].title}`,
      detail: `${num(auctionSupported[0].auction.auction_count)} auction comps • high ${money(auctionSupported[0].auction.high_price)}`,
      href: `/collection/${auctionSupported[0].id}`,
    })
  }

  if (topCountry) {
    items.push({
      kind: "geography",
      label: "GLOBAL COLLECTION",
      headline: `${topCountry[0]} leads your collection geography`,
      detail: `${num(topCountry[1])} records • ${((topCountry[1] / Math.max(1, collection.length)) * 100).toFixed(1)}% of collection`,
      href: "/collection/daily-briefing",
    })
  }

  if (wants[0]) {
    const w: any = wants[0]
    items.push({
      kind: "want",
      label: "WANT LIST",
      headline: `${displayArtistName(first(w.artist, w.master_artist, "Wanted Release"))} • ${first(w.title, w.release_title, w.name, "Tracked target")}`,
      detail: `Tracking ${num(wants.length)} wanted records • review acquisition targets`,
      href: "/collection/want-list",
    })
  }

  items.push({
    kind: "portfolio",
    label: "PORTFOLIO",
    headline: `${num(collection.length)} records tracked`,
    detail: `${money(portfolioValue)} portfolio value • ${num(valued.length)} valued records`,
    href: "/collection/intelligence",
  })

  return NextResponse.json({
    ok: true,
    refreshedAt: new Date().toISOString(),
    items: items.slice(0, 18),
  })
}
