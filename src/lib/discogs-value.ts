// src/lib/discogs-value.ts

export type DiscogsValuePullResult = {
  releaseId: string;
  lowPrice: number | null;
  medianPrice: number | null;
  highPrice: number | null;
  estimatedValue: number | null;
  source: "discogs";
  pulledAt: string;
  raw: {
    stats: unknown;
    suggestions: unknown;
  };
};

type DiscogsMoney = {
  value?: number;
  currency?: string;
};

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Number(((sorted[middle - 1] + sorted[middle]) / 2).toFixed(2));
  }

  return sorted[middle];
}

async function discogsFetch<T>(path: string): Promise<T> {
  const token = process.env.DISCOGS_TOKEN;
  const userAgent =
    process.env.DISCOGS_USER_AGENT || "CollectorIntelligence/1.0";

  if (!token) {
    throw new Error("Missing DISCOGS_TOKEN in .env.local");
  }

  const response = await fetch(`https://api.discogs.com${path}`, {
    headers: {
      Authorization: `Discogs token=${token}`,
      "User-Agent": userAgent,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Discogs request failed (${response.status}): ${text || response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

export async function pullDiscogsValueData(
  releaseId: string,
): Promise<DiscogsValuePullResult> {
  const cleanReleaseId = releaseId.trim();

  if (!cleanReleaseId) {
    throw new Error("Missing Discogs release ID.");
  }

  const [stats, suggestions] = await Promise.all([
    discogsFetch<Record<string, unknown>>(
      `/marketplace/stats/${cleanReleaseId}`,
    ),
    discogsFetch<Record<string, DiscogsMoney>>(
      `/marketplace/price_suggestions/${cleanReleaseId}`,
    ),
  ]);

  const suggestionValues = Object.values(suggestions)
    .map((item) => getNumber(item?.value))
    .filter((value): value is number => value !== null);

  const statsLowest = getNumber(stats.lowest_price);

  const lowPrice =
    suggestionValues.length > 0 ? Math.min(...suggestionValues) : statsLowest;

  const highPrice =
    suggestionValues.length > 0 ? Math.max(...suggestionValues) : null;

  const medianPrice = median(suggestionValues);

  const estimatedValue = medianPrice ?? statsLowest ?? lowPrice ?? null;

  return {
    releaseId: cleanReleaseId,
    lowPrice: lowPrice !== null ? Number(lowPrice.toFixed(2)) : null,
    medianPrice,
    highPrice: highPrice !== null ? Number(highPrice.toFixed(2)) : null,
    estimatedValue:
      estimatedValue !== null ? Number(estimatedValue.toFixed(2)) : null,
    source: "discogs",
    pulledAt: new Date().toISOString(),
    raw: {
      stats,
      suggestions,
    },
  };
}