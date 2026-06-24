import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") ?? 100)))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env vars" }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data: compRows, error: compError } = await supabase
    .from("external_market_comps")
    .select("record_id")
    .eq("source", "popsike")
    .limit(10000)

  if (compError) {
    return NextResponse.json({ ok: false, error: compError.message }, { status: 500 })
  }

  const existingCompIds = new Set((compRows ?? []).map((r: any) => Number(r.record_id)).filter(Boolean))

  const { data: queueRows, error: queueError } = await supabase
    .from("external_market_comp_queue")
    .select("record_id")
    .in("status", ["pending", "processing"])
    .limit(10000)

  if (queueError) {
    return NextResponse.json({ ok: false, error: queueError.message }, { status: 500 })
  }

  const queuedIds = new Set((queueRows ?? []).map((r: any) => Number(r.record_id)).filter(Boolean))

  const { data: records, error: recordError } = await supabase
    .from("records_clean_safe")
    .select("id, artist, title, estimated_value, discogs_median_price")
    .not("artist", "is", null)
    .not("title", "is", null)
    .order("estimated_value", { ascending: false, nullsFirst: false })
    .limit(5000)

  if (recordError) {
    return NextResponse.json({ ok: false, error: recordError.message }, { status: 500 })
  }

  const candidates = (records ?? [])
    .filter((r: any) => {
      const id = Number(r.id)
      return id && !existingCompIds.has(id) && !queuedIds.has(id)
    })
    .slice(0, limit)

  if (!candidates.length) {
    return NextResponse.json({
      ok: true,
      queued: 0,
      message: "No missing Popsike candidates found",
    })
  }

  const inserts = candidates.map((r: any) => ({
    record_id: Number(r.id),
    status: "pending",
    attempts: 0,
  }))

  const { error: insertError } = await supabase
    .from("external_market_comp_queue")
    .insert(inserts)

  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    queued: inserts.length,
    coverage_gap_targeted: true,
    message: `Queued ${inserts.length} records missing Popsike comps`,
  })
}
