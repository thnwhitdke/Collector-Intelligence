// ======================================================
// Collector Intelligence
// Live Queue Processor
// Supabase Queue Pull Layer
// ======================================================

import {
  createAdminClient
} from '@/src/lib/supabase/admin'

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
    createAdminClient()

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
      .eq('status', 'pending')
      .order('priority', {
        ascending: false
      })
      .limit(batchSize)

  if (error) {
    throw error
  }

  return data || []
}
