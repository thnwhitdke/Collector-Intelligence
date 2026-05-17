import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    /*
      ACTIVITY LOG
    */

    const {
      data: activityData,
      error: activityError,
    } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(25);

    if (activityError) {
      console.error(activityError);
    }

    /*
      TOTAL COUNTS
    */

  const completedJobs =
  activityData?.filter(
    (item) =>
      item.status === "success"
  ).length || 0;

const failedJobs =
  activityData?.filter(
    (item) =>
      item.status === "error"
  ).length || 0;

const retryJobs = 0;

const permanentFailures = 0;

    const totalJobs =
      activityData?.length || 0;

    const successRate =
      totalJobs > 0
        ? Math.round(
            (completedJobs /
              totalJobs) *
              100
          )
        : 0;

    return NextResponse.json({
      totals: {
        totalJobs,
        completedJobs,
        failedJobs,
        retryJobs,
        permanentFailures,
        successRate,
      },

      activity:
        activityData || [],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        totals: {
          totalJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          retryJobs: 0,
          permanentFailures: 0,
          successRate: 0,
        },

        activity: [],

        error:
          "Failed to load analytics",
      },
      {
        status: 500,
      }
    );
  }
}