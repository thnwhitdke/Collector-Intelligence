// ======================================================
// Collector Intelligence
// Live Queue Processor
// Supabase Queue Pull Layer
// ======================================================

import { createClient } from
  '@/src/lib/supabase/server'

export type QueueItem = {
  id: string
  record_id: number
  job_type: string
  status: string
  priority: number
}

export async function getQueuedJobs(
  batchSize = 25
): Promise<QueueItem[]> {

  const supabase =
    await createClient()

  const { data, error } =
    await supabase
      .from('enrichment_queue')
      .select(`
        id,
        record_id,
        job_type,
        status,
        priority
      `)
      .eq('status', 'queued')
      .order('priority', {
        ascending: false
      })
      .limit(batchSize)

  if (error) {
    throw error
  }

  return data || []
}