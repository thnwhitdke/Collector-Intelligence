export type ReportRecord = {
  artist?: string | null;
  title?: string | null;
  label?: string | null;
  genre?: string | null;
  style?: string | null;
  format?: string | null;
  country?: string | null;
  condition?: string | null;
  sleeve_condition?: string | null;

  estimated_value?: number | string | null;
  median_price?: number | string | null;
  high_price?: number | string | null;
  low_price?: number | string | null;
};

function numeric(value: unknown) {
  const parsed = Number(
    String(value || 0).replace(/[$,]/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

export function calculateKPIs(
  records: ReportRecord[]
) {
  const totalValue = records.reduce(
    (sum, record) =>
      sum +
      numeric(
        record.estimated_value ||
        record.median_price
      ),
    0
  );

  const countries = new Set(
    records.map((r) => r.country).filter(Boolean)
  );

  const formats = new Set(
    records.map((r) => r.format).filter(Boolean)
  );

  return {
    totalValue,
    totalRecords: records.length,
    averageValue:
      records.length > 0
        ? totalValue / records.length
        : 0,
    totalCountries: countries.size,
    totalFormats: formats.size,
  };
}

export function getUniqueValues(
  records: ReportRecord[],
  field: keyof ReportRecord
) {
  return Array.from(
    new Set(
      records
        .map((r) => r[field])
        .filter(Boolean)
    )
  ).sort();
}