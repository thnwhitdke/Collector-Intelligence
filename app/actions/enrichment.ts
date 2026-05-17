"use server";

import { createClient } from "../../src/lib/supabase/server";

export async function enrichDiscogsMetadata() {

  const supabase = await createClient();

  // =========================
  // GET RECORDS NEEDING ENRICHMENT
  // =========================

  const { data: records, error } =
    await supabase
      .from("records_clean_safe")
      .select(`
        id,
        discogs_release_id,
        genre,
        style
      `)
      .or(
        "genre.is.null,genre.eq.Unknown,style.is.null,style.eq.Unknown"
      )
      .limit(100);

  if (error || !records) {
    console.error(error);
    return;
  }

  // =========================
  // PROCESS RECORDS
  // =========================

  for (const record of records) {

    if (!record.discogs_release_id) {
      continue;
    }

    try {

      // =========================
      // DISCOGS REQUEST
      // =========================

      const response =
        await fetch(
          `https://api.discogs.com/releases/${record.discogs_release_id}`,
          {
            headers: {
              Authorization:
                `Discogs token ${process.env.DISCOGS_TOKEN}`,
              "User-Agent":
                "CollectorIntelligence/1.0",
            },
            cache: "no-store",
          }
        );

      if (!response.ok) {
        console.error(
          `Discogs API failed for ${record.id}`
        );
        continue;
      }

      const release =
        await response.json();

      // =========================
      // NORMALIZE DATA
      // =========================

      const genres =
        release.genres?.join(", ") ||
        "Unknown";

      const styles =
        release.styles?.join(", ") ||
        "Unknown";

      // =========================
      // UPDATE RECORD
      // =========================

      const { error: updateError } =
        await supabase
          .from("records_clean_safe")
          .update({
            genre: genres,
            style: styles,
            enrichment_status: "matched",
            enrichment_last_run:
              new Date().toISOString(),
            self_healed: true,
            last_self_heal_reason:
              "Discogs metadata enrichment",
          })
          .eq("id", record.id);

      if (updateError) {
        console.error(updateError);
        continue;
      }

      console.log(
        `Updated metadata for ${record.id}`
      );

    } catch (err) {

      console.error(
        "Discogs enrich error:",
        err
      );

    }

  }

  return {
    success: true,
    processed: records.length,
  };

}
export async function queueMissingMetadataRecords(limit = 25) {

  const supabase = await createClient();

  // =========================
  // FIND INCOMPLETE RECORDS
  // =========================

  const { data: records, error } =
    await supabase
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
      message: "No incomplete records found",
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

    const { data: existingJob } =
      await supabase
        .from("enrichment_queue")
        .select("id")
        .eq("record_id", record.id)
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

    const { error: insertError } =
      await supabase
        .from("enrichment_queue")
        .insert({
          record_id: record.id,
          status: "pending",
          created_at:
            new Date().toISOString(),
        });

    if (insertError) {

      console.error(insertError);
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