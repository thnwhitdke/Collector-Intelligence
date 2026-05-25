"use server";

import { createAdminClient }
from "../../src/lib/supabase/admin";

type ActivityInput = {
  activityType: string;
  recordId?: string | number;
};

export async function logActivity({
  activityType,
  recordId,
}: ActivityInput) {

  try {

    const supabase =
      createAdminClient();

    const {
      error,
    } = await supabase
      .from("activity_log")
      .insert({
        activity_type:
          activityType,
        record_id:
          recordId || null,
      });

    if (error) {

      console.error(
        "ACTIVITY LOG FAILED:",
        error
      );

      return {
        success: false,
        error,
      };
    }

    console.log(
      "ACTIVITY LOG SUCCESS"
    );

    return {
      success: true,
    };

  } catch (error) {

    console.error(
      "ACTIVITY LOG CRASHED:",
      error
    );

    return {
      success: false,
      error,
    };

  }

}
