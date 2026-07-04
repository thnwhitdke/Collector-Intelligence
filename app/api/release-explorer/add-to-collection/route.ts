import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

type AddReleaseBody = {
  artist?: string | null;
  title?: string | null;
  country?: string | null;
  label?: string | null;
  catalog_number?: string | null;
  format?: string | null;
  release_year?: string | number | null;
  discogs_release_id?: string | number | null;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as AddReleaseBody;
  const releaseId = String(body.discogs_release_id || "").trim();

  if (!releaseId || !body.artist || !body.title) {
    return NextResponse.json(
      { error: "Artist, title, and Discogs Release ID are required." },
      { status: 400 },
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("records_clean_safe")
    .select("id")
    .eq("user_id", user.id)
    .eq("discogs_release_id", releaseId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 },
    );
  }

  if (existing) {
    return NextResponse.json({
      success: true,
      alreadyOwned: true,
      recordId: existing.id,
    });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("records_clean_safe")
    .insert({
      user_id: user.id,
      artist: body.artist,
      title: body.title,
      country: body.country || null,
      label: body.label || null,
      catalogue_number: body.catalog_number || null,
      format: body.format || null,
      year_released: body.release_year || null,
      year: body.release_year || null,
      discogs_release_id: releaseId,
      discogs_url: `https://www.discogs.com/release/${releaseId}`,
      value_source: "Discogs warehouse reference",
      enrichment_status: "pending",
      possible_duplicate: false,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    alreadyOwned: false,
    recordId: inserted.id,
  });
}
