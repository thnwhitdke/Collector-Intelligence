// ======================================================
// Collector Intelligence
// Portfolio Trend Service
// Collection-Level Intelligence
// ======================================================

import { createClient }
from '@/src/lib/supabase/server'

export type PortfolioTrend = {
  firstValue: number
  latestValue: number
  delta: number
  percentChange: number
  direction: 'up' | 'down' | 'flat'
}

export async function getPortfolioTrend():
Promise<PortfolioTrend | null> {

  const supabase =
    await createClient()

  const {
    data,
    error
  } = await supabase
    .from('value_history')
    .select(`
      estimated_value,
      snapshot_date
    `)
    .order('snapshot_date', {
      ascending: true
    })

  if (error) {
    throw error
  }

  if (
    !data ||
    data.length < 2
  ) {
    return null
  }

  // Group by snapshot day
  const grouped =
    new Map<string, number>()

  for (const row of data) {

    const date =
      row.snapshot_date
        ?.split('T')[0]

    const value =
      Number(
        row.estimated_value || 0
      )

    grouped.set(
      date,
      (
        grouped.get(date) || 0
      ) + value
    )

  }

  const totals =
    Array.from(
      grouped.values()
    )

  const first =
    totals[0]

  const latest =
    totals[
      totals.length - 1
    ]

  const delta =
    Number(
      (
        latest - first
      ).toFixed(2)
    )

  const percentChange =
    first > 0
      ? Number(
          (
            (
              delta /
              first
            ) * 100
          ).toFixed(2)
        )
      : 0

  let direction:
    | 'up'
    | 'down'
    | 'flat'
    = 'flat'

  if (delta > 0) {
    direction = 'up'
  } else if (
    delta < 0
  ) {
    direction = 'down'
  }

  return {
    firstValue: first,
    latestValue: latest,
    delta,
    percentChange,
    direction
  }
}