"use server";

import { createClient } from "@supabase/supabase-js";

const supabase =
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function enrichDiscogsMetadata() {

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

  for (const record of records) {

    if (
      !record.discogs_release_id
    ) {
      continue;
    }

    try {

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
          }
        );

      if (!response.ok) {
        continue;
      }

      const release =
        await response.json();

      const genres =
        release.genres?.join(", ") ||
        "Unknown";

      const styles =
        release.styles?.join(", ") ||
        "Unknown";

      await supabase
        .from("records_clean_safe")
        .update({
          genre: genres,
          style: styles,
        })
        .eq("id", record.id);

      console.log(
        `Updated ${record.id}`
      );

    } catch (err) {

      console.error(
        "Discogs enrich error:",
        err
      );

    }

  }

}