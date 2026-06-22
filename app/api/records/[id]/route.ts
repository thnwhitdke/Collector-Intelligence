import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createAdminClient();

  const { id } = await params;

  const { data, error } = await supabase
    .from("records_clean_safe")
    .select("*")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Record not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    record: data,
  });
}
