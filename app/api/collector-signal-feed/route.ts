import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

export async function GET() {
  const userSupabase = await createClient();

  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("collector_signal_feed")
    .select(`
      id,
      signal_date,
      signal_type,
      signal_title,
      signal_summary,
      signal_strength,
      artist,
      created_at
    `)
    .order("signal_strength", { ascending: false })
    .limit(25);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    userId: user.id,
    generatedAt: new Date().toISOString(),
    count: data?.length ?? 0,
    signals: data ?? [],
  });
}
