// ======================================================
// Collector Intelligence
// Queue State Service
// Workflow State Management
// ======================================================

import { createClient }
from '@/src/lib/supabase/server'

export async function markJobRunning(
  jobId: string
) {

  const supabase =
    await createClient()

  const { error } =
    await supabase
      .from('enrichment_queue')
      .update({
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId)

  if (error) {
    throw error
  }
}

export async function markJobCompleted(
  jobId: string
) {

  const supabase =
    await createClient()

  const { error } =
    await supabase
      .from('enrichment_queue')
      .update({
        status: 'completed',
        completed_at:
          new Date().toISOString()
      })
      .eq('id', jobId)

  if (error) {
    throw error
  }
}

export async function markJobFailed(
  jobId: string,
  message: string
) {

  const supabase =
    await createClient()

  const { error } =
    await supabase
      .from('enrichment_queue')
      .update({
        status: 'failed',
        error_message: message
      })
      .eq('id', jobId)

  if (error) {
    throw error
  }
}