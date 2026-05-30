"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";
import { enrichSingleRecord } from "./discogs";
import { logEnrichmentActivity } from "./activity-log";

const RETRY_DELAY_MINUTES = 15;

export async function processEnrichmentQueue(limit = 10) {

  const supabase = createAdminClient();

  const nowIso = new Date().toISOString();

  // =========================
  // LOAD PENDING JOBS
  // =========================

  const { data: jobs, error } =
    await supabase
      .from("enrichment_queue")
      .select("*")
      .eq("status", "pending")
      .eq("permanently_failed", false)
      .or(
        `next_retry_at.is.null,next_retry_at.lte.${nowIso}`
      )
      .order("created_at", {
        ascending: true,
      })
      .limit(limit);

  if (error) {

    console.error(error);

    return {
      processed: 0,
      failed: 0,
      remaining: 0,
      error: error.message,
    };

  }

  if (!jobs?.length) {

    return {
      processed: 0,
      failed: 0,
      remaining: 0,
      error: null,
    };

  }

  let failedCount = 0;

  // =========================
  // PROCESS JOBS
  // =========================

  for (const job of jobs) {

    try {

      // =========================
      // MARK PROCESSING
      // =========================

      await supabase
        .from("enrichment_queue")
        .update({
          status: "processing",

          started_at:
            new Date().toISOString(),

          last_attempted_at:
            new Date().toISOString(),
        })
        .eq("id", job.id);

      // =========================
      // RUN ENRICHMENT
      // =========================

      await enrichSingleRecord(
        job.record_id
      );

      // =========================
      // MARK COMPLETE
      // =========================

      await supabase
        .from("enrichment_queue")
        .update({
          status: "completed",

          completed_at:
            new Date().toISOString(),

          last_error: null,
        })
        .eq("id", job.id);

      // =========================
      // UPDATE RECORD
      // =========================

      await supabase
        .from("records_clean_safe")
        .update({
          enrichment_status:
            "completed",

          enrichment_last_run:
            new Date().toISOString(),

          self_healed: true,
        })
        .eq("id", job.record_id);

      console.log(
        `SUCCESS: ${job.record_id}`
      );

    } catch (err) {

      console.error(err);

      failedCount++;

      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unknown error";

      const retryCount =
        (job.retry_count || 0) + 1;

      const maxRetries =
        job.max_retries || 5;

      const permanentlyFailed =
        retryCount >= maxRetries;

      const retryDate = new Date();

      retryDate.setMinutes(
        retryDate.getMinutes() +
          RETRY_DELAY_MINUTES
      );

      // =========================
      // UPDATE QUEUE FAILURE
      // =========================

      await supabase
        .from("enrichment_queue")
        .update({

          status:
            permanentlyFailed
              ? "failed"
              : "pending",

          retry_count:
            retryCount,

          permanently_failed:
            permanentlyFailed,

          next_retry_at:
            permanentlyFailed
              ? null
              : retryDate.toISOString(),

          last_error:
            errorMessage,

          failure_stage:
            "discogs_enrichment",

          attempts:
            (job.attempts || 0) + 1,
        })
        .eq("id", job.id);

      // =========================
      // UPDATE RECORD FAILURE
      // =========================

      await supabase
        .from("records_clean_safe")
        .update({

          enrichment_status:
            permanentlyFailed
              ? "permanently_failed"
              : "retry_pending",

          enrichment_attempts:
            retryCount,
        })
        .eq("id", job.record_id);

      console.error(
        `FAILED: ${job.record_id}`,
        errorMessage
      );

    }

  }

  // =========================
  // RETURN SUMMARY
  // =========================

  return {

    processed: jobs.length,

    failed: failedCount,

    remaining: 0,

    error: null,
  };

}