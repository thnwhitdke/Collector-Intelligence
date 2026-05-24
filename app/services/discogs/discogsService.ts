// ======================================================
// Collector Intelligence
// Premium Discogs Service
// Discogs Intelligence Gateway
// ======================================================

export type DiscogsMarketData = {
  low?: number | null
  median?: number | null
  high?: number | null
  numForSale?: number | null
  numHave?: number | null
  numWant?: number | null
}

export function hasMarketData(
  data: DiscogsMarketData
): boolean {
  return Boolean(
    data.low ||
    data.median ||
    data.high
  )
}

export function calculateDemandRatio(
  data: DiscogsMarketData
): number | null {
  if (
    !data.numWant ||
    !data.numHave ||
    data.numHave === 0
  ) {
    return null
  }

  return Number(
    (
      data.numWant / data.numHave
    ).toFixed(2)
  )
}

export function isScarce(
  data: DiscogsMarketData
): boolean {
  return (
    data.numForSale !== null &&
    data.numForSale !== undefined &&
    data.numForSale < 5
  )
}