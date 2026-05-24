// ======================================================
// Collector Intelligence
// Premium Analytics Service
// Collector IQ + Signal Engine Foundation
// ======================================================

export type CollectorIQInputs = {
  valueConfidence?: number | null
  numWant?: number | null
  numHave?: number | null
  forSale?: number | null
}

export type CollectorIQResult = {
  score: number
  signal: string
}

export function calculateCollectorIQ(
  inputs: CollectorIQInputs
): CollectorIQResult {
  let score = 50

  if (
    inputs.valueConfidence &&
    inputs.valueConfidence > 80
  ) {
    score += 15
  }

  if (
    inputs.numWant &&
    inputs.numHave &&
    inputs.numWant > inputs.numHave
  ) {
    score += 20
  }

  if (
    inputs.forSale !== null &&
    inputs.forSale !== undefined &&
    inputs.forSale < 5
  ) {
    score += 15
  }

  if (score > 100) {
    score = 100
  }

  let signal = 'Moderate'

  if (score >= 85) {
    signal = 'Strong'
  } else if (score < 60) {
    signal = 'Weak'
  }

  return {
    score,
    signal
  }
}