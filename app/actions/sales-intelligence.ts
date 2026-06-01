"use server";

import { createClient } from "@/src/lib/supabase/server";

type CreateRawSalesObservationInput = {
  sourceKey: string;
  externalSaleId?: string;
  externalUrl?: string;
  artist?: string;
  title?: string;
  label?: string;
  catalogNumber?: string;
  format?: string;
  country?: string;
  year?: string;
  condition?: string;
  description?: string;
  salePrice?: number;
  saleCurrency?: string;
  saleDate?: string;
  rawPayload?: Record<string, unknown>;
};

export async function createRawSalesObservation(
  input: CreateRawSalesObservationInput
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      error: "Unauthorized",
    };
  }

  if (!input.sourceKey) {
    return {
      ok: false,
      error: "Missing sourceKey",
    };
  }

  const { data, error } = await supabase
    .from("raw_sales_observations")
    .insert({
      source_key: input.sourceKey,
      external_sale_id: input.externalSaleId ?? null,
      external_url: input.externalUrl ?? null,
      raw_artist: input.artist ?? null,
      raw_title: input.title ?? null,
      raw_label: input.label ?? null,
      raw_catalog_number: input.catalogNumber ?? null,
      raw_format: input.format ?? null,
      raw_country: input.country ?? null,
      raw_year: input.year ?? null,
      raw_condition: input.condition ?? null,
      raw_description: input.description ?? null,
      sale_price: input.salePrice ?? null,
      sale_currency: input.saleCurrency ?? "USD",
      sale_date: input.saleDate ?? null,
      raw_payload: input.rawPayload ?? {},
      imported_by: user.id,
      normalization_status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  return {
    ok: true,
    rawObservationId: data.id,
  };
}
