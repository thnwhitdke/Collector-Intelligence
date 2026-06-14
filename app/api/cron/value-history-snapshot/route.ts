// ======================================================
// Collector Intelligence
// Value History Snapshot Cron
// Daily Market Memory Refresh
// ======================================================

import { NextResponse } from "next/server";
import { snapshotAllValueHistory } from "@/app/services/valuation/valueHistoryService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const result = await snapshotAllValueHistory();

    return NextResponse.json({
      ...result,
      route: "/api/cron/value-history-snapshot",
    });
  } catch (error) {
    console.error("[Value History Snapshot Cron]", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Value history snapshot failed",
      },
      {
        status: 500,
      }
    );
  }
}
