"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";
import {
  detectMoodIntent,
  classifyTrackMood,
  scoreTrackForIntent,
  type MoodIntent,
} from "@/src/lib/track-mood-curation";
import { buildListeningSession } from "@/src/lib/session-generator";

type MoodTrackRow = {
  discogs_release_id: string | null;
  position: string | null;
  title: string | null;
  duration_seconds: number | null;
  duration_raw?: string | null;
  artist_credit?: string | null;
  mood: string | null;
  confidence: number | null;
  energy_score: number | null;
  reflection_score: number | null;
  grounding_score: number | null;
  focus_score: number | null;
  nostalgia_score: number | null;
  experimental_score: number | null;
  comfort_score: number | null;
  warmth_score: number | null;
  familiarity_score: number | null;
};

function titlePenalty(row: MoodTrackRow, intent: MoodIntent) {
  const title = String(row.title || "").toLowerCase();

  if (intent.mood === "grounding") {
    if (title.includes("ain't easy")) return 45;
    if (title === "easy") return 35;
    if (title.includes("easy")) return 28;
    if (title.includes("home")) return 22;
  }

  if (intent.mood === "late-night") {
    if (title.includes("blackout")) return 45;
    if (title.includes("dark")) return 35;
    if (title.includes("moonage")) return 45;
    if (title.includes("moon")) return 35;
    if (title.includes("space")) return 28;
  }

  return 0;
}

function moodScore(row: MoodTrackRow, intent: MoodIntent) {
  const penalty = titlePenalty(row, intent);

  switch (intent.mood) {
    case "energy":
      return row.energy_score || 0;
    case "reflective":
      return row.reflection_score || 0;
    case "grounding":
      return Math.round(
        ((row.comfort_score || 0) * 1.8) +
        ((row.warmth_score || 0) * 1.4) +
        ((row.familiarity_score || 0) * 1.0) +
        ((row.grounding_score || 0) * 0.45) -
        ((row.experimental_score || 0) * 0.8) -
        ((row.energy_score || 0) * 0.5) -
        penalty,
      );
    case "focus":
      return row.focus_score || 0;
    case "nostalgic":
      return row.nostalgia_score || 0;
    case "experimental":
      return row.experimental_score || 0;
    case "late-night":
      return Math.round(
        ((row.reflection_score || 0) * 0.75) +
        ((row.comfort_score || 0) * 1.5) +
        ((row.warmth_score || 0) * 1.25) +
        ((row.familiarity_score || 0) * 1.0) -
        ((row.energy_score || 0) * 0.65) -
        ((row.experimental_score || 0) * 0.75) -
        penalty,
      );
    case "melancholy":
      return Math.max(row.reflection_score || 0, row.nostalgia_score || 0);
    case "immersive":
      return Math.max(row.focus_score || 0, row.reflection_score || 0);
    case "short-form":
      return row.duration_seconds && row.duration_seconds <= 150 ? 55 : 0;
    default:
      return Math.max(
        row.energy_score || 0,
        row.reflection_score || 0,
        row.grounding_score || 0,
        row.focus_score || 0,
        row.nostalgia_score || 0,
        row.experimental_score || 0,
        row.comfort_score || 0,
        row.warmth_score || 0,
        row.familiarity_score || 0,
      );
  }
}

export async function curateTracks(command: string) {
  const supabase = createAdminClient();
  const intent = detectMoodIntent(command);

  const { data: moodRows, error } = await supabase
    .from("track_mood_intelligence")
    .select(`
      discogs_release_id,
      position,
      title,
      mood,
      confidence,
      energy_score,
      reflection_score,
      grounding_score,
      focus_score,
      nostalgia_score,
      experimental_score,
      comfort_score,
      warmth_score,
      familiarity_score
    `)
    .limit(20000);

  if (error) {
    throw new Error(error.message);
  }

  const { data: trackRows } = await supabase
    .from("release_tracks")
    .select(`
      discogs_release_id,
      position,
      title,
      duration_seconds,
      duration_raw,
      artist_credit
    `)
    .limit(30000);

  const trackMap = new Map(
    (trackRows || []).map((track) => [
      `${track.discogs_release_id}::${track.position || ""}::${track.title}`,
      track,
    ]),
  );

  const ranked = ((moodRows || []) as MoodTrackRow[])
    .map((row) => {
      const key = `${row.discogs_release_id}::${row.position || ""}::${row.title}`;
      const sourceTrack = trackMap.get(key);

      const durationSeconds =
        sourceTrack?.duration_seconds ??
        row.duration_seconds ??
        null;

      const merged = {
        discogs_release_id: row.discogs_release_id,
        position: row.position,
        title: row.title || "Untitled",
        duration_seconds: durationSeconds,
        durationSeconds,
        duration_raw: sourceTrack?.duration_raw ?? null,
        artist_credit: sourceTrack?.artist_credit ?? null,
        artistCredit: sourceTrack?.artist_credit ?? null,
        mood:
          row.mood ||
          classifyTrackMood({
            title: row.title || "",
            artistCredit: sourceTrack?.artist_credit,
            durationSeconds,
          }),
        score:
          moodScore(row, intent) +
          Math.round((row.confidence || 0) / 10) +
          scoreTrackForIntent(
            {
              title: row.title || "",
              artistCredit: sourceTrack?.artist_credit,
              durationSeconds,
            },
            intent,
          ),
      };

      return merged;
    })
    .filter((track) => track.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);

  return {
    intent,
    tracks: ranked.slice(0, 25),
    session: buildListeningSession(ranked, intent),
  };
}
