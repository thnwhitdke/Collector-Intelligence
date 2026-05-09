import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function GET() {
  try {
    console.log("========== ENRICHMENT START ==========");

    const DISCOGS_TOKEN =
      process.env.DISCOGS_TOKEN;

    if (!DISCOGS_TOKEN) {
      return NextResponse.json({
        error: "Missing DISCOGS_TOKEN",
      });
    }

    const { data: records, error } =
      await supabase
        .from("records_clean_safe")
        .select("*")
        .limit(10);

    if (error) {
      console.error(
        "SUPABASE FETCH ERROR:",
        error
      );

      return NextResponse.json({
        error: error.message,
      });
    }

    console.log(
      "RECORDS FOUND:",
      records?.length
    );

    let enriched = 0;

    for (const record of records || []) {
      try {
        const query = encodeURIComponent(
          `${record.artist || ""} ${record.title || ""}`
        );

        console.log("SEARCHING:", query);

        const response = await fetch(
          `https://api.discogs.com/database/search?q=${query}&type=release&token=${DISCOGS_TOKEN}`,
          {
            headers: {
              "User-Agent":
                "CollectorIntelligence/1.0",
            },
          }
        );

        const data = await response.json();

        const result =
          data?.results?.[0];

        if (!result) {
          console.log(
            "NO MATCH:",
            query
          );

          continue;
        }

        console.log(
          "MATCH FOUND:",
          result.title
        );

        const updatePayload = {
          country:
            result.country ||
            record.country ||
            null,

          genre: Array.isArray(
            result.genre
          )
            ? result.genre.join(", ")
            : record.genre || null,

          cover_url:
            result.cover_image ||
            record.cover_url ||
            null,

          discogs_release_id:
            result.id || null,
        };

        console.log(
          "UPDATE PAYLOAD:",
          updatePayload
        );

        const { error: updateError } =
          await supabase
            .from("records_clean_safe")
            .update(updatePayload)
            .eq("id", record.id);

        if (updateError) {
          console.error(
            "UPDATE ERROR:",
            updateError
          );

          continue;
        }

        console.log(
          "UPDATED RECORD:",
          record.id
        );

        enriched++;

      } catch (recordError) {
        console.error(
          "RECORD FAILURE:",
          recordError
        );
      }
    }

    console.log(
      "========== ENRICHMENT COMPLETE =========="
    );

    return NextResponse.json({
      success: true,
      enriched,
      total: records?.length || 0,
      message: `Enrichment complete. Updated ${enriched} records.`,
    });

  } catch (routeError) {
    console.error(
      "ROUTE FAILURE:",
      routeError
    );

    return NextResponse.json({
      error: "Unknown route error",
    });
  }
}