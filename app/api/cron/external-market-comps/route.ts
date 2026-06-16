import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({
      ok: false,
      error: "Missing Supabase environment variables"
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

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
