import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data: records, error } = await supabase
    .from("records_clean_safe")
    .select("*");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const safeRecords = records || [];

  const totalCollectionValue = safeRecords.reduce(
    (sum: number, r: any) =>
      sum + Number(r.estimated_value || 0),
    0
  );

  const totalRecords = safeRecords.length;

  const medianValue =
    totalRecords > 0
      ? Math.round(totalCollectionValue / totalRecords)
      : 0;

  const countryMap: Record<string, number> = {};

  safeRecords.forEach((r: any) => {
    const country = r.country || "Unknown";

    if (!countryMap[country]) {
      countryMap[country] = 0;
    }

    countryMap[country] += 1;
  });

  const countryDistribution = Object.entries(countryMap)
    .map(([country, count]) => ({
      country,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const genreMap: Record<string, number> = {};

  safeRecords.forEach((r: any) => {
    const genre = r.genre || "Unknown";

    if (!genreMap[genre]) {
      genreMap[genre] = 0;
    }

    genreMap[genre] += 1;
  });

  const genreDistribution = Object.entries(genreMap)
    .map(([genre, count]) => ({
      genre,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topRecords = [...safeRecords]
    .sort(
      (a: any, b: any) =>
        Number(b.estimated_value || 0) -
        Number(a.estimated_value || 0)
    )
    .slice(0, 15);

  const marketMomentum = [
    { month: "Jan", value: 12000 },
    { month: "Feb", value: 14500 },
    { month: "Mar", value: 18200 },
    { month: "Apr", value: 21000 },
    { month: "May", value: 25800 },
    { month: "Jun", value: 30500 },
  ];

  const velocity = [
    {
      label: "Average Record Value",
      value: `$${medianValue}`,
    },
    {
      label: "High Value Records",
      value: `${
        safeRecords.filter(
          (r: any) =>
            Number(r.estimated_value || 0) > 500
        ).length
      }`,
    },
    {
      label: "Elite Tier Records",
      value: `${
        safeRecords.filter(
          (r: any) =>
            Number(r.estimated_value || 0) > 1000
        ).length
      }`,
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
    marketMomentum,
    velocity,
  });
}