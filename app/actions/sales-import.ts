"use server";

import { createClient } from "@/src/lib/supabase/server";

type SalesCsvRow = {
  artist?: string;
  title?: string;
  label?: string;
  catalog_number?: string;
  catalogue_number?: string;
  format?: string;
  country?: string;
  year?: string;
  condition?: string;
  description?: string;
  price?: string | number;
  sale_price?: string | number;
  currency?: string;
  sale_currency?: string;
  date?: string;
  sale_date?: string;
  url?: string;
  external_url?: string;
  external_sale_id?: string;
};

type ImportSalesRowsInput = {
  sourceKey: string;
  originalFilename?: string;
  rows: SalesCsvRow[];
  notes?: string;
};

function toNumber(value: unknown): number | null {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function importSalesRows(input: ImportSalesRowsInput) {
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

  if (!Array.isArray(input.rows) || input.rows.length === 0) {
    return {
      ok: false,
      error: "No rows supplied",
    };
  }

  const { data: batch, error: batchError } = await supabase
    .from("sales_import_batches")
    .insert({
      user_id: user.id,
      source_key: input.sourceKey,
      original_filename: input.originalFilename ?? null,
      total_rows: input.rows.length,
      notes: input.notes ?? null,
      import_status: "processing",
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return {
      ok: false,
      error: batchError?.message ?? "Failed to create import batch",
    };
  }

  const batchId = batch.id;

  const rowsToInsert = input.rows.map((row) => ({
    source_key: input.sourceKey,
    external_sale_id: cleanString(row.external_sale_id),
    external_url: cleanString(row.external_url ?? row.url),
    raw_artist: cleanString(row.artist),
    raw_title: cleanString(row.title),
    raw_label: cleanString(row.label),
    raw_catalog_number: cleanString(
      row.catalog_number ?? row.catalogue_number
    ),
    raw_format: cleanString(row.format),
    raw_country: cleanString(row.country),
    raw_year: cleanString(row.year),
    raw_condition: cleanString(row.condition),
    raw_description: cleanString(row.description),
    sale_price: toNumber(row.sale_price ?? row.price),
    sale_currency:
      cleanString(row.sale_currency ?? row.currency) ?? "USD",
    sale_date: cleanString(row.sale_date ?? row.date),
    raw_payload: row,
    imported_by: user.id,
    import_batch_id: batchId,
    normalization_status: "pending",
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("raw_sales_observations")
    .insert(rowsToInsert)
    .select("id");

  if (insertError) {
    await supabase
      .from("sales_import_batches")
      .update({
        import_status: "failed",
        failed_rows: input.rows.length,
        error_message: insertError.message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    return {
      ok: false,
      batchId,
      error: insertError.message,
    };
  }

  const insertedRows = inserted?.length ?? 0;

  await supabase
    .from("sales_import_batches")
    .update({
      import_status: "imported",
      inserted_rows: insertedRows,
      failed_rows: input.rows.length - insertedRows,
      completed_at: new Date().toISOString(),
    })
    .eq("id", batchId);

  return {
    ok: true,
    batchId,
    totalRows: input.rows.length,
    insertedRows,
  };
}
