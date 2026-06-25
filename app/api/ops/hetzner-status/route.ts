import { NextResponse } from "next/server"
import { createAdminClient } from "@/src/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const admin = createAdminClient()

  const [
    warehouseCount,
    warehouseMetrics,
    recordsCount,
    valueHistoryCount,
    compsCount,
    trendCount,
    marketObservationCount,
  ] = await Promise.all([
    admin.from("release_reference").select("*", { count: "exact", head: true }),
    admin.from("release_warehouse_metrics").select("*").limit(1).maybeSingle(),
    admin.from("records_clean_safe").select("*", { count: "exact", head: true }),
    admin.from("value_history").select("*", { count: "exact", head: true }),
    admin.from("external_market_comps").select("*", { count: "exact", head: true }),
    admin.from("market_trend_signals").select("*", { count: "exact", head: true }),
    admin.from("market_observations").select("*", { count: "exact", head: true }),
  ])

  return NextResponse.json({
    ok: true,
    refreshedAt: new Date().toISOString(),
    warehouse: {
      actualReleaseRows: warehouseCount.count || 0,
      dashboardMetric: warehouseMetrics.data || null,
      metricError: warehouseMetrics.error?.message || null,
    },
    collection: {
      records: recordsCount.count || 0,
      valueHistory: valueHistoryCount.count || 0,
    },
    market: {
      externalComps: compsCount.count || 0,
      trendSignals: trendCount.count || 0,
      observations: marketObservationCount.count || 0,
    },
  })
}
