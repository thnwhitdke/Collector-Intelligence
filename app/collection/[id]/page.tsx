/* ============================================================================
   COLLECTOR INTELLIGENCE — PREMIUM RECORD INTELLIGENCE PROFILE
   FULL REPLACEMENT FILE
   app/collection/[id]/page.tsx
============================================================================ */

import { pullSingleDiscogsValue } from "../../actions/pull-single-discogs";
import Image from "next/image";
import RecordPressingIdentifier from "@/app/components/RecordPressingIdentifier";
import RecordCommandTabs from "@/app/components/RecordCommandTabs";
import DeleteRecordButton from "@/app/components/DeleteRecordButton";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../src/lib/supabase/server";

import {
  deleteRecord,
  duplicateRecord,
  refreshCoverFromDiscogs,
  updateCollectorDetails,
  updateReleaseDetails,
} from "../../actions/records";

import ValueIntelligenceCard from "../../components/ValueIntelligenceCard";
import ManualValueCompForm from "../../components/ManualValueCompForm";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { displayArtistName } from "@/src/lib/display/artist";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    returnTo?: string;
    q?: string;
    view?: string;
    preset?: string;
    sort?: string;
  }>;
};

type RecordDetail = Record<string, string | number | boolean | null>;

type TrackRow = {
  discogs_release_id: string;
  position: string | null;
  side: string | null;
  track_number: number | null;
  title: string;
  duration_raw: string | null;
  duration_seconds: number | null;
  artist_credit: string | null;
};

function getValue(record: RecordDetail, key: string) {
  return record[key] ?? null;
}

function getText(record: RecordDetail, key: string) {
  const value = getValue(record, key);
  if (value === null || value === undefined) return "";
  return String(value);
}

function getNumber(record: RecordDetail, key: string) {
  const value = getValue(record, key);

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function displayValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return "—";

  const text = String(value).trim();

  return text === "" ? "—" : text;
}

function money(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || typeof value === "boolean") {
    return "—";
  }

  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[$,]/g, ""));

  if (!Number.isFinite(parsed)) return displayValue(value);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parsed);
}

