// ======================================================
// Collector Intelligence
// Premium Automation Service
// Background Jobs + Job Diagnostics
// ======================================================

export type JobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'

export type BackgroundJob = {
  jobType: string
  status: JobStatus
  processedCount?: number
  errorCount?: number
  metadata?: Record<string, unknown>
}

export function createJobPayload(
  jobType: string,
  metadata: Record<string, unknown> = {}
): BackgroundJob {
  return {
    jobType,
    status: 'queued',
    processedCount: 0,
    errorCount: 0,
    metadata
  }
}

export function markJobRunning(
  job: BackgroundJob
): BackgroundJob {
  return {
    ...job,
    status: 'running'
  }
}

export function markJobCompleted(
  job: BackgroundJob,
  processedCount: number
): BackgroundJob {
  return {
    ...job,
    status: 'completed',
    processedCount
  }
}

export function markJobFailed(
  job: BackgroundJob,
  errorCount: number
): BackgroundJob {
  return {
    ...job,
    status: 'failed',
    errorCount
  }
}