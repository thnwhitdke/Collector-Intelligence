import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function POST(
  req: NextRequest
) {
  try {
    const body =
      await req.json();

    const {
      recordId,
      forSale,
      lowestPrice,
      marketNote,
    } = body;

    if (!recordId) {
      return NextResponse.json(
        {
          error:
            "Missing recordId",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      await createClient();

    let marketSignal =
      "Exact Market Verified";

    let marketSignalReason =
      marketNote ||
      "Exact marketplace verification completed.";

    if (
      forSale === 0
    ) {
      marketSignal =
        "No Active Exact Market";

      marketSignalReason =
        "No active marketplace listings exist for this exact pressing.";
    }

    const {
      error,
    } = await supabase
      .from(
        "records_clean_safe"
      )
      .update({
        discogs_for_sale:
          forSale,

        estimated_value:
          lowestPrice,

        market_signal:
          marketSignal,

        market_signal_reason:
          marketSignalReason,

        value_source:
          "PSMI Exact Market",

        value_last_updated:
          new Date().toISOString(),
      })
      .eq("id", recordId);

    if (error) {
      console.error(
        "PSMI UPDATE ERROR",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "PSMI UPDATE SUCCESS",
      {
        recordId,
        forSale,
        lowestPrice,
      }
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "PSMI ROUTE ERROR",
      error
    );

    return NextResponse.json(
      {
        error:
          "PSMI update failed",
      },
      {
        status: 500,
      }
    );
  }
}