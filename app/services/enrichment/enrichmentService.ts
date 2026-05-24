// ======================================================
// Collector Intelligence
// Premium Enrichment Service
// Queue + Enrichment Diagnostics Foundation
// ======================================================

export type EnrichmentStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'

export type EnrichmentJob = {
  recordId: number
  status: EnrichmentStatus
  retryCount?: number
  errorMessage?: string | null
}

export function canRetryEnrichment(
  job: EnrichmentJob,
  maxRetries = 3
): boolean {
  return (
    (job.retryCount || 0) < maxRetries &&
    job.status !== 'completed'
  )
}

export function buildEnrichmentSummary(
  jobs: EnrichmentJob[]
) {
  const queued = jobs.filter(
    j => j.status === 'queued'
  ).length

  const running = jobs.filter(
    j => j.status === 'running'
  ).length

  const completed = jobs.filter(
    j => j.status === 'completed'
  ).length

  const failed = jobs.filter(
    j => j.status === 'failed'
  ).length

  return {
    queued,
    running,
    completed,
    failed,
    total: jobs.length
  }
}