"use server";

import { createClient } from "../../src/lib/supabase/server";

import {
  enrichSingleRecord,
} from "./discogs";

// =========================
// BULK ENRICHMENT ENGINE
// =========================

export async function enrichDiscogsMetadata() {

  console.log(
    "BULK ENRICHMENT STARTED"
  );

  const supabase =
    await createClient();

  // =========================
  // GET RECORDS NEEDING ENRICHMENT
  // =========================

  const {
    data: records,
    error,
  } = await supabase
    .from("records_clean_safe")
    .select(`
      id,
      genre,
      style,
      discogs_image_url,
      discogs_release_id
    `)
    .or(
      [
        "genre.is.null",
        "genre.eq.Unknown",
        "style.is.null",
        "style.eq.Unknown",
        "discogs_image_url.is.null",
        "discogs_release_id.is.null"
      ].join(",")
    )
    .limit(25);

  if (error || !records) {

    console.error(
      "FAILED TO LOAD RECORDS:",
      error
    );

    return {
      success: false,
      processed: 0,
    };

  }

  console.log(
    "RECORDS FOUND:",
    records.length
  );

  let successCount = 0;
  let failureCount = 0;

  // =========================
  // PROCESS RECORDS
  // =========================

  for (const record of records) {

    try {

      console.log(
        "PROCESSING RECORD:",
        record.id
      );

      await enrichSingleRecord(
        record.id
      );

      successCount++;

    } catch (error) {

      failureCount++;

      console.error(
        "RECORD ENRICH FAILED:",
        record.id,
        error
      );

    }

  }

  console.log(
    "BULK ENRICHMENT COMPLETE"
  );

  return {
    success: true,

    processed:
      records.length,

    successCount,

    failureCount,
  };

}

// =========================
// QUEUE POPULATION
// =========================

export async function queueMissingMetadataRecords(
  limit = 25
) {

  const supabase =
    await createClient();

  // =========================
  // FIND INCOMPLETE RECORDS
  // =========================

  const {
    data: records,
    error,
  } = await supabase
    .from("records_clean_safe")
    .select(`
      id,
      discogs_release_id,
      discogs_image_url,
      genre,
      label,
      year
    `)
    .or(
      [
        "discogs_release_id.is.null",
        "discogs_image_url.is.null",
        "genre.is.null",
        "label.is.null",
        "year.is.null"
      ].join(",")
    )
    .limit(limit);

  if (error) {

    console.error(error);

    return {
      queued: 0,
      skipped: 0,
      errors: 1,
      message: error.message,
    };

  }

  if (!records?.length) {

    return {
      queued: 0,
      skipped: 0,
      errors: 0,
      message:
        "No incomplete records found",
    };

  }

  let queued = 0;
  let skipped = 0;

  // =========================
  // PROCESS RECORDS
  // =========================

  for (const record of records) {

    // =========================
    // CHECK EXISTING JOB
    // =========================

    const {
      data: existingJob,
    } = await supabase
      .from("enrichment_queue")
      .select("id")
      .eq(
        "record_id",
        record.id
      )
      .in("status", [
        "pending",
        "processing",
      ])
      .maybeSingle();

    if (existingJob) {

      skipped++;
      continue;

    }

    // =========================
    // INSERT QUEUE JOB
    // =========================

    const {
      error: insertError,
    } = await supabase
      .from("enrichment_queue")
      .insert({
        record_id: record.id,

        status: "pending",

        created_at:
          new Date().toISOString(),
      });

    if (insertError) {

      console.error(
        insertError
      );

      continue;

    }

    queued++;

  }

  // =========================
  // RETURN SUMMARY
  // =========================

  return {
    queued,
    skipped,
    errors: 0,

    message:
      "Queue population complete",
  };

}