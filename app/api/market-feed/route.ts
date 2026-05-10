import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function GET() {

  try {

    console.log(
      "========== MARKET FEED START =========="
    );

    const { data, error } =
      await supabase
        .from("market_changes")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(50);

    if (error) {

      console.error(
        "MARKET FEED ERROR:",
        error
      );

      return NextResponse.json({
        error: error.message,
      });
    }

    console.log(
      "MARKET FEED ROWS:",
      data?.length || 0
    );

    console.log(
      "MARKET FEED SAMPLE:",
      data?.[0]
    );

    return NextResponse.json(
      data || []
    );

  } catch (err) {

    console.error(
      "MARKET FEED CRASH:",
      err
    );

    return NextResponse.json({
      error:
        "Failed to load market feed",
    });
  }
}