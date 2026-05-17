"use server";

import { createClient } from "@/src/lib/supabase/server";

type ActivityLogInput = {
  recordId?: number;
  queueJobId?: number;
  eventType: string;
  status: string;
  source?: string;
  durationMs?: number;
  retryCount?: number;
  confidenceScore?: number;
  errorMessage?: string;
  metadata?: any;
};

export async function logEnrichmentActivity(
  input: ActivityLogInput
) {

  try {

    const supabase =
      await createClient();

    await supabase
      .from("enrichment_activity_log")
      .insert({

        record_id:
          input.recordId,

        queue_job_id:
          input.queueJobId,

        event_type:
          input.eventType,

        status:
          input.status,

        source:
          input.source || "system",

        duration_ms:
          input.durationMs,

        retry_count:
          input.retryCount || 0,

        confidence_score:
          input.confidenceScore,

        error_message:
          input.errorMessage,

        metadata:
          input.metadata || {},
      });

  } catch (err) {

    console.error(
      "Activity log failure:",
      err
    );

  }

}