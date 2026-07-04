import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const releaseId = String(body.source_release_id || "").trim();
  const actionType = String(body.action_type || "").trim();

  if (!releaseId || !["want", "reviewed", "ignored"].includes(actionType)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("user_release_actions")
    .select("id")
    .eq("user_id", user.id)
    .eq("source_release_id", releaseId)
    .eq("action_type", actionType)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("user_release_actions")
      .delete()
      .eq("id", existing.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ active: false });
  }

  const { error } = await supabase.from("user_release_actions").insert({
    user_id: user.id,
    source: "discogs",
    source_release_id: releaseId,
    action_type: actionType,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ active: true });
}
