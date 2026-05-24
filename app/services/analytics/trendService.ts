// ======================================================
// Collector Intelligence
// Trend Service
// Historical Intelligence Layer
// ======================================================

import { createClient }
from '@/src/lib/supabase/server'

export type TrendResult = {
  recordId: number
  firstValue: number | null
  latestValue: number | null
  delta: number | null
  percentChange: number | null
  direction: 'up' | 'down' | 'flat'
}

export async function getRecordTrend(
  recordId: number
): Promise<TrendResult | null> {

  const supabase =
    await createClient()

  const { data, error }
    = await supabase
      .from('value_history')
      .select(`
        estimated_value,
        snapshot_date
      `)
      .eq('record_id', recordId)
      .order('snapshot_date', {
        ascending: true
      })

  if (error) {
    throw error
  }

  if (!data || data.length < 2) {
    return null
  }

  const first =
    Number(data[0].estimated_value || 0)

  const latest =
    Number(
      data[data.length - 1]
        .estimated_value || 0
    )

  const delta =
    Number((latest - first).toFixed(2))

  const percentChange =
    first > 0
      ? Number(
          (
            (delta / first) *
            100
          ).toFixed(2)
        )
      : null

  let direction:
    | 'up'
    | 'down'
    | 'flat' = 'flat'

  if (delta > 0) {
    direction = 'up'
  } else if (delta < 0) {
    direction = 'down'
  }

  return {
    recordId,
    firstValue: first,
    latestValue: latest,
    delta,
    percentChange,
    direction
  }
}