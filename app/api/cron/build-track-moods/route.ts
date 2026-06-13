import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { classifyTrackMood } from "@/src/lib/track-mood-curation";

type TrackRow = {
  discogs_release_id: string | number | null;
  position: string | null;
  title: string | null;
  duration_seconds: number | null;
  artist_credit: string | null;
};

const moodTerms = {
  energy: [
    "rock",
    "dance",
    "party",
    "swing",
    "rebel",
    "beat",
    "drive",
    "fire",
    "power",
    "wild",
    "young",
    "jump",
    "run",
    "alive",
    "electric",
  ],
  reflection: [
    "dream",
    "memory",
    "moon",
    "space",
    "garden",
    "silence",
    "alone",
    "remember",
    "time",
    "shadow",
    "morning",
    "eyes",
    "soul",
    "home",
  ],
  grounding: [
    "calm",
    "peace",
    "home",
    "earth",
    "warm",
    "safe",
    "easy",
    "water",
    "garden",
    "morning",
    "sun",
    "light",
    "hold",
    "stay",
  ],
  focus: [
    "ambient",
    "instrumental",
    "theme",
    "water",
    "air",
    "garden",
    "moss",
    "sound",
    "music",
    "part",
    "sequence",
    "suite",
  ],
  nostalgia: [
    "time",
    "years",
    "youth",
    "yesterday",
    "remember",
    "memory",
    "old",
    "young",
    "past",
    "days",
    "again",
  ],
  experimental: [
    "dub",
    "mix",
    "version",
    "noise",
    "strange",
    "secret",
    "machine",
    "remix",
    "extended",
    "alternate",
    "edit",
    "demo",
  ],
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreTerms(text: string, terms: string[], weight = 18) {
  return terms.reduce(
    (score, term) => score + (text.includes(term) ? weight : 0),
    0,
  );
}

function scoreProfiles(track: TrackRow) {
  const title = String(track.title || "").toLowerCase();
  const artist = String(track.artist_credit || "").toLowerCase();
  const text = `${title} ${artist}`;
  const seconds = Number(track.duration_seconds || 0);

  let energy = scoreTerms(text, moodTerms.energy);
  let reflection = scoreTerms(text, moodTerms.reflection);
  let grounding = scoreTerms(text, moodTerms.grounding);
  let focus = scoreTerms(text, moodTerms.focus);
  let nostalgia = scoreTerms(text, moodTerms.nostalgia);
  let experimental = scoreTerms(text, moodTerms.experimental);

  let comfort = scoreTerms(
    text,
    [
      "home",
      "peace",
      "safe",
      "easy",
      "warm",
      "hold",
      "stay",
      "morning",
      "sun",
      "light",
      "friend",
      "love",
    ],
    12,
  );

  let warmth = scoreTerms(
    text,
    [
      "sun",
      "light",
      "morning",
      "warm",
      "love",
      "gold",
      "summer",
      "smile",
      "sweet",
      "beautiful",
    ],
    12,
  );

  let familiarity = scoreTerms(
    text,
    [
      "home",
      "again",
      "remember",
      "time",
      "years",
      "young",
      "days",
      "old",
      "classic",
    ],
    10,
  );

  if (seconds > 0 && seconds <= 150) {
    energy += 8;
    grounding += 4;
    comfort += 4;
  }

  if (seconds >= 240 && seconds <= 420) {
    reflection += 8;
    focus += 6;
    comfort += 4;
  }

  if (seconds >= 420) {
    focus += 18;
    reflection += 12;
    experimental += 6;
    comfort -= 8;
  }

  if (title.includes("live")) {
    energy += 6;
  }

  if (title.includes("instrumental")) {
    focus += 30;
    reflection += 8;
  }

  if (title.includes("theme")) {
    focus += 20;
  }

  if (title.includes("easy")) {
    grounding += 8;
    comfort += 12;
  }

  if (title.includes("tears") || title.includes("grief") || title.includes("cry")) {
    reflection += 18;
    comfort -= 10;
    warmth -= 8;
  }

  if (title.includes("blackout") || title.includes("dark") || title.includes("shadow")) {
    comfort -= 10;
    warmth -= 10;
  }

  if (title.includes("moon") || title.includes("space")) {
    reflection += 8;
    warmth -= 4;
  }

  if (title.includes("home")) {
    comfort += 14;
    familiarity += 8;
  }

  return {
    energy_score: clamp(energy),
    reflection_score: clamp(reflection),
    grounding_score: clamp(grounding),
    focus_score: clamp(focus),
    nostalgia_score: clamp(nostalgia),
    experimental_score: clamp(experimental),
    comfort_score: clamp(comfort),
    warmth_score: clamp(warmth),
    familiarity_score: clamp(familiarity),
  };
}

function confidenceFor(mood: string, scores: ReturnType<typeof scoreProfiles>) {
  const values = [
    scores.energy_score,
    scores.reflection_score,
    scores.grounding_score,
    scores.focus_score,
    scores.nostalgia_score,
    scores.experimental_score,
  ];

  const topScore = Math.max(...values);

  if (mood === "catalog" && topScore === 0) return 35;
  if (topScore >= 60) return 90;
  if (topScore >= 35) return 80;
  if (topScore >= 18) return 70;
  return mood === "catalog" ? 40 : 65;
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

    for (const track of (tracks || []) as TrackRow[]) {
      if (rowsToInsert.length >= 500) break;

      const key = trackKey(track);

      if (existingKeys.has(key)) continue;

      const mood = classifyTrackMood({
        title: String(track.title || ""),
        artistCredit: track.artist_credit,
        durationSeconds: track.duration_seconds,
      });

      const scores = scoreProfiles(track);

      rowsToInsert.push({
        discogs_release_id: String(track.discogs_release_id),
        position: track.position,
        title: track.title,
        mood,
        confidence: confidenceFor(mood, scores),
        ...scores,
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
    .upsert(rowsToInsert, {
      onConflict: "discogs_release_id,position,title",
    });

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
