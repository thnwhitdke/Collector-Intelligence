// src/lib/value-intelligence.ts

export type ValueInput = {
  discogsLowPrice?: number | null;
  discogsMedianPrice?: number | null;
  discogsHighPrice?: number | null;

  salesMedianPrice?: number | null;
  salesAveragePrice?: number | null;
  salesLowestPrice?: number | null;
  salesHighestPrice?: number | null;
  salesMatchedCount?: number | null;
  salesConfidenceScore?: number | null;

  ebayLastSoldPrice?: number | null;
  ebayAvgSoldPrice?: number | null;
  ebaySoldCount?: number | null;
  manualCompPrice?: number | null;
  purchasePrice?: number | null;
  conditionGrade?: string | null;
  valueLastUpdated?: string | null;

  marketNumForSale?: number | null;
  marketForSaleRatio?: number | null;
};

export type ValueIntelligenceResult = {
  estimatedValue: number | null;
  confidenceScore: number;
  signal: string;
  badges: string[];
  insight: string;

  rarityScore: number;
  marketMomentum: string;
  collectorIqScore: number;

  sourceSummary: {
    discogs: number | null;
    sales: number | null;
    salesMatchedCount: number | null;
    salesConfidenceScore: number | null;
    ebay: number | null;
    manual: number | null;
    conditionMultiplier: number;
    purchasePrice: number | null;
    marketNumForSale: number | null;
    marketForSaleRatio: number | null;
  };
};

function validNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function getConditionMultiplier(conditionGrade?: string | null): number {
  const grade = conditionGrade?.trim().toUpperCase();

  if (!grade) return 1;

  if (["M", "MINT", "SEALED"].includes(grade)) return 1.15;
  if (["NM", "NEAR MINT", "NM-"].includes(grade)) return 1.08;
  if (["VG+", "VERY GOOD PLUS"].includes(grade)) return 1;
  if (["VG", "VERY GOOD"].includes(grade)) return 0.85;
  if (["G+", "GOOD PLUS"].includes(grade)) return 0.65;
  if (["G", "GOOD"].includes(grade)) return 0.5;
  if (["F", "FAIR", "P", "POOR"].includes(grade)) return 0.3;

  return 1;
}

function isStale(dateString?: string | null): boolean {
  if (!dateString) return true;

  const updated = new Date(dateString);

  if (Number.isNaN(updated.getTime())) return true;

  const ninetyDays = 1000 * 60 * 60 * 24 * 90;

  return new Date().getTime() - updated.getTime() > ninetyDays;
}

function calculateRarity(marketNumForSale: number | null): number {
  if (marketNumForSale === null) return 0;
  if (marketNumForSale <= 1) return 95;
  if (marketNumForSale <= 3) return 85;
  if (marketNumForSale <= 10) return 70;
  if (marketNumForSale <= 25) return 50;
  return 25;
}

function calculateMomentum(ratio: number | null): string {
  if (ratio === null) return "Unknown";
  if (ratio < 0.05) return "Strong";
  if (ratio < 0.15) return "Healthy";
  if (ratio < 0.3) return "Stable";
  return "Soft";
}

