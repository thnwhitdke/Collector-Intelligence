// ======================================================
// Collector Intelligence
// Portfolio Trend Test Route
// Portfolio Intelligence Test
// ======================================================

import { NextResponse } from 'next/server'

import {
  getPortfolioTrend
} from '@/app/services/analytics/portfolioTrendService'

export async function GET() {

  try {

    const trend =
      await getPortfolioTrend()

    return NextResponse.json({
      success: true,
      trend
    })

  } catch (error) {

    console.error(error)

    return NextResponse.json(
      {
        success: false,
        error:
          'Portfolio trend test failed'
      },
      {
        status: 500
      }
    )

  }

}