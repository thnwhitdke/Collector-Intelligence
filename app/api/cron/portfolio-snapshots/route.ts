import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { recomputePortfolioIntelligenceSnapshot } from "@/app/actions/portfolio-intelligence";

export async function GET() {
  const supabase = createAdminClient();

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id");

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  const results = [];

  for (const user of users ?? []) {
    const result =
      await recomputePortfolioIntelligenceSnapshot(
        user.id,
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
