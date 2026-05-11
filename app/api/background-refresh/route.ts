import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function GET() {
  try {
    console.log("===== BACKGROUND REFRESH START =====");

    const now = new Date().toISOString();

    const { data: staleRecords, error } = await supabase
      .from("records_clean_safe")
      .select(`
        id,
        title,
        artist,
        market_signal,
        next_refresh_due_at
      `)
      .lte("next_refresh_due_at", now)
      .limit(5);

    if (error) {
      console.error("STALE FETCH ERROR:", error);

      return NextResponse.json({
        error: error.message,
      });
    }

    console.log(
      "STALE RECORDS FOUND:",
      staleRecords?.length || 0
    );

    const refreshed: string[] = [];

    for (const record of staleRecords || []) {
      try {
        console.log(
          "REFRESHING:",
          record.artist,
          "-",
          record.title
        );

        const refreshUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/rebuild-iq?id=${record.id}`;

        const refreshRes = await fetch(refreshUrl, {
          method: "GET",
          cache: "no-store",
        });

        if (!refreshRes.ok) {
          console.error(
            "REFRESH FAILED:",
            record.id
          );

          continue;
        }

        refreshed.push(record.id);

      } catch (refreshError) {
        console.error(
          "REFRESH ERROR:",
          refreshError
        );
      }
    }

    console.log("===== BACKGROUND REFRESH COMPLETE =====");

    return NextResponse.json({
      success: true,
      staleFound: staleRecords?.length || 0,
      refreshedCount: refreshed.length,
      refreshed,
    });

  } catch (err) {
    console.error(
      "BACKGROUND REFRESH CRASH:",
      err
    );

    return NextResponse.json({
      error: "Background refresh failed",
    });
  }
}