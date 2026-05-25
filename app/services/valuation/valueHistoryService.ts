// ======================================================
// Collector Intelligence
// Value History Service
// Market Memory Engine
// ======================================================

import {
  createAdminClient
}
from '@/src/lib/supabase/admin'

export async function snapshotValueHistory(
  recordId: number
) {

  const supabase =
    createAdminClient()

  const { data: record, error }
    = await supabase
      .from('records_clean_safe')
      .select(`
        estimated_value,
        discogs_low_price,
        discogs_median_price,
        discogs_high_price,
        discogs_num_for_sale,
        value_source
      `)
      .eq('id', recordId)
      .single()

  if (error) {
    throw error
  }

  const { error: insertError }
    = await supabase
      .from('value_history')
      .insert({
        record_id: recordId,
        estimated_value:
          record?.estimated_value
            ? Number(record.estimated_value)
            : null,
        discogs_low:
          record?.discogs_low_price,
        discogs_median:
          record?.discogs_median_price,
        discogs_high:
          record?.discogs_high_price,
        market_num_for_sale:
          record?.discogs_num_for_sale,
        value_source:
          record?.value_source
      })

  if (insertError) {
    throw insertError
  }
}
