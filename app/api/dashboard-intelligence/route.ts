import { NextResponse } from 'next/server'
import { getDashboardIntelligence } from '@/app/actions/dashboard-intelligence'

export async function GET() {
  try {
    const intelligence =
      await getDashboardIntelligence()

    return NextResponse.json({
      success: true,
      ...intelligence,
    })
  } catch (error) {
    console.error(
      '[Dashboard Intelligence API]',
      error,
    )

    return NextResponse.json(
      {
        success: false,
        error:
          'Failed to load dashboard intelligence',
      },
      {
        status: 500,
      },
    )
  }
}
