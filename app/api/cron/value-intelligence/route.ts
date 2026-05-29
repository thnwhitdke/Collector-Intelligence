import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { refreshValueIntelligence } from "@/app/actions/value-intelligence";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: records, error } = await supabase
      .from("records_clean_safe")
      .select("id")
      .limit(250);

    if (error) {
      throw new Error(error.message);
    }

    let updated = 0;
    const errors: string[] = [];

    for (const record of records || []) {
      try {
        await refreshValueIntelligence(
          String(record.id),
        );

        updated++;
      } catch (err) {
        errors.push(
          String(record.id),
        );
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      errors,
    });

  } catch (err: unknown) {

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}
