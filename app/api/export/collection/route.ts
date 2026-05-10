import { NextResponse } from "next/server";
import { createClient } from "../../../../src/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
   .from("records_clean_safe")
.select("*")
.is(
  "discogs_release_id",
  null
)
.limit(25);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const rows = data ?? [];

  if (rows.length === 0) {
    return new NextResponse("No records found.", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  const headers = Object.keys(rows[0]);

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header];

          if (value === null || value === undefined) {
            return "";
          }

          const stringValue = String(value).replaceAll('"', '""');

          return `"${stringValue}"`;
        })
        .join(",")
    ),
  ].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="collector-intelligence-export.csv"',
    },
  });
}