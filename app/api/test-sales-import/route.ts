import { NextResponse } from "next/server";
import { importSalesRows } from "@/app/actions/sales-import";

export async function GET() {
  const result = await importSalesRows({
    sourceKey: "test_import_pipeline",
    originalFilename: "test-import.csv",
    rows: [
      {
        artist: "David Bowie",
        title: "Low",
        label: "RCA",
        year: "1977",
        price: "125",
        currency: "USD",
        date: "2025-01-15",
        format: "LP",
        country: "US",
      },
      {
        artist: "David Bowie",
        title: "Heroes",
        label: "RCA",
        year: "1977",
        price: "95",
        currency: "USD",
        date: "2025-02-10",
        format: "LP",
        country: "UK",
      },
    ],
    notes: "CI pipeline validation",
  });

  return NextResponse.json(result);
}
