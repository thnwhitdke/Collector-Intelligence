// ======================================================
// Collector Intelligence
// Queue Processor
// Background Job Tracking
// ======================================================

import {
  getQueuedJobs
} from './liveQueueProcessor'

import {
  markJobRunning,
  markJobCompleted,
  markJobFailed
} from './queueStateService'

import {
  createBackgroundJob,
  completeBackgroundJob
} from './backgroundJobService'

import {
  snapshotValueHistory
} from '@/app/services/valuation/valueHistoryService'

import {
  enrichSingleRecord
} from '@/app/actions/discogs'

export type QueueProcessResult = {
  processed: number
  failed: number
  success: boolean
}

export async function processQueueBatch(
  batchSize = 25
): Promise<QueueProcessResult> {

  let processed = 0
  let failed = 0

  const batchJob =
    await createBackgroundJob(
      'enrichment_batch'
    )

  try {

    console.log(
      `[Queue] Pulling jobs batch=${batchSize}`
    )

    const jobs =
      await getQueuedJobs(batchSize)

    console.log(
      `[Queue] Found ${jobs.length} jobs`
    )

    for (const job of jobs) {

      try {

        await markJobRunning(job.id)

        console.log(
          `[Queue] Enriching record ${job.record_id}`
        )

        await enrichSingleRecord(
          String(job.record_id)
        )

        await snapshotValueHistory(
            job.record_id
        )

        await markJobCompleted(
          job.id
        )

        processed++

      } catch (err) {

        console.error(err)

        await markJobFailed(
          job.id,
          err instanceof Error
            ? err.message
            : 'Processing failure'
        )

        failed++
      }

    }

    await completeBackgroundJob(
      batchJob.id,
      processed,
      failed
    )

    return {
      processed,
      failed,
      success: true
    }

  } catch (error) {

    console.error(error)

    await completeBackgroundJob(
      batchJob.id,
      processed,
      failed + 1
    )

    return {
      processed,
      failed,
      success: false
    }

  }
}