// ======================================================
// Collector Intelligence
// Queue Test Endpoint
// ======================================================

import { NextResponse } from 'next/server'

import {
  enqueueRecordEnrichment
} from '@/app/services/enrichment/enqueueService'

export async function GET() {

  try {

    // Test using record ID 1
    const result =
      await enqueueRecordEnrichment(1)

    return NextResponse.json({
      success: true,
      result
    })

  } catch (error) {

    console.error(error)

    return NextResponse.json(
      {
        success: false,
        error: 'Enqueue failed'
      },
      {
        status: 500
      }
    )

  }

}