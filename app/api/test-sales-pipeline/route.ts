import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { normalizeSalesObservation } from "@/app/actions/sales-normalization";
import { matchSalesCompToRecords } from "@/app/actions/sales-matching";

export async function GET() {
  const supabase = createAdminClient();

  const { data: source } = await supabase
    .from("external_sales_sources")
    .select("id")
    .eq("source_key", "manual_comp")
    .single();

  const { data: raw, error } = await supabase
    .from("raw_sales_observations")
    .insert({
      source_id: source?.id ?? null,
      source_key: "manual_comp",
      raw_artist: "David Bowie",
      raw_title: "Low",
      raw_label: "RCA",
      raw_year: "1977",
      sale_price: 120,
      sale_currency: "USD",
      normalization_status: "pending",
    })
    .select("id")
    .single();

  if (error || !raw) {
    return NextResponse.json({
      ok: false,
      stage: "raw_insert",
      error: error?.message,
    });
  }

  const normalized =
    await normalizeSalesObservation(
      raw.id
    );

  if (
    !normalized.ok ||
    !normalized.normalizedCompId
  ) {
    return NextResponse.json({
      ok: false,
      stage: "normalize",
      normalized,
    });
  }

  const matched =
    await matchSalesCompToRecords(
      normalized.normalizedCompId
    );

  return NextResponse.json({
    ok: true,
    rawObservationId: raw.id,
    normalized,
    matched,
  });
}
