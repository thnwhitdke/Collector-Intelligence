// ======================================================
// Collector Intelligence
// Enqueue Service
// Standardized Queue Insertion
// ======================================================

import { createClient } from
  '@/src/lib/supabase/server'

export async function enqueueRecordEnrichment(
  recordId: number,
  priority = 1
) {

  const supabase =
    await createClient()

  // Prevent duplicate queued jobs
  const { data: existing } =
    await supabase
      .from('enrichment_queue')
      .select('id')
      .eq('record_id', recordId)
      .eq('status', 'queued')
      .limit(1)

  if (existing && existing.length > 0) {

    return {
      success: true,
      skipped: true,
      message: 'Job already queued'
    }

  }

  const { error } =
    await supabase
      .from('enrichment_queue')
      .insert({
        record_id: recordId,
        job_type: 'metadata_enrichment',
        status: 'queued',
        priority
      })

  if (error) {
    throw error
  }

  return {
    success: true,
    skipped: false
  }
}