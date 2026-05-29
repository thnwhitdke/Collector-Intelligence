// src/lib/value-intelligence.ts

export type ValueInput = {
  discogsLowPrice?: number | null;
  discogsMedianPrice?: number | null;
  discogsHighPrice?: number | null;
  ebayLastSoldPrice?: number | null;
  ebayAvgSoldPrice?: number | null;
  ebaySoldCount?: number | null;
  manualCompPrice?: number | null;
  purchasePrice?: number | null;
  conditionGrade?: string | null;
  valueLastUpdated?: string | null;
};

export type ValueIntelligenceResult = {
  estimatedValue: number | null;
  confidenceScore: number;
  signal: string;
  badges: string[];
  insight: string;
  sourceSummary: {
    discogs: number | null;
    ebay: number | null;
    manual: number | null;
    conditionMultiplier: number;
    purchasePrice: number | null;
  };
};

function validNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

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

  const now = new Date();
  const ninetyDays = 1000 * 60 * 60 * 24 * 90;

  return now.getTime() - updated.getTime() > ninetyDays;
}

export function calculateValueIntelligence(
  input: ValueInput,
): ValueIntelligenceResult {
  const discogsLow = validNumber(input.discogsLowPrice);
  const discogsMedian = validNumber(input.discogsMedianPrice);
  const discogsHigh = validNumber(input.discogsHighPrice);

  const ebayLast = validNumber(input.ebayLastSoldPrice);
  const ebayAverage = validNumber(input.ebayAvgSoldPrice);
  const ebaySoldCount = validNumber(input.ebaySoldCount);

  const manualComp = validNumber(input.manualCompPrice);
  const purchasePrice = validNumber(input.purchasePrice);

  const conditionMultiplier = getConditionMultiplier(input.conditionGrade);

  const discogsValue = discogsMedian ?? discogsHigh ?? discogsLow;
  const ebayValue = ebayAverage ?? ebayLast;

  const sources: { name: string; value: number; baseWeight: number }[] = [];

  if (discogsValue !== null) {
    sources.push({ name: "discogs", value: discogsValue, baseWeight: 40 });
  }

  if (ebayValue !== null) {
    sources.push({ name: "ebay", value: ebayValue, baseWeight: 35 });
  }

  if (manualComp !== null) {
    sources.push({ name: "manual", value: manualComp, baseWeight: 20 });
  }

  let estimatedValue: number | null = null;

  if (sources.length > 0) {
    const totalWeight = sources.reduce((sum, source) => sum + source.baseWeight, 0);

    const weightedValue =
      sources.reduce((sum, source) => {
        return sum + source.value * (source.baseWeight / totalWeight);
      }, 0) * conditionMultiplier;

    estimatedValue = roundMoney(weightedValue);
  }

  let confidenceScore = 0;
  const badges: string[] = [];

  if (discogsValue !== null) confidenceScore += 25;
  if (ebayValue !== null) confidenceScore += 30;
  if (manualComp !== null) confidenceScore += 20;
  if (input.conditionGrade) confidenceScore += 10;
  if (ebaySoldCount !== null && ebaySoldCount >= 3) confidenceScore += 10;
  if (!isStale(input.valueLastUpdated)) confidenceScore += 5;

  confidenceScore = Math.min(confidenceScore, 100);

  if (discogsValue !== null && ebayValue !== null) {
    badges.push("Strong Market Signal");
  }

  if (discogsValue !== null && ebayValue === null) {
    badges.push("Discogs Only");
  }

  if (ebayValue === null) {
    badges.push("Needs eBay Sold Comp");
  }

  if (manualComp !== null) {
    badges.push("Manual Comp Present");
  }

  if (input.conditionGrade) {
    badges.push(`Condition: ${input.conditionGrade}`);
  }

  if (isStale(input.valueLastUpdated)) {
    badges.push("Price Data Stale");
  }

  if (
    estimatedValue !== null &&
    purchasePrice !== null &&
    purchasePrice > 0 &&
    estimatedValue >= purchasePrice * 1.5
  ) {
    badges.push("Undervalued Purchase");
  }

  if (estimatedValue !== null && estimatedValue >= 100 && confidenceScore < 60) {
    badges.push("High Value / Low Confidence");
  }

  let signal = "Needs More Data";

  if (confidenceScore >= 80) signal = "Strong Confidence";
  else if (confidenceScore >= 60) signal = "Good Confidence";
  else if (confidenceScore >= 40) signal = "Moderate Confidence";
  else if (confidenceScore >= 20) signal = "Low Confidence";

  let insight = "More pricing evidence is needed before this record has a reliable estimated value.";

  if (estimatedValue !== null && purchasePrice !== null && estimatedValue > purchasePrice) {
    insight = `This item appears to be above your purchase price by about $${roundMoney(
      estimatedValue - purchasePrice,
    ).toFixed(2)}.`;
  }

  if (estimatedValue !== null && purchasePrice !== null && estimatedValue < purchasePrice) {
    insight = `This item is currently estimated below your purchase price by about $${roundMoney(
      purchasePrice - estimatedValue,
    ).toFixed(2)}.`;
  }

  if (discogsValue !== null && ebayValue !== null) {
    insight =
      "This estimate is stronger because it uses more than one market source instead of relying on a single price signal.";
  }

  return {
    estimatedValue,
    confidenceScore,
    signal,
    badges,
    insight,
    sourceSummary: {
      discogs: discogsValue,
      ebay: ebayValue,
      manual: manualComp,
      conditionMultiplier,
      purchasePrice,
    },
  };
}
