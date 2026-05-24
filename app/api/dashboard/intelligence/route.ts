// ======================================================
// Collector Intelligence
// Dashboard Intelligence API
// Historical Intelligence Gateway
// ======================================================

import { NextResponse } from 'next/server'

import {
  getTopMovers
} from '@/app/services/analytics/topMoversService'

import {
  getPortfolioTrend
} from '@/app/services/analytics/portfolioTrendService'

export async function GET() {

  try {

    const [
      movers,
      portfolioTrend
    ] = await Promise.all([
      getTopMovers(5),
      getPortfolioTrend()
    ])

    return NextResponse.json({
      success: true,
      movers,
      portfolioTrend
    })

  } catch (error) {

    console.error(error)

    return NextResponse.json(
      {
        success: false,
        error:
          'Dashboard intelligence failed'
      },
      {
        status: 500
      }
    )

  }

}