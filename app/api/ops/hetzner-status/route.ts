import { NextResponse } from "next/server"
import { createAdminClient } from "@/src/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const admin = createAdminClient()

  const [
    warehouseMetrics,
    recordsCount,
    valueHistoryCount,
    compsCount,
    trendCount,
    marketObservationCount,
  ] = await Promise.all([
    admin.from("release_warehouse_metrics").select("*").order("refreshed_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("records_clean_safe").select("id", { count: "exact", head: true }),
    admin.from("value_history").select("id", { count: "exact", head: true }),
    admin.from("external_market_comps").select("id", { count: "exact", head: true }),
    admin.from("market_trend_signals").select("id", { count: "exact", head: true }),
    admin.from("market_observations").select("id", { count: "exact", head: true }),
  ])

  return NextResponse.json({
    ok: true,
    refreshedAt: new Date().toISOString(),
    warehouse: {
      actualReleaseRows: warehouseMetrics.data?.releases || 0,
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
