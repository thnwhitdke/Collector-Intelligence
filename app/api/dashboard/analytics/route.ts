import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data: records, error } = await supabase
    .from("records_clean_safe")
    .select(`
      id,
      artist,
      title,
      estimated_value,
      current_value,
      country,
      genre,
      collector_iq_score
    `)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const safeRecords = records ?? [];

  const getRecordValue = (record: any) =>
    toNumber(record.estimated_value || record.current_value);

  const totalCollectionValue = safeRecords.reduce(
    (sum: number, record: any) => sum + getRecordValue(record),
    0
  );

  const totalRecords = safeRecords.length;

  const medianValue =
    totalRecords > 0
      ? Math.round(totalCollectionValue / totalRecords)
      : 0;

  const countryMap: Record<string, number> = {};

  for (const record of safeRecords) {
    const country = record.country || "Unknown";
    countryMap[country] = (countryMap[country] ?? 0) + 1;
  }

  const countryDistribution = Object.entries(countryMap)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);

  const genreMap: Record<string, number> = {};

  for (const record of safeRecords) {
    const genre = record.genre || "Unknown";
    genreMap[genre] = (genreMap[genre] ?? 0) + 1;
  }

  const genreDistribution = Object.entries(genreMap)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topRecords = [...safeRecords]
    .sort((a: any, b: any) => getRecordValue(b) - getRecordValue(a))
    .slice(0, 15);

  const averageCollectorIQ =
    totalRecords > 0
      ? Math.round(
          safeRecords.reduce(
            (sum: number, record: any) =>
              sum + toNumber(record.collector_iq_score),
            0
          ) / totalRecords
        )
      : 0;

  const velocity = [
    {
      label: "Average Record Value",
      value: `$${medianValue}`,
    },
    {
      label: "High Value Records",
      value: String(
        safeRecords.filter((record: any) => getRecordValue(record) > 500)
          .length
      ),
    },
    {
      label: "Elite Tier Records",
      value: String(
        safeRecords.filter((record: any) => getRecordValue(record) > 1000)
          .length
      ),
    },
  ];

  return NextResponse.json({
    totalCollectionValue,
    totalRecords,
    medianValue,
    totalCountries: countryDistribution.length,
    countryDistribution,
    genreDistribution,
    topRecords,
    marketMomentum: [],
    velocity,
    averageCollectorIQ,
  });
}
