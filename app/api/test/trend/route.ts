// ======================================================
// Collector Intelligence
// Trend Test Route
// Historical Intelligence Test
// ======================================================

import { NextResponse } from 'next/server'

import {
  getRecordTrend
} from '@/app/services/analytics/trendService'

export async function GET() {

  try {

    // Test record
    const trend =
      await getRecordTrend(1)

    return NextResponse.json({
      success: true,
      trend
    })

  } catch (error) {

    console.error(error)

    return NextResponse.json(
      {
        success: false,
        error: 'Trend test failed'
      },
      {
        status: 500
      }
    )

  }

}