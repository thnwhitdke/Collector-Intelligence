// ======================================================
// Collector Intelligence
// Background Job Service
// Cron Diagnostics + Job Tracking
// ======================================================

import {
  createAdminClient
} from '@/src/lib/supabase/admin'

export async function createBackgroundJob(
  jobType: string
) {

  const supabase =
    createAdminClient()

  const { data, error } =
    await supabase
      .from('background_jobs')
      .insert({
        job_type: jobType,
        status: 'running',
        started_at:
          new Date().toISOString()
      })
      .select()
      .single()

  if (error) {
    throw error
  }

  return data
}

export async function completeBackgroundJob(
  jobId: number,
  processed: number,
  failed: number
) {

  const supabase =
    createAdminClient()

  const { error } =
    await supabase
      .from('background_jobs')
      .update({
        status:
          failed > 0
            ? 'failed'
            : 'completed',
        processed_count:
          processed,
        error_count:
          failed,
        completed_at:
          new Date().toISOString()
      })
      .eq('id', jobId)

  if (error) {
    throw error
  }
}
