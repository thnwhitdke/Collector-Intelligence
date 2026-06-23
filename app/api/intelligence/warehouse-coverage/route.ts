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

  const admin = createAdminClient();

  const [{ data: warehouse }, { count: collectionCount }] = await Promise.all([
    admin.from("release_warehouse_metrics").select("*").single(),

    admin
      .from("records_clean_safe")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  return NextResponse.json({
    warehouse,
    collectionCount: collectionCount ?? 0,
    coveragePercent:
      warehouse?.releases
        ? ((collectionCount ?? 0) / warehouse.releases) * 100
        : 0,
  });
}
