import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const releaseIds = Array.isArray(body.source_release_ids)
    ? body.source_release_ids.map((id: unknown) => String(id).trim()).filter(Boolean)
    : [];

  const actionType = String(body.action_type || "").trim();

  if (!releaseIds.length || !["want", "reviewed", "ignored"].includes(actionType)) {
    return NextResponse.json({ error: "Invalid bulk action." }, { status: 400 });
  }

  const rows = releaseIds.map((releaseId: string) => ({
    user_id: user.id,
    source: "discogs",
    source_release_id: releaseId,
    action_type: actionType,
  }));

  const { error } = await supabase
    .from("user_release_actions")
    .upsert(rows, { onConflict: "user_id,source_release_id,action_type" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, count: rows.length });
}