function firstPositiveNumber(...values: Array<string | number | boolean | null | undefined>) {
  for (const value of values) {
    if (value === null || value === undefined || typeof value === "boolean") continue;

    const parsed =
      typeof value === "number"
        ? value
        : Number(String(value).replace(/[$,]/g, ""));

    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return null;
}

function normalizeConfidence(record: RecordDetail) {
  const rawConfidence = getText(record, "valuation_confidence").toUpperCase();
  const rawScore =
    getNumber(record, "valuation_confidence") ??
    getNumber(record, "value_confidence_score");

  const marketSignal = getText(record, "market_signal");
  const demand = getNumber(record, "demand_score");
  const supply = getNumber(record, "supply_pressure");
  const marketMedian = getNumber(record, "market_median_price");
  const discogsMedian = getNumber(record, "discogs_median_price");
  const estimated = getNumber(record, "estimated_value");

  if (
    rawConfidence === "HIGH" ||
    marketSignal === "Exact Market Verified" ||
    (rawScore !== null && rawScore >= 80)
  ) {
    return {
      label: "High",
      description: "Multiple strong valuation signals support this market reading.",
      className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    };
  }

  if (
    rawConfidence === "MEDIUM" ||
    (rawScore !== null && rawScore >= 50) ||
    marketMedian !== null ||
    discogsMedian !== null ||
    ((demand ?? 0) > 0 && (supply ?? 0) > 0)
  ) {
    return {
      label: "Medium",
      description: "A usable market benchmark exists, but additional source depth would improve confidence.",
      className: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
    };
  }

  if (estimated !== null) {
    return {
      label: "Low",
      description: "Only a legacy, manual, or imported value is available. Treat as directional.",
      className: "border-orange-400/25 bg-orange-400/10 text-orange-100",
    };
  }

  return {
    label: "Unknown",
    description: "No reliable valuation benchmark is currently available.",
    className: "border-slate-400/25 bg-slate-400/10 text-slate-100",
  };
}

function getMarketConsensus(record: RecordDetail) {
  const marketMedian = getNumber(record, "market_median_price");
  const discogsMedian = getNumber(record, "discogs_median_price");
  const estimated = getNumber(record, "estimated_value");

  const value = firstPositiveNumber(
    marketMedian,
    discogsMedian,
    estimated,
  );

  const source =
    marketMedian !== null && marketMedian > 0
      ? "Market Median"
      : discogsMedian !== null && discogsMedian > 0
        ? "Marketplace Benchmark"
        : estimated !== null && estimated > 0
          ? "Manual / Imported"
          : "Unavailable";

  return {
    value,
    source,
    display: money(value),
  };
}

function formatDate(value: string | number | boolean | null | undefined) {
  if (!value || typeof value === "boolean") return "Not available";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTrackSeconds(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return "—";

  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function getSafeReturnPath({
  returnTo,
  q,
  view,
  preset,
  sort,
}: {
  returnTo?: string;
  q?: string;
  view?: string;
  preset?: string;
  sort?: string;
}) {
  if (returnTo && returnTo.startsWith("/collection")) {
    return returnTo;
  }

  const params = new URLSearchParams();

  if (q && q.trim() !== "") {
    params.set("q", q);
  }

  if (preset && preset !== "all") {
    params.set("preset", preset);
  }

  if (sort && sort !== "id_desc") {
    params.set("sort", sort);
  }

  if (view && view !== "tiles") {
    params.set("view", view);
  }

  const queryString = params.toString();

  return queryString ? `/collection?${queryString}` : "/collection";
}

function getMarketSignal(forSale: number | null) {
  if (forSale === null) {
    return {
      label: "Market Status Unknown",
      description:
        "Current marketplace supply has not yet been analyzed.",
      className:
        "border-slate-500/30 bg-slate-500/10 text-slate-200",
    };
  }

  if (forSale <= 2) {
    return {
      label: "Thin Market",
      description:
        "Very few copies are currently listed. Scarcity may be significant.",
      className:
        "border-amber-400/30 bg-amber-400/10 text-amber-100",
    };
  }

  if (forSale >= 30) {
    return {
      label: "Saturated Market",
      description:
        "High active supply. Competitive pricing pressure may exist.",
      className:
        "border-slate-400/30 bg-slate-400/10 text-slate-100",
    };
  }

  if (forSale >= 10) {
    return {
      label: "Active Supply",
      description:
        "Healthy marketplace activity detected around this release.",
      className:
        "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    };
  }

  return {
    label: "Balanced Market",
    description:
      "Supply appears stable with moderate marketplace availability.",
    className:
      "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  };
}

export default async function RecordDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  const returnPath = getSafeReturnPath({
    returnTo: resolvedSearchParams.returnTo,
    q: resolvedSearchParams.q,
    view: resolvedSearchParams.view,
    preset: resolvedSearchParams.preset,
    sort: resolvedSearchParams.sort,
  });

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase
    .from("records_clean_safe")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) notFound();

  const { data: consensusV2 } = await supabase
    .from("valuation_consensus_v2")
    .select("*")
    .eq("record_id", id)
    .maybeSingle();

  const { data: warehouseRarity } = await createAdminClient()
    .from("record_warehouse_rarity_metrics")
    .select("*")
    .eq("record_id", Number(id))
    .maybeSingle();

  const { data: valuationConflict } = await createAdminClient()
    .from("valuation_conflict_metrics")
    .select("*")
    .eq("record_id", Number(id))
    .neq("conflict_type", "aligned")
    .maybeSingle();

  const { data: auctionSummary } = await supabase
    .from("external_market_comp_summary_safe")
    .select(`
      auction_count,
      avg_price,
      median_price,
      low_price,
      high_price,
      latest_sale
    `)
    .eq("record_id", Number(id))
    .eq("source", "popsike")
    .maybeSingle();

  const { data: recentAuctionComps } = await supabase
    .from("external_market_comps")
    .select("auction_title, sale_price, sale_price_usd, original_sale_price, original_currency, currency, auction_date, source_record_url, variant_match_notes, confidence")
    .eq("record_id", Number(id))
    .eq("source", "popsike")
    .not("sale_price", "is", null)
    .neq("variant_match_status", "rejected")
    .order("auction_date", { ascending: false })
    .limit(5);

  const { data: rejectedAuctionComps } = await supabase
    .from("external_market_comps")
    .select("auction_title, sale_price, sale_price_usd, original_sale_price, original_currency, currency, auction_date, source_record_url, variant_match_notes, confidence")
    .eq("record_id", Number(id))
    .eq("source", "popsike")
    .eq("variant_match_status", "rejected")
    .order("auction_date", { ascending: false })
    .limit(5);


  const { data: intelligenceV2 } = await supabase
    .from("ci_intelligence_engine_v2")
    .select("*")
    .eq("record_id", id)
    .maybeSingle();

  const record = data as RecordDetail;


  const title = getText(record, "title") || "Untitled";
  const artist = displayArtistName(getText(record, "artist"));

  const coverUrl = getText(record, "cover_url");

  const marketConsensus = getMarketConsensus(record);
  const marketConfidence = normalizeConfidence(record);

  const isBlockedMarket =
    Boolean(getValue(record, "market_blocked_from_sale")) ||
    Boolean(getValue(record, "discogs_sale_blocked"));

  const ciConsensusValue =
    consensusV2?.consensus_value_v2 != null
      ? money(consensusV2.consensus_value_v2)
      : getValue(record, "market_consensus_value") != null
        ? money(getValue(record, "market_consensus_value"))
        : marketConsensus.display;

  const ciConsensusConfidence =
    isBlockedMarket
      ? "external-market-supported"
      : consensusV2?.consensus_confidence ?? "legacy";

  const auctionPremiumPercent =
    consensusV2?.auction_premium_percent;

  const hasValuationConflict = Boolean(valuationConflict);
  const valuationConflictDirection =
    valuationConflict?.conflict_type === "auction_far_above_estimate"
      ? "Auction evidence is far above the stored estimate."
      : valuationConflict?.conflict_type === "auction_far_below_estimate"
        ? "Auction median is far below the stored estimate, but high-end comps may still support rare variants."
        : "Auction evidence differs materially from the stored estimate.";
  const estimatedValue = money(getValue(record, "estimated_value"));
  const discogsBenchmark = money(getValue(record, "discogs_median_price"));
  const demandScore = displayValue(getValue(record, "demand_score"));
  const supplyPressure = displayValue(getValue(record, "supply_pressure"));
  const explicitMarketSignal = displayValue(getValue(record, "market_signal"));

  const auctionSummaryTyped = auctionSummary as
    | {
        auction_support_level?: string | null;
        auction_count?: number | string | null;
        avg_price?: number | string | null;
        median_price?: number | string | null;
        low_price?: number | string | null;
        high_price?: number | string | null;
        latest_sale?: string | null;
      }
    | null;

  const auctionCount = Number(auctionSummaryTyped?.auction_count ?? 0);
  const auctionSupportLevel = String(auctionSummaryTyped?.auction_support_level ?? "LOW");
  const hasAuctionComps = auctionCount > 0;

  const auctionReliability =
    auctionCount >= 20
      ? {
          label: "Highly Reliable",
          description: `${auctionCount} valuation-grade auction sales support this valuation.`,
        }
      : auctionCount >= 10
        ? {
            label: "Strong",
            description: `${auctionCount} valuation-grade auction sales support this valuation.`,
          }
        : auctionCount >= 5
          ? {
              label: "Supported",
              description: `${auctionCount} valuation-grade auction sales support this valuation.`,
            }
          : auctionCount >= 3
            ? {
                label: "Directional",
                description: `${auctionCount} auction sales found. Treat as directional intelligence.`,
              }
            : auctionCount > 0
              ? {
                  label: "Informational",
                  description: `${auctionCount} auction sale${auctionCount === 1 ? "" : "s"} found. Use cautiously.`,
                }
              : {
                  label: "None",
                  description: "No valuation-grade auction history available.",
                };

  const auctionVolatility =
    auctionSummaryTyped?.median_price && auctionSummaryTyped?.high_price
      ? Number(auctionSummaryTyped.high_price) / Number(auctionSummaryTyped.median_price)
      : null;

  const auctionVolatilityLabel =
    auctionVolatility === null
      ? "Unknown"
      : auctionVolatility >= 10
        ? "Highly Variant"
        : auctionVolatility >= 5
          ? "Volatile"
          : auctionVolatility >= 2
            ? "Moderate"
            : "Stable";

  const consensusSourceLabel =
    isBlockedMarket && auctionCount > 0
      ? `External comps preferred · ${auctionCount} auction comps`
      : auctionCount >= 5
        ? `Discogs + ${auctionCount} auction comps`
        : auctionCount > 0
          ? `Discogs + ${auctionCount} light auction comp${auctionCount === 1 ? "" : "s"}`
          : "Discogs benchmark only";

  const evidenceQuality =
    auctionCount >= 10 && auctionPremiumPercent !== null && Math.abs(Number(auctionPremiumPercent)) >= 100
      ? {
          label: "High Variance",
          className: "border-amber-300/25 bg-amber-300/10 text-amber-100",
          description: "Auction history strongly differs from the marketplace benchmark. Verify pressing, condition, and sale context before relying on the value.",
        }
      : auctionCount >= 10
        ? {
            label: "Strong",
            className: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
            description: `Supported by Discogs benchmark plus ${auctionCount} matched auction results.`,
          }
        : auctionCount >= 5
          ? {
              label: "Supported",
              className: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
              description: `Supported by Discogs benchmark plus ${auctionCount} matched auction results.`,
            }
          : auctionCount > 0
            ? {
                label: "Light Support",
                className: "border-sky-300/25 bg-sky-300/10 text-sky-100",
                description: `Only ${auctionCount} matched auction result${auctionCount === 1 ? "" : "s"} found. Treat as directional.`,
              }
            : {
                label: "Developing",
                className: "border-white/10 bg-black/25 text-white",
                description: isBlockedMarket
                  ? "Discogs marketplace data is blocked or not comparable for this copy. External comps are preferred when available."
                  : "Discogs or imported value exists, but no matched auction-history support is available yet.",
              };
  const auctionMedian = money(auctionSummaryTyped?.median_price);
  const auctionAverage = money(auctionSummaryTyped?.avg_price);
  const auctionLow = money(auctionSummaryTyped?.low_price);
  const auctionHigh = money(auctionSummaryTyped?.high_price);
  const auctionLatestSale = formatDate(auctionSummaryTyped?.latest_sale);

  const marketSource = String(getValue(record, "market_consensus_source") ?? "");

  const auctionSupportLabel =
    auctionCount >= 20
      ? "Institutional"
      : auctionCount >= 10
        ? "Strong"
        : auctionCount >= 3
          ? "Supported"
          : auctionCount > 0
            ? "Limited"
            : "Developing";

  const auctionSupportDescription =
    auctionCount >= 20
      ? `${auctionCount} valuation-grade auction results strongly support this consensus.`
      : auctionCount >= 10
        ? `${auctionCount} valuation-grade auction results support this consensus.`
        : auctionCount >= 3
          ? `${auctionCount} matched auction results provide meaningful support.`
          : auctionCount > 0
            ? `${auctionCount} matched auction result${auctionCount === 1 ? "" : "s"} found. Treat as directional.`
            : "No matched auction-history support is available yet.";

  const auctionSupportClassName =
    auctionCount >= 20
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : auctionCount >= 10
        ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
        : auctionCount >= 3
          ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
          : auctionCount > 0
            ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
            : "border-white/10 bg-black/25 text-[#B8AA96]";

  const displayEvidenceQuality =
    marketSource?.includes("popsike") && auctionCount > 0
      ? {
          label: auctionCount >= 10 ? "Auction-Supported" : "Auction-Aware",
          description: `${auctionCount} valuation-grade auction sale${auctionCount === 1 ? "" : "s"} are included in the Collector Intelligence consensus.`,
          className:
            "border-[#D8B65A]/40 bg-[#D8B65A]/10 text-[#F4CD68]",
        }
      : hasAuctionComps
        ? {
            label: auctionSupportLabel,
            description: auctionSupportDescription,
            className: auctionSupportClassName,
          }
        : evidenceQuality;

  const displayConsensusSourceLabel =
    marketSource?.includes("popsike") && auctionCount > 0
      ? `Marketplace benchmark + ${auctionCount} auction sales`
      : auctionCount >= 20
        ? `Discogs + ${auctionCount} Auction Sales`
        : auctionCount >= 5
          ? `Discogs + ${auctionCount} Auction Sales`
          : auctionCount > 0
            ? `Discogs + ${auctionCount} Auction Sale${auctionCount === 1 ? "" : "s"}`
            : consensusSourceLabel;

  const forSale =
    getNumber(
      record,
      "market_num_for_sale"
    ) ??
    getNumber(
      record,
      "discogs_for_sale"
    );

  const marketSignal = getMarketSignal(forSale);

  const pressingAvailability =
    forSale === null || forSale === undefined
      ? "Unknown"
      : forSale === 0
        ? "Elite"
        : forSale <= 3
          ? "Very Rare"
          : forSale <= 10
            ? "Rare"
            : forSale <= 25
              ? "Uncommon"
              : "Common";

  const availabilityDescription =
    forSale === null || forSale === undefined
      ? "Current marketplace availability is unknown."
      : `${forSale} copy${forSale === 1 ? "" : "ies"} currently available across tracked marketplaces.`;

  const discogsReleaseId =
    String(
      getText(
        record,
        "discogs_release_id"
      ) || ""
    ).trim();

  const trackSupabase = createAdminClient();

  const { data: trackRows } = discogsReleaseId
    ? await trackSupabase
        .from("release_tracks")
        .select(`
          discogs_release_id,
          position,
          side,
          track_number,
          title,
          duration_raw,
          duration_seconds,
          artist_credit
        `)
        .eq("discogs_release_id", discogsReleaseId)
        .order("side", {
          ascending: true,
          nullsFirst: false,
        })
        .order("track_number", {
          ascending: true,
          nullsFirst: false,
        })
        .order("position", {
          ascending: true,
        })
    : { data: [] };

  const tracks = (trackRows ?? []) as TrackRow[];

  const totalTrackSeconds = tracks.reduce(
    (sum, track) => sum + (track.duration_seconds || 0),
    0,
  );

  const recordRuntime =
    totalTrackSeconds > 0
      ? formatTrackSeconds(totalTrackSeconds)
      : "—";

  const collectorIq =
    displayValue(
      getValue(record, "collector_iq_score") ??
        getValue(record, "value_confidence_score"),
    );

  const rarityScore = displayValue(getValue(record, "rarity_score"));

  const recordNarrative =
    forSale !== null && forSale !== undefined && forSale <= 2
      ? "This record is showing thin marketplace supply. Scarcity may be meaningful, especially if value and condition signals are also strong."
      : forSale !== null && forSale >= 30
        ? "This record has active marketplace supply. Price discipline and condition comparison matter more than urgency."
        : tracks.length > 0
          ? "This record has active track intelligence, allowing Collector Intelligence to analyze sequencing, runtime, and listening structure."
          : "This record is indexed in your archive and ready for additional market, value, and track intelligence enrichment.";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090909] text-[#F4EFE6]">
      {/* BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_35%)]" />

        <div className="absolute inset-0 opacity-[0.04]">
          <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:70px_70px]" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        {/* TOP NAV */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#D8B86A]">
              Collector Intelligence Profile
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              {title}
            </h1>

            <p className="mt-3 text-lg text-[#B8AA96]">
              {artist}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/50">
                CI Record ID: {String(getValue(record, "id"))}
              </span>

              {getValue(record, "discogs_release_id") ? (
                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
                  Discogs Release: {String(getValue(record, "discogs_release_id"))}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {returnPath === "/collection/intelligence" ? (
              <Link
                href="/collection/intelligence"
                className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-400/10 px-5 py-3 text-sm text-fuchsia-100 transition hover:bg-fuchsia-400/20"
              >
                Back to Intelligence Results
              </Link>
            ) : null}

            <Link
              href={returnPath}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm transition hover:bg-white/5"
            >
              Back to Collection
            </Link>

            <Link
              href="/collection"
              className="rounded-2xl border border-[#C7A45D]/30 bg-[#C7A45D]/10 px-5 py-3 text-sm text-[#D8B86A] transition hover:bg-[#C7A45D]/20"
            >
              Full Archive
            </Link>

            <Link
              href="/collection/market-intelligence"
              className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-400/10 px-5 py-3 text-sm text-fuchsia-100 transition hover:bg-fuchsia-400/20"
            >
              Market Intelligence
            </Link>
          </div>
        </div>

        {/* HERO */}
        <section className="grid gap-8 lg:grid-cols-[380px_1fr]">
          {/* LEFT */}
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-2xl">
              <div className="relative aspect-square bg-black">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={`${artist} - ${title}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#8E8170]">
                    No Cover Available
                  </div>
                )}
              </div>

              <div className="p-5">
                <form action={refreshCoverFromDiscogs}>
                  <input
                    type="hidden"
                    name="id"
                    value={String(getValue(record, "id"))}
                  />

                  <input
                    type="hidden"
                    name="returnTo"
                    value={returnPath}
                  />

                  <button className="w-full rounded-2xl bg-[#C7A45D] px-5 py-4 text-sm font-bold text-black transition hover:bg-[#D8B86A]">
                    Refresh Cover Artwork
                  </button>
                </form>
              </div>
            </div>

          </div>

          {/* RIGHT */}
          <div className="space-y-8">
            <RecordCommandTabs
              overview={
                <>
            {/* MARKET STATUS */}
            <section
              className={`rounded-[32px] border p-6 backdrop-blur-xl ${marketSignal.className}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] opacity-70">
                    Market Status
                  </p>

                  <h2 className="mt-3 text-3xl font-black">
                    {marketSignal.label}
                  </h2>

                  <p className="mt-3 max-w-2xl text-sm leading-7 opacity-80">
                    {marketSignal.description}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/20 px-6 py-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                    Copies For Sale
                  </p>

                  <p className="mt-2 text-4xl font-black">
                    {forSale ?? "—"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.2em] text-[#D8B86A]">
                Collector Intelligence Summary
              </p>

              <p className="mt-4 text-sm leading-7 text-[#B8AA96]">
                {recordNarrative}
              </p>
            </section>

            <section className="rounded-[32px] border border-emerald-400/25 bg-emerald-400/10 p-6 shadow-xl backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
                Pressing Availability
              </p>

              <h2 className="mt-3 text-3xl font-black text-white">
                {pressingAvailability}
              </h2>

              <p className="mt-3 text-sm leading-7 text-emerald-100/80">
                Measures the availability of this exact pressing in the current marketplace.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                    Copies For Sale
                  </p>

                  <p className="mt-2 text-3xl font-black text-white">
                    {forSale ?? "—"}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                    Availability Insight
                  </p>

                  <p className="mt-2 text-sm text-white">
                    {availabilityDescription}
                  </p>
                </div>
              </div>
            </section>

            {warehouseRarity ? (
              <section className="rounded-[32px] border border-cyan-400/25 bg-cyan-400/10 p-6 shadow-xl backdrop-blur-xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                  Warehouse Match Profile
                </p>
                <h2 className="mt-3 text-3xl font-black text-white">
                  {warehouseRarity.warehouse_rarity_label}
                </h2>
                <p className="mt-3 text-sm leading-7 text-cyan-100/80">
                  Measures how unusual this artist and label combination is within the 5M-release Collector Intelligence warehouse. This does not represent overall album rarity.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                      Similar Artist/Label Matches
                    </p>
                    <p className="mt-2 text-3xl font-black text-white">
                      {Number(warehouseRarity.warehouse_similar_releases || 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                      Artist
                    </p>
                    <p className="mt-2 text-lg font-black text-white">
                      {displayArtistName(warehouseRarity.artist)}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                      Label
                    </p>
                    <p className="mt-2 text-lg font-black text-white">
                      {warehouseRarity.label ?? "—"}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-[32px] border border-fuchsia-400/20 bg-fuchsia-400/5 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-300">
                Collector Intelligence V2
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                    Demand
                  </p>
                  <p className="mt-2 text-4xl font-black">
                    {intelligenceV2?.demand_score_v2 ?? "—"}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                    Scarcity
                  </p>
                  <p className="mt-2 text-4xl font-black">
                    {intelligenceV2?.rarity_score_v2 ?? "—"}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                    Momentum
                  </p>
                  <p className="mt-2 text-4xl font-black">
                    {intelligenceV2?.momentum_score_v2 ?? "—"}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                    Confidence
                  </p>
                  <p className="mt-2 text-2xl font-black">
                    {intelligenceV2?.intelligence_confidence_v2 ?? "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Why
                </p>
                <p className="mt-2 text-sm text-[#B8AA96]">
                  {intelligenceV2?.intelligence_reason_v2 ?? "No intelligence narrative available."}
                </p>
              </div>
            </section>

            {hasValuationConflict ? (
              <section className="rounded-[32px] border border-amber-400/30 bg-amber-400/10 p-6 shadow-xl backdrop-blur-xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">
                  Valuation Conflict Detected
                </p>
                <h2 className="mt-3 text-3xl font-black text-white">
                  Auction Evidence Differs From Stored Estimate
                </h2>
                <p className="mt-3 text-sm leading-7 text-amber-100/80">
                  {valuationConflictDirection}
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-4">
                  <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                      Stored Estimate
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {money(valuationConflict?.estimated_value)}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                      Auction Median
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {money(valuationConflict?.auction_median)}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                      Auction High
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {money(valuationConflict?.auction_high)}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                      Difference
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {Number(valuationConflict?.difference_percent ?? 0).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur-xl">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-[#D8B65A]/20 bg-[#D8B65A]/10 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F4CD68]">
                    Collector Intelligence Value
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {ciConsensusValue}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-[#B8AA96]">
                    Valuation method: {hasAuctionComps ? `Verified auction evidence · ${auctionCount} accepted sale${auctionCount === 1 ? "" : "s"}` : displayConsensusSourceLabel}
                    {marketSource?.includes("popsike") || hasAuctionComps ? (
                      <span className="mt-2 block font-bold text-[#F4CD68]">
                        ✓ Popsike auction support included
                      </span>
                    ) : null}
                    {hasAuctionComps ? (
                      <span className="mt-2 block font-bold text-[#F4CD68]">
                        ✓ Auction-supported valuation
                      </span>
                    ) : null}
                  </p>
                </div>

                <div className={`rounded-3xl border p-5 ${displayEvidenceQuality.className}`}>
                  <p className="text-xs font-black uppercase tracking-[0.2em] opacity-75">
                    Evidence Quality
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {marketSource.includes("popsike") ? "Auction-Supported" : displayEvidenceQuality.label}
                  </p>
                  <p className="mt-2 text-xs leading-6 opacity-75">
                    {marketSource.includes("popsike")
                      ? `${auctionCount} valuation-grade auction sale${auctionCount === 1 ? "" : "s"} support this valuation.`
                      : displayEvidenceQuality.description}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                    "Discogs Variant Warning"
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {hasAuctionComps ? "No confirmed sales" : discogsBenchmark}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-[#B8AA96]">
                    "This exact variant has no confirmed Discogs sale history. Mixed Discogs values are excluded from appraisal."
                  </p>
                </div>
              </div>

              {hasAuctionComps ? (
                <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-5">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                        Auction Median
                      </p>
                      <p className="mt-2 text-3xl font-black text-white">
                        {auctionMedian}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                        Auction Count
                      </p>
                      <p className="mt-2 text-3xl font-black text-white">
                        {auctionCount}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                        Range
                      </p>
                      <p className="mt-2 text-xl font-black text-white">
                        {auctionLow}–{auctionHigh}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                        Latest Sale
                      </p>
                      <p className="mt-2 text-xl font-black text-white">
                        {auctionLatestSale}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                        Reliability
                      </p>
                      <p className="mt-2 text-xl font-black text-white">
                        {auctionSupportLevel === "HIGH" ? "High Confidence" : auctionSupportLevel === "MEDIUM" ? "Directional" : auctionReliability.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#B8AA96]">
                        {auctionSupportLevel === "HIGH"
                          ? `${auctionCount} high-confidence valuation-grade auction sales support this valuation.`
                          : auctionSupportLevel === "MEDIUM"
                            ? `${auctionCount} directional Popsike auction sales support this estimate with moderate confidence.`
                            : auctionReliability.description}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                        Market Stability
                      </p>
                      <p className="mt-2 text-xl font-black text-white">
                        {auctionVolatilityLabel}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#B8AA96]">
                        High-to-median auction spread analysis.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>


                </>
              }
              value={
                <>
            {/* VALUE INTELLIGENCE */}
            <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-2xl">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[#D8B86A]">
                  Value Intelligence
                </p>

                <h3 className="mt-3 text-3xl font-black">
                  Market Valuation Analysis
                </h3>
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-[#D8B65A]/20 bg-[#D8B65A]/10 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F4CD68]">
                    Collector Intelligence Value
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {ciConsensusValue}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-[#B8AA96]">
                    Valuation method: {hasAuctionComps ? `Verified auction evidence · ${auctionCount} accepted sale${auctionCount === 1 ? "" : "s"}` : displayConsensusSourceLabel}
                    {marketSource?.includes("popsike") || hasAuctionComps ? (
                      <span className="mt-2 block font-bold text-[#F4CD68]">
                        ✓ Popsike auction support included
                      </span>
                    ) : null}
                    {hasAuctionComps ? (
                      <span className="mt-2 block font-bold text-[#F4CD68]">
                        ✓ Auction-supported valuation
                      </span>
                    ) : null}
                  </p>

                  {auctionPremiumPercent != null ? (
                    <p className="mt-2 text-xs leading-6 text-[#F4CD68]">
                      Auction premium: {auctionPremiumPercent > 0 ? "+" : ""}
                      {auctionPremiumPercent}%
                    </p>
                  ) : null}
                </div>

                <div className={`rounded-3xl border p-5 ${displayEvidenceQuality.className}`}>
                  <p className="text-xs font-black uppercase tracking-[0.2em] opacity-75">
                    Evidence Quality
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {marketSource.includes("popsike") ? "Auction-Supported" : displayEvidenceQuality.label}
                  </p>
                  <p className="mt-2 text-xs leading-6 opacity-75">
                    {marketSource.includes("popsike")
                      ? `${auctionCount} valuation-grade auction sale${auctionCount === 1 ? "" : "s"} support this valuation.`
                      : displayEvidenceQuality.description}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                    "Discogs Variant Warning"
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {hasAuctionComps ? "No confirmed sales" : discogsBenchmark}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-[#B8AA96]">
                    {isBlockedMarket ? "Suppressed from consensus for this copy" : `Legacy / imported estimate: ${estimatedValue}`}
                  </p>
                </div>
              </div>

              {hasAuctionComps ? (
                <div className="mb-6 rounded-3xl border border-white/10 bg-black/25 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                        Auction Comps
                      </p>
                      <p className="mt-2 text-3xl font-black text-white">
                        {auctionMedian}
                      </p>
                      <p className="mt-2 text-xs leading-6 text-[#B8AA96]">
                        {auctionCount} matched auction results · Median sale
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#F4CD68]">
                        Source: verified Popsike auction evidence · mixed Discogs values excluded
                      </p>
                    </div>

                    <div className="grid gap-3 text-sm text-[#B8AA96] md:grid-cols-5">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#8E8170]">
                          Average
                        </p>
                        <p className="mt-1 font-bold text-white">
                          {auctionAverage}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#8E8170]">
                          Range
                        </p>
                        <p className="mt-1 font-bold text-white">
                          {auctionLow}–{auctionHigh}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#8E8170]">
                          Latest
                        </p>
                        <p className="mt-1 font-bold text-white">
                          {auctionLatestSale}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#8E8170]">
                          Reliability
                        </p>
                        <p className="mt-1 font-bold text-white">
                          {auctionSupportLevel === "HIGH" ? "High Confidence" : auctionSupportLevel === "MEDIUM" ? "Directional" : auctionReliability.label}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#8E8170]">
                          Stability
                        </p>
                        <p className="mt-1 font-bold text-white">
                          {auctionVolatilityLabel}
                        </p>
                      </div>
                    </div>
                  </div>

                  {recentAuctionComps && recentAuctionComps.length > 0 ? (
                    <div className="mt-5 border-t border-white/10 pt-4">
                      <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                        Accepted Auction Evidence
                      </p>

                      <div className="space-y-3">
                        {recentAuctionComps.map((comp, index) => (
                          <div
                            key={`${comp.source_record_url ?? comp.auction_title}-${index}`}
                            className="flex flex-col gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-3 md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <p className="text-sm font-bold text-white">
                                {comp.auction_title ?? "Verified Popsike auction"}
                              </p>
                              <p className="mt-1 text-xs text-[#8E8170]">
                                {formatDate(comp.auction_date)}
                              </p>
                              {comp.variant_match_notes ? (
                                <p className="mt-1 text-xs text-emerald-200">
                                  Accepted: {comp.variant_match_notes}
                                </p>
                              ) : null}
                            </div>

                            <p className="text-lg font-black text-[#F4CD68]">
                              {money(comp.sale_price_usd ?? comp.sale_price)}
                              {comp.original_sale_price && comp.original_currency ? (
                                <span className="ml-2 text-xs font-bold text-[#8E8170]">
                                  original {comp.original_currency} {Number(comp.original_sale_price).toLocaleString()}
                                </span>
                              ) : null}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {rejectedAuctionComps && rejectedAuctionComps.length > 0 ? (
                    <div className="mt-5 border-t border-white/10 pt-4">
                      <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                        Excluded Variant Evidence
                      </p>

                      <div className="space-y-3">
                        {rejectedAuctionComps.map((comp, index) => (
                          <div
                            key={`${comp.source_record_url ?? comp.auction_title}-rejected-${index}`}
                            className="flex flex-col gap-2 rounded-2xl border border-red-300/20 bg-red-300/[0.05] p-3 md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <p className="text-sm font-bold text-white">
                                {comp.auction_title ?? "Rejected Popsike auction"}
                              </p>
                              <p className="mt-1 text-xs text-[#8E8170]">
                                {formatDate(comp.auction_date)}
                              </p>
                              <p className="mt-1 text-xs text-red-200">
                                Excluded from valuation: {comp.variant_match_notes ?? comp.confidence ?? "Variant mismatch"}
                              </p>
                            </div>

                            <p className="text-lg font-black text-red-200">
                              {money(comp.sale_price_usd ?? comp.sale_price)}
                              {comp.original_sale_price && comp.original_currency ? (
                                <span className="ml-2 text-xs font-bold text-[#8E8170]">
                                  original {comp.original_currency} {Number(comp.original_sale_price).toLocaleString()}
                                </span>
                              ) : null}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <p className="mt-4 text-xs leading-6 text-[#8E8170]">
                    Accepted auction evidence is prioritized for rare variants. Rejected variant evidence is excluded from valuation.
                  </p>
                </div>
              ) : null}

              <ValueIntelligenceCard
                valueInput={{
                  discogsLowPrice: getNumber(
                    record,
                    "discogs_low_price"
                  ),
                  discogsMedianPrice: getNumber(
                    record,
                    "discogs_median_price"
                  ),
                  discogsHighPrice: getNumber(
                    record,
                    "discogs_high_price"
                  ),
                  ebayLastSoldPrice: getNumber(
                    record,
                    "ebay_last_sold_price"
                  ),
                  ebayAvgSoldPrice: getNumber(
                    record,
                    "ebay_avg_sold_price"
                  ),
                  ebaySoldCount: getNumber(
                    record,
                    "ebay_sold_count"
                  ),
                  manualCompPrice: getNumber(
                    record,
                    "manual_comp_price"
                  ),
                  purchasePrice: getNumber(
                    record,
                    "purchase_price"
                  ),
                  conditionGrade:
                    getText(record, "condition_grade") ||
                    getText(record, "media_grade") ||
                    null,
                  valueLastUpdated:
                    getText(record, "value_last_updated") ||
                    null,
                }}
              />
            </section>



            {/* MOMENTUM */}
            <section className="rounded-[32px] border border-cyan-400/20 bg-cyan-400/5 p-6">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Market Momentum Intelligence
                </p>

                <h3 className="mt-3 text-3xl font-black">
                  Trend & Supply Analysis
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <MomentumCard
                  label="Momentum"
                  value={displayValue(
                    getValue(record, "market_momentum")
                  )}
                />

                <MomentumCard
                  label="Trend"
                  value={displayValue(
                    getValue(record, "market_trend")
                  )}
                />

                <MomentumCard
                  label="Value Change %"
                  value={
                    getValue(
                      record,
                      "market_value_change_percent"
                    ) !== null
                      ? `${getValue(
                          record,
                          "market_value_change_percent"
                        )}%`
                      : "—"
                  }
                />

                <MomentumCard
                  label="Supply Change"
                  value={displayValue(
                    getValue(record, "market_supply_change")
                  )}
                />
              </div>
            </section>


                </>
              }
              tracks={
                <>
            <TrackIntelligenceSection
              tracks={tracks}
              discogsReleaseId={discogsReleaseId}
            />


                </>
              }
              pressing={
                <>
            <RecordPressingIdentifier
              recordId={Number(getValue(record, "id"))}
            />


                </>
              }
              details={
                <>
            {/* RELEASE DETAILS */}
            <Section title="Release Details">
              <form action={updateReleaseDetails} className="space-y-5">
                <input
                  type="hidden"
                  name="id"
                  value={String(getValue(record, "id"))}
                />

                <input
                  type="hidden"
                  name="returnTo"
                  value={returnPath}
                />

                <Grid>
                  <Field
                    label="Artist"
                    name="artist"
                    defaultValue={getValue(record, "artist")}
                  />

                  <Field
                    label="Title"
                    name="title"
                    defaultValue={getValue(record, "title")}
                  />

                  <Field
                    label="Format"
                    name="format"
                    defaultValue={getValue(record, "format")}
                  />

                  <Field
                    label="Label"
                    name="label"
                    defaultValue={getValue(record, "label")}
                  />

                  <Field
                    label="Year"
                    name="year_released"
                    defaultValue={getValue(
                      record,
                      "year_released"
                    )}
                  />

                  <Field
                    label="Country"
                    name="country"
                    defaultValue={getValue(record, "country")}
                  />

                  <Field
                    label="Discogs Release ID"
                    name="discogs_release_id"
                    defaultValue={getValue(
                      record,
                      "discogs_release_id"
                    )}
                  />

                  <Field
                    label="Discogs URL"
                    name="discogs_url"
                    defaultValue={getValue(
                      record,
                      "discogs_url"
                    )}
                  />
                </Grid>

                <TextArea
                  label="Notes"
                  name="notes"
                  defaultValue={getValue(record, "notes")}
                />

                <SaveButton />
              </form>
            </Section>


            {/* COLLECTOR DETAILS */}
            <Section title="Collector Archive Details">
              <form action={updateCollectorDetails} className="space-y-5">
                <input
                  type="hidden"
                  name="id"
                  value={String(getValue(record, "id"))}
                />

                <input
                  type="hidden"
                  name="returnTo"
                  value={returnPath}
                />

                <Grid>
                  <SelectField
                    label="Media Grade"
                    name="media_grade"
                    defaultValue={getValue(
                      record,
                      "media_grade"
                    )}
                  />

                  <SelectField
                    label="Sleeve Grade"
                    name="sleeve_grade"
                    defaultValue={getValue(
                      record,
                      "sleeve_grade"
                    )}
                  />

                  <Field
                    label="Purchase Price"
                    name="purchase_price"
                    defaultValue={getValue(
                      record,
                      "purchase_price"
                    )}
                  />

                  <Field
                    label="Current Value"
                    name="current_value"
                    defaultValue={getValue(
                      record,
                      "current_value"
                    )}
                  />
                </Grid>

                <TextArea
                  label="Collector Notes"
                  name="grading_notes"
                  defaultValue={getValue(
                    record,
                    "grading_notes"
                  )}
                />

                <SaveButton />
              </form>
            </Section>

                </>
              }
              tools={
                <>
            <section className="rounded-[32px] border border-red-500/15 bg-red-500/[0.04] p-6 shadow-xl backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.2em] text-red-200">
                Record Actions
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <form action={duplicateRecord}>
                  <input type="hidden" name="id" value={String(getValue(record, "id"))} />
                  <button className="w-full rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-4 text-sm font-black text-cyan-100">
                    Duplicate Record
                  </button>
                </form>

                <form action={deleteRecord}>
                  <input type="hidden" name="id" value={String(getValue(record, "id"))} />
                  <DeleteRecordButton />
                </form>
              </div>
            </section>

            {/* MARKET ACTIONS */}
            <section className="rounded-[32px] border border-emerald-400/25 bg-emerald-400/10 p-6 shadow-xl backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
                Pressing Availability
              </p>

              <h2 className="mt-3 text-3xl font-black text-white">
                {pressingAvailability}
              </h2>

              <p className="mt-3 text-sm leading-7 text-emerald-100/80">
                Measures the availability of this exact pressing in the current marketplace.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                    Copies For Sale
                  </p>

                  <p className="mt-2 text-3xl font-black text-white">
                    {forSale ?? "—"}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                    Availability Insight
                  </p>

                  <p className="mt-2 text-sm text-white">
                    {availabilityDescription}
                  </p>
                </div>
              </div>
            </section>

            {warehouseRarity ? (
              <section className="rounded-[32px] border border-cyan-400/25 bg-cyan-400/10 p-6 shadow-xl backdrop-blur-xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                  Warehouse Match Profile
                </p>
                <h2 className="mt-3 text-3xl font-black text-white">
                  {warehouseRarity.warehouse_rarity_label}
                </h2>
                <p className="mt-3 text-sm leading-7 text-cyan-100/80">
                  Measures how unusual this artist and label combination is within the 5M-release Collector Intelligence warehouse. This does not represent overall album rarity.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                      Similar Artist/Label Matches
                    </p>
                    <p className="mt-2 text-3xl font-black text-white">
                      {Number(warehouseRarity.warehouse_similar_releases || 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                      Artist
                    </p>
                    <p className="mt-2 text-lg font-black text-white">
                      {displayArtistName(warehouseRarity.artist)}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                      Label
                    </p>
                    <p className="mt-2 text-lg font-black text-white">
                      {warehouseRarity.label ?? "—"}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-[32px] border border-fuchsia-400/20 bg-fuchsia-400/5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-200">
                    Market Intelligence Engine
                  </p>

                  <h3 className="mt-3 text-3xl font-black">
                    Refresh Market Data
                  </h3>

                  <p className="mt-3 max-w-xl text-sm leading-7 text-white/70">
                    Pull fresh Discogs marketplace intelligence,
                    pricing analytics, and supply signals for this
                    release.
                  </p>
                </div>

                <form action={pullSingleDiscogsValue}>
                  <input
                    type="hidden"
                    name="id"
                    value={String(getValue(record, "id"))}
                  />

                  <input
                    type="hidden"
                    name="releaseId"
                    value={discogsReleaseId}
                  />

                  <input
                    type="hidden"
                    name="returnTo"
                    value={returnPath}
                  />

                  <button
                    type="submit"
                    disabled={!discogsReleaseId}
                    className="rounded-2xl bg-fuchsia-500 px-6 py-4 text-sm font-bold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:bg-neutral-700"
                  >
                    Pull Market Intelligence
                  </button>
                </form>
              </div>
            </section>


            {/* MANUAL COMPS */}
            <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur-xl">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[#D8B86A]">
                  Manual Value Intelligence
                </p>

                <h3 className="mt-3 text-3xl font-black">
                  Collector Value Comps
                </h3>
              </div>

              <ManualValueCompForm
                recordId={String(getValue(record, "id"))}
                currentValues={{
                  manualCompPrice: getNumber(
                    record,
                    "manual_comp_price"
                  ),
                  manualCompNote: getText(
                    record,
                    "manual_comp_note"
                  ),
                  ebayLastSoldPrice: getNumber(
                    record,
                    "ebay_last_sold_price"
                  ),
                  ebayAvgSoldPrice: getNumber(
                    record,
                    "ebay_avg_sold_price"
                  ),
                  ebaySoldCount: getNumber(
                    record,
                    "ebay_sold_count"
                  ),
                  ebayCompUrl: getText(
                    record,
                    "ebay_comp_url"
                  ),
                  conditionGrade:
                    getText(record, "condition_grade") ||
                    getText(record, "media_grade"),
                }}
              />
            </section>


                </>
              }
            />


          </div>
        </section>
      </div>
    </main>
  );
}

/* ============================================================================
   TRACK INTELLIGENCE
============================================================================ */

function TrackIntelligenceSection({
  tracks,
  discogsReleaseId,
}: {
  tracks: TrackRow[];
  discogsReleaseId: string;
}) {
  const grouped = tracks.reduce<Record<string, TrackRow[]>>((acc, track) => {
    const side = track.side || "Release Sequence";

    if (!acc[side]) {
      acc[side] = [];
    }

    acc[side].push(track);

    return acc;
  }, {});

  const totalSeconds = tracks.reduce(
    (sum, track) => sum + (track.duration_seconds || 0),
    0
  );

  const runtime =
    totalSeconds > 0
      ? formatTrackSeconds(totalSeconds)
      : "Runtime unavailable";

  return (
    <section className="rounded-[32px] border border-cyan-400/20 bg-cyan-400/5 p-6 shadow-xl backdrop-blur-xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
            Album Intelligence
          </p>

          <h3 className="mt-3 text-3xl font-black">
            Track Listing
          </h3>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
            Sequencing, side structure, runtime, and track-level intelligence
            synced from the Collector Intelligence track engine.
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-300/20 bg-black/30 px-5 py-4 text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">
            Tracks
          </p>

          <p className="mt-2 text-3xl font-black text-white">
            {tracks.length}
          </p>

          <p className="mt-1 text-xs text-white/50">
            {runtime}
          </p>
        </div>
      </div>

      {tracks.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(grouped).map(([side, sideTracks]) => (
            <div
              key={side}
              className="rounded-[26px] border border-white/10 bg-black/25 p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#D8B86A]">
                  {side === "Release Sequence" ? "Track Sequence" : `Side ${side}`}
                </p>

                <p className="text-xs text-white/50">
                  {sideTracks.length} track{sideTracks.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="divide-y divide-white/10">
                {sideTracks.map((track) => (
                  <div
                    key={`${track.discogs_release_id}-${track.position}-${track.title}`}
                    className="grid gap-4 py-4 md:grid-cols-[80px_1fr_90px]"
                  >
                    <div className="font-mono text-sm font-black text-cyan-200">
                      {track.position || "—"}
                    </div>

                    <div>
                      <p className="text-lg font-black text-white">
                        {track.title}
                      </p>

                      {track.artist_credit ? (
                        <p className="mt-1 text-sm text-white/50">
                          {track.artist_credit}
                        </p>
                      ) : null}
                    </div>

                    <div className="text-right text-sm font-bold text-[#D8B86A]">
                      {track.duration_raw || formatTrackSeconds(track.duration_seconds)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[26px] border border-dashed border-white/10 bg-black/20 p-8 text-center">
          <p className="text-lg font-black text-white">
            No track listing synced yet.
          </p>

          <p className="mt-2 text-sm text-white/50">
            Discogs release {discogsReleaseId || "ID missing"} will populate
            through the automatic track-sync engine when available.
          </p>

          <Link
            href="/collection/track-intelligence"
            className="mt-5 inline-flex rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-bold text-cyan-100"
          >
            Open Track Intelligence
          </Link>
        </div>
      )}
    </section>
  );
}

/* ============================================================================
   UI COMPONENTS
============================================================================ */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur-xl">
      <h3 className="mb-6 text-2xl font-black tracking-tight text-[#F4EFE6]">
        {title}
      </h3>

      {children}
    </section>
  );
}

function Grid({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="grid gap-5 md:grid-cols-2">{children}</div>;
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string | number | boolean | null;
  type?: string;
}) {
  return (
    <label>
      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[#8E8170]">
        {label}
      </div>

      <input
        type={type}
        name={name}
        defaultValue={
          defaultValue == null ? "" : String(defaultValue)
        }
        className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white outline-none transition focus:border-[#C7A45D]/60"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | boolean | null;
}) {
  return (
    <label>
      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[#8E8170]">
        {label}
      </div>

      <textarea
        rows={5}
        name={name}
        defaultValue={
          defaultValue == null ? "" : String(defaultValue)
        }
        className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white outline-none transition focus:border-[#C7A45D]/60"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | boolean | null;
}) {
  const grades = [
    "",
    "Mint",
    "Near Mint",
    "NM",
    "VG+",
    "VG",
    "Good",
    "Fair",
    "Poor",
  ];

  return (
    <label>
      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[#8E8170]">
        {label}
      </div>

      <select
        name={name}
        defaultValue={
          defaultValue == null ? "" : String(defaultValue)
        }
        className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white outline-none transition focus:border-[#C7A45D]/60"
      >
        {grades.map((grade) => (
          <option key={grade} value={grade}>
            {grade || "Select Grade"}
          </option>
        ))}
      </select>
    </label>
  );
}

function SaveButton() {
  return (
    <button className="rounded-2xl bg-[#C7A45D] px-6 py-4 text-sm font-black text-black transition hover:bg-[#D8B86A]">
      Save Changes
    </button>
  );
}

function Read({
  label,
  value,
}: {
  label: string;
  value?: string | number | boolean | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[#8E8170]">
        {label}
      </div>

      <div className="mt-3 text-sm leading-7 text-white">
        {value == null || value === ""
          ? "—"
          : String(value)}
      </div>
    </div>
  );
}

function CommandMetric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#8E8170]">
        {label}
      </p>
      <p className={accent ? "mt-2 text-2xl font-black text-[#D8B86A]" : "mt-2 text-2xl font-black text-white"}>
        {value == null || value === "" ? "—" : String(value)}
      </p>
    </div>
  );
}

function SignalCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl backdrop-blur-xl">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#8E8170]">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black">
        {value}
      </p>
    </div>
  );
}

function MomentumCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-xl font-black text-white">
        {value}
      </p>
    </div>
  );
}
