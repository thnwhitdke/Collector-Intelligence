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

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey
  );

  const { data: job, error: jobError } = await supabase
    .from("external_market_comp_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (jobError) {
    return NextResponse.json({
      ok: false,
      error: jobError.message
    });
  }

  if (!job) {
    return NextResponse.json({
      ok: true,
      message: "No pending jobs"
    });
  }

  const { data: record, error: recordError } =
    await supabase
      .from("records_clean_safe")
      .select(`
        id,
        artist,
        title,
        catalogue_number,
        discogs_release_id
      `)
      .eq("id", job.record_id)
      .single();

  if (recordError) {
    return NextResponse.json({
      ok: false,
      error: recordError.message
    });
  }

  const searchQuery = [
    record.artist,
    record.title,
    record.catalogue_number
  ]
    .filter(Boolean)
    .join(" ");

  return NextResponse.json({
    ok: true,
    queueId: job.id,
    recordId: record.id,
    artist: record.artist,
    title: record.title,
    catalogue_number: record.catalogue_number,
    discogs_release_id: record.discogs_release_id,
    searchQuery
  });
}
