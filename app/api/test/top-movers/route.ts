// ======================================================
// Collector Intelligence
// Top Movers Test Route
// Historical Movers Intelligence
// ======================================================

import { NextResponse } from 'next/server'

import {
  getTopMovers
} from '@/app/services/analytics/topMoversService'

export async function GET() {

  try {

    const movers =
      await getTopMovers(10)

    return NextResponse.json({
      success: true,
      movers
    })

  } catch (error) {

    console.error(error)

    return NextResponse.json(
      {
        success: false,
        error:
          'Top movers test failed'
      },
      {
        status: 500
      }
    )

  }

}