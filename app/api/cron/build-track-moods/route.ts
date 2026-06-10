import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { classifyTrackMood } from "@/src/lib/track-mood-curation";

function scoreMood(title: string, terms: string[]) {
  const text = title.toLowerCase();

  return Math.min(
    100,
    terms.reduce((score, term) => score + (text.includes(term) ? 25 : 0), 0),
  );
}

function trackKey(row: {
  discogs_release_id: string | number | null;
  position: string | null;
  title: string | null;
}) {
  return `${String(row.discogs_release_id || "")}::${String(row.position || "")}::${String(row.title || "")}`;
}

export async function GET() {
  const supabase = createAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("track_mood_intelligence")
    .select("discogs_release_id, position, title")
    .limit(50000);

  if (existingError) {
    return NextResponse.json(
      { ok: false, error: existingError.message },
      { status: 500 },
    );
  }

  const existingKeys = new Set((existing || []).map(trackKey));

  const pageSize = 1000;
  const maxRowsToScan = 50000;
  const rowsToInsert = [];

  for (let start = 0; start < maxRowsToScan; start += pageSize) {
    const end = start + pageSize - 1;

    const { data: tracks, error } = await supabase
      .from("release_tracks")
      .select(`
        discogs_release_id,
        position,
        title,
        duration_seconds,
        artist_credit
      `)
      .order("discogs_release_id", { ascending: true })
      .order("position", { ascending: true })
      .range(start, end);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    for (const track of tracks || []) {
      if (rowsToInsert.length >= 500) break;

      const key = trackKey(track);

      if (existingKeys.has(key)) continue;

      const mood = classifyTrackMood({
        title: track.title,
        artistCredit: track.artist_credit,
        durationSeconds: track.duration_seconds,
      });

      rowsToInsert.push({
        discogs_release_id: String(track.discogs_release_id),
        position: track.position,
        title: track.title,
        mood,
        confidence: mood === "catalog" ? 35 : 75,
        energy_score: scoreMood(track.title, ["rock", "dance", "party", "swing", "rebel", "beat"]),
        reflection_score: scoreMood(track.title, ["dream", "memory", "moon", "space", "garden", "silence"]),
        grounding_score: scoreMood(track.title, ["calm", "peace", "home", "earth", "warm", "safe"]),
        focus_score: scoreMood(track.title, ["ambient", "instrumental", "theme", "water", "air"]),
        nostalgia_score: scoreMood(track.title, ["time", "years", "youth", "yesterday", "remember"]),
      });

      existingKeys.add(key);
    }

    if (rowsToInsert.length >= 500) break;
    if ((tracks || []).length < pageSize) break;
  }

  if (rowsToInsert.length === 0) {
    return NextResponse.json({
      ok: true,
      job: "build-track-moods",
      inserted: 0,
      message: "No new tracks to classify.",
    });
  }

  const { error: insertError } = await supabase
    .from("track_mood_intelligence")
    .insert(rowsToInsert);

  if (insertError) {
    return NextResponse.json(
      { ok: false, error: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    job: "build-track-moods",
    inserted: rowsToInsert.length,
  });
}
