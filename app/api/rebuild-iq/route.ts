import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function GET() {

  try {

    console.log(
      "========== IQ REBUILD START =========="
    );

    const {
      data: records,
      error,
    } = await supabase

      .from("records_clean_safe")

      .select(`
        id,
        discogs_median_price,
        valuation_confidence,
        discogs_release_id,
        artist,
        title
      `)

      .limit(5000);

    if (error) {

      console.error(
        "FETCH ERROR:",
        error
      );

      return NextResponse.json({
        error: error.message,
      });
    }

    console.log(
      "RECORDS FOUND:",
      records?.length || 0
    );

    let updated = 0;

    for (const record of records || []) {

      try {

        let collectorIQ = 50;

        const median =
          Number(
            record.discogs_median_price || 0
          );

        const confidence =
          record.valuation_confidence;

        // =====================
        // CONFIDENCE
        // =====================

        if (
          confidence === "HIGH"
        ) {

          collectorIQ += 20;
        }

        if (
          confidence === "MEDIUM"
        ) {

          collectorIQ += 10;
        }

        if (
          confidence === "REVIEW"
        ) {

          collectorIQ -= 10;
        }

        // =====================
        // VALUE BONUS
        // =====================

        if (median > 25) {

          collectorIQ += 5;
        }

        if (median > 50) {

          collectorIQ += 10;
        }

        if (median > 150) {

          collectorIQ += 15;
        }

        // =====================
        // MATCH BONUS
        // =====================

        if (
          record.discogs_release_id
        ) {

          collectorIQ += 5;
        }

        // =====================
        // NORMALIZE
        // =====================

        if (collectorIQ > 100) {

          collectorIQ = 100;
        }

        if (collectorIQ < 0) {

          collectorIQ = 0;
        }

        console.log(
          "IQ:",
          collectorIQ,
          "-",
          record.artist,
          "-",
          record.title
        );

        const {
          error: updateError,
        } = await supabase

          .from("records_clean_safe")

          .update({
            collector_iq_score:
              collectorIQ,
          })

          .eq(
            "id",
            record.id
          );

        if (updateError) {

          console.error(
            "UPDATE ERROR:",
            updateError
          );

          continue;
        }

        updated++;

      } catch (recordError) {

        console.error(
          "RECORD ERROR:",
          recordError
        );
      }
    }

    console.log(
      "========== IQ REBUILD COMPLETE =========="
    );

    return NextResponse.json({

      success: true,

      updated,

      total:
        records?.length || 0,
    });

  } catch (err) {

    console.error(
      "IQ REBUILD CRASH:",
      err
    );

    return NextResponse.json({
      error:
        "Failed to rebuild IQ",
    });
  }
}