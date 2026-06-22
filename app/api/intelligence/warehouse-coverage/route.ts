import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  const [{ data: warehouse }, { count: collectionCount }] =
    await Promise.all([
      supabase
        .from("release_warehouse_metrics")
        .select("*")
        .single(),

      supabase
        .from("records_clean_safe")
        .select("*", { count: "exact", head: true }),
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
