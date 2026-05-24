// ======================================================
// Collector Intelligence
// Premium Valuation Service
// Single Source of Truth for Valuation Logic
// ======================================================

export type ValueInputs = {
  discogsMedian?: number | null
  ebayMedian?: number | null
  manualComp?: number | null
}

export type ValueResult = {
  estimatedValue: number | null
  confidenceScore: number
  confidenceLabel: string
  sourceUsed: string
}

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function calculateEstimatedValue(
  inputs: ValueInputs
): ValueResult {
  const sources: number[] = []
  const used: string[] = []

  if (inputs.discogsMedian && inputs.discogsMedian > 0) {
    sources.push(inputs.discogsMedian)
    used.push('discogs')
  }

  if (inputs.ebayMedian && inputs.ebayMedian > 0) {
    sources.push(inputs.ebayMedian)
    used.push('ebay')
  }

  if (inputs.manualComp && inputs.manualComp > 0) {
    sources.push(inputs.manualComp)
    used.push('manual')
  }

  if (sources.length === 0) {
    return {
      estimatedValue: null,
      confidenceScore: 0,
      confidenceLabel: 'No Value',
      sourceUsed: 'none'
    }
  }

  const estimatedValue = Number(
    average(sources).toFixed(2)
  )

  let confidenceScore = 50

  if (sources.length === 2) {
    confidenceScore = 75
  }

  if (sources.length >= 3) {
    confidenceScore = 95
  }

  let confidenceLabel = 'Moderate'

  if (confidenceScore >= 90) {
    confidenceLabel = 'High'
  } else if (confidenceScore < 60) {
    confidenceLabel = 'Low'
  }

  return {
    estimatedValue,
    confidenceScore,
    confidenceLabel,
    sourceUsed: used.join(', ')
  }
}