export function calculateValueIntelligence(
  input: ValueInput,
): ValueIntelligenceResult {
  const discogsLow = validNumber(input.discogsLowPrice);
  const discogsMedian = validNumber(input.discogsMedianPrice);
  const discogsHigh = validNumber(input.discogsHighPrice);

  const salesMedian = validNumber(input.salesMedianPrice);
  const salesAverage = validNumber(input.salesAveragePrice);
  const salesLowest = validNumber(input.salesLowestPrice);
  const salesHighest = validNumber(input.salesHighestPrice);
  const salesMatchedCount = validNumber(input.salesMatchedCount);
  const salesConfidenceScore = validNumber(input.salesConfidenceScore);

  const ebayLast = validNumber(input.ebayLastSoldPrice);
  const ebayAverage = validNumber(input.ebayAvgSoldPrice);
  const ebaySoldCount = validNumber(input.ebaySoldCount);

  const manualComp = validNumber(input.manualCompPrice);
  const purchasePrice = validNumber(input.purchasePrice);

  const marketNumForSale = validNumber(input.marketNumForSale);
  const marketForSaleRatio = validNumber(input.marketForSaleRatio);

  const conditionMultiplier = getConditionMultiplier(input.conditionGrade);

  const discogsValue = discogsMedian ?? discogsHigh ?? discogsLow;

  const salesValue =
    salesMedian ??
    salesAverage ??
    salesLowest ??
    salesHighest;

  const ebayValue = ebayAverage ?? ebayLast;

  const sources: {
    name: string;
    value: number;
    baseWeight: number;
  }[] = [];

  if (salesValue !== null) {
    const salesWeight =
      salesMatchedCount !== null && salesMatchedCount >= 5
        ? 45
        : salesMatchedCount !== null && salesMatchedCount >= 2
        ? 38
        : 30;

    sources.push({
      name: "sales",
      value: salesValue,
      baseWeight: salesWeight,
    });
  }

  if (discogsValue !== null) {
    sources.push({
      name: "discogs",
      value: discogsValue,
      baseWeight: salesValue !== null ? 35 : 40,
    });
  }

  if (ebayValue !== null) {
    sources.push({
      name: "ebay",
      value: ebayValue,
      baseWeight: salesValue !== null ? 30 : 35,
    });
  }

  if (manualComp !== null) {
    sources.push({
      name: "manual",
      value: manualComp,
      baseWeight: 20,
    });
  }

  let estimatedValue: number | null = null;

  if (sources.length > 0) {
    const totalWeight = sources.reduce(
      (sum, source) => sum + source.baseWeight,
      0,
    );

    const weighted =
      sources.reduce(
        (sum, source) =>
          sum + source.value * (source.baseWeight / totalWeight),
        0,
      ) * conditionMultiplier;

    estimatedValue = roundMoney(weighted);
  }

  const rarityScore = calculateRarity(marketNumForSale);
  const marketMomentum = calculateMomentum(marketForSaleRatio);

  let confidenceScore = 0;
  const badges: string[] = [];

  if (salesValue !== null) {
    confidenceScore += 35;

    if (salesMatchedCount !== null && salesMatchedCount >= 5) {
      confidenceScore += 15;
      badges.push("Verified Sales Depth");
    } else if (salesMatchedCount !== null && salesMatchedCount >= 2) {
      confidenceScore += 8;
      badges.push("Sales Comp Supported");
    } else {
      badges.push("Single Sales Comp");
    }

    if (salesConfidenceScore !== null && salesConfidenceScore >= 80) {
      confidenceScore += 10;
      badges.push("High Sales Confidence");
    } else if (salesConfidenceScore !== null && salesConfidenceScore >= 60) {
      confidenceScore += 5;
    }
  }

  if (discogsValue !== null) confidenceScore += salesValue !== null ? 18 : 25;
  if (ebayValue !== null) confidenceScore += salesValue !== null ? 20 : 30;
  if (manualComp !== null) confidenceScore += 20;
  if (input.conditionGrade) confidenceScore += 10;

  if (ebaySoldCount !== null && ebaySoldCount >= 3) {
    confidenceScore += 10;
  }

  if (rarityScore >= 70) confidenceScore += 5;

  if (!isStale(input.valueLastUpdated)) {
    confidenceScore += 5;
  }

  confidenceScore = Math.min(confidenceScore, 100);

  if (rarityScore >= 80) {
    badges.push("Rare Pressing");
  }

  if (salesValue !== null) {
    badges.push("CI Sold-Market Intelligence");
  }

  badges.push(`Momentum: ${marketMomentum}`);

  let signal = "Needs More Data";

  if (confidenceScore >= 85) {
    signal = "Strong CI Confidence";
  } else if (confidenceScore >= 70) {
    signal = "Good CI Confidence";
  } else if (confidenceScore >= 50) {
    signal = "Moderate CI Confidence";
  } else if (confidenceScore >= 25) {
    signal = "Low Confidence";
  }

  let insight =
    "Collector intelligence is still developing for this item.";

  if (salesValue !== null && salesMatchedCount !== null && salesMatchedCount >= 2) {
    insight =
      "CI has historical sold-market comps for this record, strengthening valuation beyond external asking-price data.";
  }

  if (rarityScore >= 80) {
    insight =
      "Low market supply suggests this item may have stronger scarcity characteristics.";
  }

  if (marketMomentum === "Strong") {
    insight =
      "Market pressure appears favorable with relatively low supply pressure.";
  }

  let collectorIqScore = 0;

  collectorIqScore += rarityScore * 0.30;
  collectorIqScore += confidenceScore * 0.20;

  collectorIqScore +=
    marketMomentum === "Strong"
      ? 20
      : marketMomentum === "Soft"
      ? 10
      : 0;

  collectorIqScore +=
    marketForSaleRatio !== null && marketForSaleRatio < 2
      ? 15
      : marketForSaleRatio !== null && marketForSaleRatio < 10
      ? 8
      : 0;

  collectorIqScore +=
    estimatedValue !== null && estimatedValue >= 50
      ? 15
      : estimatedValue !== null && estimatedValue >= 20
      ? 8
      : 0;

  if (salesValue !== null) {
    collectorIqScore +=
      salesMatchedCount !== null && salesMatchedCount >= 5
        ? 10
        : salesMatchedCount !== null && salesMatchedCount >= 2
        ? 6
        : 3;
  }

  collectorIqScore = Math.min(100, Math.round(collectorIqScore));

  return {
    estimatedValue,
    confidenceScore,
    signal,
    badges,
    insight,

    rarityScore,
    marketMomentum,
    collectorIqScore,

    sourceSummary: {
      discogs: discogsValue,
      sales: salesValue,
      salesMatchedCount,
      salesConfidenceScore,
      ebay: ebayValue,
      manual: manualComp,
      conditionMultiplier,
      purchasePrice,
      marketNumForSale,
      marketForSaleRatio,
    },
  };
}
