import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { recomputePortfolioIntelligenceSnapshot } from "@/app/actions/portfolio-intelligence";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const result = await recomputePortfolioIntelligenceSnapshot(
    user.id,
    "manual_api_recompute"
  );

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
  });
}
