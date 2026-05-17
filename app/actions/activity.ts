"use server";

import { createClient } from "../../src/lib/supabase/server";

type ActivityInput = {
  userId: string;

  activityType: string;

  entityType?: string;
  entityId?: string;

  title: string;

  description?: string;

  metadata?: any;

  status?: "success" | "warning" | "error";
};

export async function logActivity({
  userId,
  activityType,
  entityType,
  entityId,
  title,
  description,
  metadata = {},
  status = "success",
}: ActivityInput) {

  try {

    console.log(
      "LOG ACTIVITY START",
      {
        userId,
        activityType,
        entityType,
        entityId,
      }
    );

    const supabase =
      await createClient();

    const {
      data,
      error,
    } = await supabase
      .from("activity_log")
      .insert({
        user_id: userId,

        activity_type:
          activityType,

        entity_type:
          entityType || null,

        entity_id:
          entityId || null,

        title,

        description,

        metadata,

        status,
      })
      .select();

    if (error) {

      console.error(
        "ACTIVITY LOG INSERT FAILED:",
        error
      );

      return {
        success: false,
        error,
      };

    }

    console.log(
      "ACTIVITY LOG SUCCESS:",
      data
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