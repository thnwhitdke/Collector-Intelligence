import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { recomputePortfolioIntelligenceSnapshot } from "@/app/actions/portfolio-intelligence";

export async function GET() {
  const supabase = createAdminClient();

  const { data: recordOwners, error } = await supabase
    .from("records_clean_safe")
    .select("user_id")
    .not("user_id", "is", null);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  const userIds = Array.from(
    new Set(
      (recordOwners ?? [])
        .map((row) => row.user_id)
        .filter(Boolean)
    )
  );

  const results = [];

  for (const userId of userIds) {
    const result =
      await recomputePortfolioIntelligenceSnapshot(
        userId,
        "scheduled_cron_recompute"
      );

    results.push(result);
  }

  return NextResponse.json({
    ok: true,
    usersProcessed: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}
