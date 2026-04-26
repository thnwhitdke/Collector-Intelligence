export type ValueConfidenceLabel = "High" | "Medium" | "Low" | "Unknown";

export type ValueConfidenceInput = {
  estimated_value?: number | null;
  current_value?: number | null;
  purchase_price?: number | null;

  discogs_low_price?: number | null;
  discogs_median_price?: number | null;
  discogs_high_price?: number | null;

  ebay_last_sold_price?: number | null;
  ebay_sold_comp_count?: number | null;
  ebay_low_sold_price?: number | null;
  ebay_median_sold_price?: number | null;
  ebay_high_sold_price?: number | null;
};

export type ValueConfidenceResult = {
  score: number;
  label: ValueConfidenceLabel;
  reasons: string[];
  primaryValue: number | null;
  sourceSummary: string;
};

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function percentDifference(a: number, b: number): number {
  const midpoint = (Math.abs(a) + Math.abs(b)) / 2;

  if (midpoint === 0) {
    return 0;
  }

  return Math.abs(a - b) / midpoint;
}

export function calculateValueConfidence(
  input: ValueConfidenceInput,
): ValueConfidenceResult {
  let score = 0;
  const reasons: string[] = [];

  const hasEstimatedValue = isPositiveNumber(input.estimated_value);
  const hasCurrentValue = isPositiveNumber(input.current_value);
  const hasPurchasePrice = isPositiveNumber(input.purchase_price);

  const hasDiscogsMedian = isPositiveNumber(input.discogs_median_price);
  const hasDiscogsRange =
    isPositiveNumber(input.discogs_low_price) &&
    isPositiveNumber(input.discogs_high_price);

  const hasEbayMedian = isPositiveNumber(input.ebay_median_sold_price);
  const hasEbayLastSold = isPositiveNumber(input.ebay_last_sold_price);
  const ebayCompCount = input.ebay_sold_comp_count ?? 0;

  const primaryValue =
    input.estimated_value ??
    input.current_value ??
    input.discogs_median_price ??
    input.ebay_median_sold_price ??
    input.ebay_last_sold_price ??
    null;

  if (hasEstimatedValue || hasCurrentValue) {
    score += 15;
    reasons.push("Record has an app-level estimated/current value.");
  }

  if (hasDiscogsMedian) {
    score += 25;
    reasons.push("Discogs median value is available.");
  }

  if (hasDiscogsRange) {
    score += 10;
    reasons.push("Discogs low/high range is available.");
  }

  if (hasEbayMedian) {
    score += 25;
    reasons.push("eBay sold median value is available.");
  }

  if (hasEbayLastSold) {
    score += 10;
    reasons.push("Recent eBay last-sold value is available.");
  }

  if (ebayCompCount >= 10) {
    score += 15;
    reasons.push("Strong eBay sold-comp sample size.");
  } else if (ebayCompCount >= 5) {
    score += 10;
    reasons.push("Moderate eBay sold-comp sample size.");
  } else if (ebayCompCount >= 1) {
    score += 5;
    reasons.push("Limited eBay sold-comp sample size.");
  }

  if (hasDiscogsMedian && hasEbayMedian) {
    const diff = percentDifference(
      input.discogs_median_price as number,
      input.ebay_median_sold_price as number,
    );

    if (diff <= 0.15) {
      score += 15;
      reasons.push("Discogs and eBay values are closely aligned.");
    } else if (diff <= 0.3) {
      score += 8;
      reasons.push("Discogs and eBay values are reasonably aligned.");
    } else {
      score -= 10;
      reasons.push("Discogs and eBay values differ significantly.");
    }
  }

  if (hasPurchasePrice && primaryValue && primaryValue > 0) {
    reasons.push("Purchase price is available for value comparison.");
  }

  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  let label: ValueConfidenceLabel = "Unknown";

  if (normalizedScore >= 75) {
    label = "High";
  } else if (normalizedScore >= 45) {
    label = "Medium";
  } else if (normalizedScore >= 15) {
    label = "Low";
  }

  const sourceSummary = buildSourceSummary({
    hasDiscogsMedian,
    hasEbayMedian,
    hasEbayLastSold,
    ebayCompCount,
    hasEstimatedValue,
    hasCurrentValue,
  });

  return {
    score: normalizedScore,
    label,
    reasons,
    primaryValue,
    sourceSummary,
  };
}

function buildSourceSummary(args: {
  hasDiscogsMedian: boolean;
  hasEbayMedian: boolean;
  hasEbayLastSold: boolean;
  ebayCompCount: number;
  hasEstimatedValue: boolean;
  hasCurrentValue: boolean;
}): string {
  const sources: string[] = [];

  if (args.hasDiscogsMedian) {
    sources.push("Discogs");
  }

  if (args.hasEbayMedian || args.hasEbayLastSold) {
    sources.push(
      args.ebayCompCount > 0
        ? `eBay sold comps (${args.ebayCompCount})`
        : "eBay sold comps",
    );
  }

  if (args.hasEstimatedValue || args.hasCurrentValue) {
    sources.push("app estimate");
  }

  if (sources.length === 0) {
    return "No market value sources yet";
  }

  return sources.join(" + ");
}