import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.argv[2];

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!userId) {
  console.error("Usage: node scripts/recompute-portfolio-snapshot.mjs <user_id>");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

function toNumber(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value, fallback = "Unknown") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function distribution(records, key, limit) {
  const map = new Map();

  for (const record of records) {
    const label = normalizeText(record[key]);
    map.set(label, (map.get(label) ?? 0) + 1);
  }

  const rows = Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

function recordValue(record) {
  return (
    toNumber(record.market_consensus_value) ||
    toNumber(record.estimated_value) ||
    toNumber(record.current_value) ||
    toNumber(record.market_median_price) ||
    toNumber(record.discogs_median_price)
  );
}

function confidenceLabel(score) {
  if (score >= 85) return "High";
  if (score >= 65) return "Moderate";
  if (score >= 40) return "Developing";
  return "Low";
}

function buildPortfolioConfidence(records) {
  const totalRecords = records.length;

  if (totalRecords === 0) {
    return {
      score: 0,
      label: "Low",
      summary:
        "Collector Intelligence does not yet have enough portfolio data to produce a reliable intelligence summary.",
      reasons: [
        "No collection records were available for this portfolio snapshot.",
      ],
    };
  }

  const valuedRecords = records.filter((record) => recordValue(record) > 0).length;
  const iqRecords = records.filter((record) => toNumber(record.collector_iq_score) > 0).length;
  const demandRecords = records.filter((record) => toNumber(record.demand_score) > 0).length;
  const rarityRecords = records.filter((record) => toNumber(record.rarity_score) > 0).length;

  const valueCoverage = valuedRecords / totalRecords;
  const iqCoverage = iqRecords / totalRecords;
  const demandCoverage = demandRecords / totalRecords;
  const rarityCoverage = rarityRecords / totalRecords;

  const score = Math.round(
    valueCoverage * 35 +
      iqCoverage * 25 +
      demandCoverage * 20 +
      rarityCoverage * 20
  );

  return {
    score,
    label: confidenceLabel(score),
    summary:
      score >= 85
        ? "Collector Intelligence has strong coverage across value, IQ, demand, and rarity signals for this portfolio."
        : score >= 65
          ? "Collector Intelligence has moderate intelligence coverage, with enough signal density for useful portfolio-level interpretation."
          : score >= 40
            ? "Collector Intelligence is still developing confidence for this portfolio because some intelligence signals remain incomplete."
            : "Collector Intelligence has low confidence for this portfolio snapshot because too many intelligence signals are missing or incomplete.",
    reasons: [
      `${valuedRecords} of ${totalRecords} records have usable value intelligence.`,
      `${iqRecords} of ${totalRecords} records have Collector IQ signals.`,
      `${demandRecords} of ${totalRecords} records have demand signals.`,
      `${rarityRecords} of ${totalRecords} records have rarity signals.`,
    ],
  };
}

const { data: records, error } = await supabase
  .from("records_clean_safe")
  .select(`
    id,
    artist,
    title,
    country,
    genre,
    market_consensus_value,
    estimated_value,
    current_value,
    market_median_price,
    discogs_median_price,
    collector_iq_score,
    demand_score,
    supply_pressure,
    volatility_score,
    rarity_score,
    market_momentum
  `)
  .eq("user_id", userId);

if (error) {
  console.error(error.message);
  process.exit(1);
}

const safeRecords = records ?? [];
const totalRecords = safeRecords.length;

const totalCollectionValue = safeRecords.reduce(
  (sum, record) => sum + recordValue(record),
  0
);

const averageRecordValue =
  totalRecords > 0 ? totalCollectionValue / totalRecords : 0;

const averageCollectorIq =
  totalRecords > 0
    ? safeRecords.reduce(
        (sum, record) => sum + toNumber(record.collector_iq_score),
        0
      ) / totalRecords
    : 0;

const averageDemandScore =
  totalRecords > 0
    ? safeRecords.reduce(
        (sum, record) => sum + toNumber(record.demand_score),
        0
      ) / totalRecords
    : 0;

const averageSupplyPressure =
  totalRecords > 0
    ? safeRecords.reduce(
        (sum, record) => sum + toNumber(record.supply_pressure),
        0
      ) / totalRecords
    : 0;

const averageVolatilityScore =
  totalRecords > 0
    ? safeRecords.reduce(
        (sum, record) => sum + toNumber(record.volatility_score),
        0
      ) / totalRecords
    : 0;

const averageRarityScore =
  totalRecords > 0
    ? safeRecords.reduce(
        (sum, record) => sum + toNumber(record.rarity_score),
        0
      ) / totalRecords
    : 0;

const highValueRecords = safeRecords.filter(
  (record) => recordValue(record) > 500
).length;

const eliteValueRecords = safeRecords.filter(
  (record) => recordValue(record) > 1000
).length;

const acceleratingRecords = safeRecords.filter((record) =>
  String(record.market_momentum ?? "")
    .toLowerCase()
    .includes("acceler")
).length;

const volatileRecords = safeRecords.filter(
  (record) => toNumber(record.volatility_score) >= 50
).length;

const highDemandRecords = safeRecords.filter(
  (record) => toNumber(record.demand_score) >= 50
).length;

const topRecords = [...safeRecords]
  .sort((a, b) => recordValue(b) - recordValue(a))
  .slice(0, 15)
  .map((record) => ({
    id: record.id,
    artist: record.artist,
    title: record.title,
    value: recordValue(record),
    collector_iq_score: toNumber(record.collector_iq_score),
    market_momentum: record.market_momentum ?? null,
  }));

const confidence = buildPortfolioConfidence(safeRecords);

const { data: inserted, error: insertError } = await supabase
  .from("portfolio_intelligence_snapshots")
  .insert({
    user_id: userId,
    total_records: totalRecords,
    total_collection_value: totalCollectionValue,
    average_record_value: averageRecordValue,
    average_collector_iq: averageCollectorIq,
    high_value_records: highValueRecords,
    elite_value_records: eliteValueRecords,
    average_demand_score: averageDemandScore,
    average_supply_pressure: averageSupplyPressure,
    average_volatility_score: averageVolatilityScore,
    average_rarity_score: averageRarityScore,
    accelerating_records: acceleratingRecords,
    volatile_records: volatileRecords,
    high_demand_records: highDemandRecords,
    country_distribution: distribution(safeRecords, "country"),
    genre_distribution: distribution(safeRecords, "genre", 8),
    top_records: topRecords,
    snapshot_reason: "local_terminal_recompute_consensus_value_fix",
    intelligence_confidence_score: confidence.score,
    intelligence_confidence_label: confidence.label,
    intelligence_summary: confidence.summary,
    intelligence_reasons: confidence.reasons,
  })
  .select("id")
  .single();

if (insertError) {
  console.error(insertError.message);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      userId,
      snapshotId: inserted?.id,
      totalRecords,
      totalCollectionValue,
      formattedValue: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(totalCollectionValue),
    },
    null,
    2
  )
);
