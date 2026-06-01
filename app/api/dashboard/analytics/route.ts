import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

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

  const { data: snapshot, error } = await supabase
    .from("portfolio_intelligence_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .single();

  if (error || !snapshot) {
    return NextResponse.json(
      {
        error: "No portfolio snapshot found",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    totalCollectionValue:
      snapshot.total_collection_value,

    totalRecords:
      snapshot.total_records,

    medianValue:
      snapshot.average_record_value,

    totalCountries:
      Array.isArray(
        snapshot.country_distribution
      )
        ? snapshot.country_distribution.length
        : 0,

    countryDistribution:
      snapshot.country_distribution ?? [],

    genreDistribution:
      snapshot.genre_distribution ?? [],

    topRecords:
      snapshot.top_records ?? [],

    marketMomentum: [],

    velocity: [
      {
        label: "Average Record Value",
        value: `$${Math.round(
          Number(
            snapshot.average_record_value || 0
          )
        )}`,
      },
      {
        label: "High Value Records",
        value: String(
          snapshot.high_value_records || 0
        ),
      },
      {
        label: "Elite Tier Records",
        value: String(
          snapshot.elite_value_records || 0
        ),
      },
    ],

    averageCollectorIQ:
      snapshot.average_collector_iq ?? 0,

    snapshotCreatedAt:
      snapshot.created_at,
  });
}
