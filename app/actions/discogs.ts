"use server";

import { createClient } from "@/src/lib/supabase/server";

export async function enrichSingleRecord(recordId: string) {

  const supabase = await createClient();

  // =========================
  // GET RECORD
  // =========================

  const { data: record, error } =
    await supabase
      .from("records_clean_safe")
      .select("*")
      .eq("id", recordId)
      .single();

  if (error || !record) {
    throw new Error("Record not found");
  }

  // =========================
  // BUILD SEARCH QUERY
  // =========================

  const artist =
    record.artist || "";

  const title =
    record.album ||
    record.title ||
    "";

  const query =
    encodeURIComponent(
      `${artist} ${title}`
    );

  // =========================
  // DISCOGS SEARCH
  // =========================

  const response =
    await fetch(
      `https://api.discogs.com/database/search?q=${query}&type=release`,
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
    throw new Error(
      `Discogs API error: ${response.status}`
    );
  }

  const data =
    await response.json();

  if (
    !data.results ||
    data.results.length === 0
  ) {
    throw new Error(
      "No Discogs matches found"
    );
  }

  // =========================
  // BEST MATCH
  // =========================

  const match =
    data.results[0];

  // =========================
  // UPDATE RECORD
  // =========================

  const updates = {

    discogs_release_id:
      match.id || null,

    discogs_image_url:
      match.cover_image ||
      match.thumb ||
      null,

    discogs_thumbnail_url:
      match.thumb || null,

    genre:
      match.genre?.join(", ") ||
      null,

    label:
      match.label?.[0] ||
      null,

    country:
      match.country || null,

    enrichment_status:
      "completed",

    enrichment_last_run:
      new Date().toISOString(),

    self_healed: true,

    last_self_heal_reason:
      "Discogs autonomous enrichment",

  };

  const {
    error: updateError,
  } = await supabase
    .from("records_clean_safe")
    .update(updates)
    .eq("id", recordId);

  if (updateError) {
    throw new Error(
      updateError.message
    );
  }

  return {
    success: true,
    recordId,
    discogsId: match.id,
  };

}