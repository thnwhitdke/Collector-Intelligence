// ======================================================
// Collector Intelligence
// Top Movers Service
// Batch Historical Intelligence Engine
// ======================================================

import { createClient }
from '@/src/lib/supabase/server'

export type TopMover = {
  recordId: number
  artist?: string | null
  title?: string | null
  percentChange: number
  delta: number
  direction: string
}

export async function getTopMovers(
  limit = 10
): Promise<TopMover[]> {

  const supabase =
    await createClient()

  // Pull records
  const {
    data: records,
    error: recordError
  } = await supabase
    .from('records_clean_safe')
    .select(`
      id,
      artist,
      title
    `)

  if (recordError) {
    throw recordError
  }

  // Pull ALL history once
  const {
    data: history,
    error: historyError
  } = await supabase
    .from('value_history')
    .select(`
      record_id,
      estimated_value,
      snapshot_date
    `)
    .order('snapshot_date', {
      ascending: true
    })

  if (historyError) {
    throw historyError
  }

  // Group history
  const grouped =
    new Map<number, any[]>()

  for (const row of history || []) {

    if (
      !grouped.has(
        row.record_id
      )
    ) {
      grouped.set(
        row.record_id,
        []
      )
    }

    grouped
      .get(row.record_id)!
      .push(row)
  }

  const movers: TopMover[] = []

  for (
    const record
    of records || []
  ) {

    const snapshots =
      grouped.get(record.id)

    if (
      !snapshots ||
      snapshots.length < 2
    ) {
      continue
    }

    const first =
      Number(
        snapshots[0]
          .estimated_value || 0
      )

    const latest =
      Number(
        snapshots[
          snapshots.length - 1
        ].estimated_value || 0
      )

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
                delta / first
              ) * 100
            ).toFixed(2)
          )
        : 0

    let direction =
      'flat'

    if (delta > 0) {
      direction = 'up'
    } else if (
      delta < 0
    ) {
      direction = 'down'
    }

    movers.push({
      recordId:
        record.id,
      artist:
        record.artist,
      title:
        record.title,
      percentChange,
      delta,
      direction
    })

  }

  return movers
    .sort(
      (a, b) =>
        b.percentChange -
        a.percentChange
    )
    .slice(0, limit)
}