"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";
import { pullSingleDiscogsCore } from "./pull-single-discogs";

export async function recomputeIntelligence(
  limit = 25
) {
  const supabase =
    createAdminClient();

  const {
    data: records,
    error,
  } = await supabase
    .from("records_clean_safe")
    .select(`
      id,
      artist,
      title,
      discogs_release_id
    `)
    .not(
      "discogs_release_id",
      "is",
      null
    )
    .order(
      "id",
      {
        ascending: true,
      }
    )
    .limit(limit);

  if (error) {
    return {
      ok: false,
      error:
        error.message,
    };
  }

  let processed = 0;
  let updated = 0;
  const results = [];

  for (
    const record of
    records || []
  ) {
    processed++;

    try {

      console.log(
        `RECOMPUTE ${record.id} ${record.artist} - ${record.title}`
      );

      const formData =
        new FormData();

      formData.set(
        "id",
        String(
          record.id
        )
      );

      formData.set(
        "returnTo",
        "/collection"
      );

      const result =
        await pullSingleDiscogsCore(
          formData
        );

      updated++;

      results.push({
        id:
          record.id,
        ok: true,
        result,
      });

    } catch (
      err: any
    ) {

      results.push({
        id:
          record.id,
        ok: false,
        error:
          err?.message ||
          "Unknown error",
      });
    }
  }

  return {
    ok: true,
    processed,
    updated,
    results,
  };
}
