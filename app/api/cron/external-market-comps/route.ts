import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  const { data: job, error } = await supabase
    .from("external_market_comp_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message });
  }

  if (!job) {
    return NextResponse.json({
      ok: true,
      message: "No pending jobs"
    });
  }

  return NextResponse.json({
    ok: true,
    queueId: job.id,
    recordId: job.record_id,
    source: job.source
  });
}
