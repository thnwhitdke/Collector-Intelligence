"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";
import {
  detectMoodIntent,
  classifyTrackMood,
  scoreTrackForIntent,
} from "@/src/lib/track-mood-curation";
import { buildListeningSession } from "@/src/lib/session-generator";

export async function curateTracks(command: string) {
  const supabase = createAdminClient();
  const intent = detectMoodIntent(command);

  const { data: tracks, error } = await supabase
    .from("release_tracks")
    .select(`
      discogs_release_id,
      title,
      duration_seconds,
      duration_raw,
      artist_credit
    `)
    .limit(20000);

  if (error) {
    throw new Error(error.message);
  }

  const ranked = (tracks || [])
    .map((track) => ({
      ...track,
      mood: classifyTrackMood({
        title: track.title,
        artistCredit: track.artist_credit,
        durationSeconds: track.duration_seconds,
      }),
      score: scoreTrackForIntent(
        {
          title: track.title,
          artistCredit: track.artist_credit,
          durationSeconds: track.duration_seconds,
        },
        intent,
      ),
    }))
    .filter((track) => track.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);

  return {
    intent,
    tracks: ranked,
    session: buildListeningSession(ranked, intent),
  };
}
