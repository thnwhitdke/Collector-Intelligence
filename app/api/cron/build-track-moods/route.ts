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

export async function GET() {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("track_mood_intelligence")
    .select("discogs_release_id, position, title")
    .limit(50000);

  const existingKeys = new Set(
    (existing || []).map(
      (row) => `${row.discogs_release_id}::${row.position || ""}::${row.title}`,
    ),
  );

  const { data: tracks, error } = await supabase
    .from("release_tracks")
    .select(`
      discogs_release_id,
      position,
      title,
      duration_seconds,
      artist_credit
    `)
    .limit(500);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (tracks || [])
    .filter((track) => {
      const key = `${track.discogs_release_id}::${track.position || ""}::${track.title}`;
      return !existingKeys.has(key);
    })
    .map((track) => {
      const mood = classifyTrackMood({
        title: track.title,
        artistCredit: track.artist_credit,
        durationSeconds: track.duration_seconds,
      });

      return {
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
      };
    });

  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      job: "build-track-moods",
      inserted: 0,
      message: "No new tracks to classify.",
    });
  }

  const { error: insertError } = await supabase
    .from("track_mood_intelligence")
    .insert(rows);

  if (insertError) {
    return NextResponse.json(
      { ok: false, error: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    job: "build-track-moods",
    inserted: rows.length,
  });
}
