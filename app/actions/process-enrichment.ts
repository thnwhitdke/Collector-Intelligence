"use server";

import { createClient } from "@/src/lib/supabase/server";
import { enrichSingleRecord } from "./discogs";

export async function processEnrichmentQueue(limit = 10) {

  const supabase = await createClient();

  // =========================
  // LOAD PENDING JOBS
  // =========================

  const { data: jobs, error } =
    await supabase
      .from("enrichment_queue")
      .select("*")
      .eq("status", "pending")
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

    } catch (err) {

      console.error(err);

      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unknown error";

      // =========================
      // MARK FAILED
      // =========================

      await supabase
        .from("enrichment_queue")
        .update({
          status: "failed",

          attempts:
            (job.attempts || 0) + 1,

          error_message:
            errorMessage,
        })
        .eq("id", job.id);

      // =========================
      // UPDATE RECORD FAILURE
      // =========================

      await supabase
        .from("records_clean_safe")
        .update({
          enrichment_status:
            "failed",

          enrichment_attempts:
            (job.attempts || 0) + 1,
        })
        .eq("id", job.record_id);

    }

  }

  // =========================
  // RETURN SUMMARY
  // =========================

return {
  processed: jobs.length,
  failed: 0,
  remaining: 0,
  error: null,
};

}