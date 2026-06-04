// ======================================================
// Collector Intelligence
// Dashboard Intelligence API
// Portfolio Intelligence Gateway v2
// ======================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/src/lib/supabase/server'
import { createAdminClient } from '@/src/lib/supabase/admin'

import { getTopMovers } from '@/app/services/analytics/topMoversService'
import { getPortfolioTrend } from '@/app/services/analytics/portfolioTrendService'

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function healthGrade(score: number) {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'Developing'
  return 'Early Signal'
}

export async function GET() {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const [movers, portfolioTrend] = await Promise.all([
      getTopMovers(5),
      getPortfolioTrend(),
    ])

    let latestSnapshot = null

    if (user?.id) {
      const { data } = await admin
        .from('portfolio_intelligence_snapshots')
        .select(`
          id,
          created_at,
          total_records,
          total_collection_value,
          average_record_value,
          average_collector_iq,
          average_demand_score,
          average_supply_pressure,
          average_volatility_score,
          average_rarity_score,
          high_value_records,
          elite_value_records,
          accelerating_records,
          volatile_records,
          high_demand_records,
          country_distribution,
          genre_distribution,
          top_records,
          intelligence_confidence_score,
          intelligence_confidence_label,
          intelligence_summary,
          intelligence_reasons
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      latestSnapshot = data
    }

    const confidenceScore = toNumber(
      latestSnapshot?.intelligence_confidence_score,
    )

    return NextResponse.json({
      success: true,
      movers,
      portfolioTrend,
      portfolioSnapshot: latestSnapshot,
      portfolioHealth: latestSnapshot
        ? {
            score: confidenceScore,
            grade: healthGrade(confidenceScore),
            label:
              latestSnapshot.intelligence_confidence_label ||
              healthGrade(confidenceScore),
            summary:
              latestSnapshot.intelligence_summary ||
              'Portfolio intelligence is developing.',
            reasons: latestSnapshot.intelligence_reasons || [],
          }
        : null,
      portfolioDNA: latestSnapshot
        ? {
            genres: latestSnapshot.genre_distribution || [],
            countries: latestSnapshot.country_distribution || [],
          }
        : {
            genres: [],
            countries: [],
          },
      opportunityRadar: latestSnapshot
        ? {
            highDemandAssets: toNumber(latestSnapshot.high_demand_records),
            acceleratingAssets: toNumber(latestSnapshot.accelerating_records),
            volatileAssets: toNumber(latestSnapshot.volatile_records),
            highValueAssets: toNumber(latestSnapshot.high_value_records),
            eliteValueAssets: toNumber(latestSnapshot.elite_value_records),
            averageDemandScore: toNumber(latestSnapshot.average_demand_score),
            averageSupplyPressure: toNumber(
              latestSnapshot.average_supply_pressure,
            ),
            averageVolatilityScore: toNumber(
              latestSnapshot.average_volatility_score,
            ),
            averageRarityScore: toNumber(latestSnapshot.average_rarity_score),
          }
        : null,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        error: 'Dashboard intelligence failed',
      },
      {
        status: 500,
      },
    )
  }
}
