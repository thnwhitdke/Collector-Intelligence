import {
  MoodIntent,
  TrackMoodInput,
  classifyTrackMood,
  scoreTrackForIntent,
} from "./track-mood-curation";

export type SessionStage =
  | "opening"
  | "deepening"
  | "peak"
  | "resolve";

export type SessionTrack<T> = T & {
  sessionStage: SessionStage;
  sessionReason: string;
  sessionScore: number;
};

export type ListeningSession<T> = {
  title: string;
  mood: MoodIntent["mood"];
  reason: string;
  estimatedRuntimeSeconds: number;
  stages: Array<{
    stage: SessionStage;
    label: string;
    purpose: string;
    tracks: Array<SessionTrack<T>>;
  }>;
};

function stageProfile(stage: SessionStage) {
  switch (stage) {
    case "opening":
      return {
        label: "Opening",
        purpose: "Ease into the listening state without overwhelming the mood.",
      };
    case "deepening":
      return {
        label: "Deepening",
        purpose: "Strengthen the emotional direction of the session.",
      };
    case "peak":
      return {
        label: "Peak",
        purpose: "Deliver the strongest expression of the selected mood.",
      };
    case "resolve":
      return {
        label: "Resolve",
        purpose: "Close the session with a more settled landing point.",
      };
  }
}

function stageScore(
  track: TrackMoodInput,
  intent: MoodIntent,
  stage: SessionStage,
) {
  const base = scoreTrackForIntent(track, intent);
  const seconds = track.durationSeconds || 0;
  const mood = classifyTrackMood(track);

  let bonus = 0;

  if (stage === "opening" && seconds > 0 && seconds <= 240) bonus += 12;
  if (stage === "deepening" && seconds >= 180 && seconds <= 420) bonus += 10;
  if (stage === "peak" && seconds >= 240) bonus += 14;
  if (stage === "resolve" && ["grounding", "reflective", "short-form"].includes(mood)) bonus += 12;

  return base + bonus;
}

function reasonForStage(stage: SessionStage, mood: MoodIntent["mood"]) {
  if (stage === "opening") return `Chosen as an accessible entry point into ${mood}.`;
  if (stage === "deepening") return `Chosen to deepen the ${mood} mood without jumping too sharply.`;
  if (stage === "peak") return `Chosen as one of the stronger ${mood} signals in the indexed collection.`;
  return `Chosen to help the session resolve instead of ending abruptly.`;
}

export function buildListeningSession<
  T extends TrackMoodInput & {
    discogs_release_id?: string | number | null;
    duration_seconds?: number | null;
  },
>(tracks: T[], intent: MoodIntent): ListeningSession<T> {
  const stages: SessionStage[] = ["opening", "deepening", "peak", "resolve"];
  const usedReleaseIds = new Set<string>();
  const usedTrackKeys = new Set<string>();

  const stageTargets: Record<SessionStage, number> = {
    opening: 3,
    deepening: 4,
    peak: 3,
    resolve: 2,
  };

  const sessionStages = stages.map((stage) => {
    const profile = stageProfile(stage);

    const ranked = [...tracks]
      .map((track) => ({
        track,
        score: stageScore(track, intent, stage),
      }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score);

    const selected: Array<SessionTrack<T>> = [];

    for (const row of ranked) {
      const releaseKey = String(row.track.discogs_release_id || "");
      const trackKey = `${releaseKey}-${row.track.title}`;

      if (usedTrackKeys.has(trackKey)) continue;

      if (
        releaseKey &&
        usedReleaseIds.has(releaseKey) &&
        selected.length < stageTargets[stage] - 1
      ) {
        continue;
      }

      selected.push({
        ...row.track,
        sessionStage: stage,
        sessionReason: reasonForStage(stage, intent.mood),
        sessionScore: row.score,
      });

      usedTrackKeys.add(trackKey);
      if (releaseKey) usedReleaseIds.add(releaseKey);

      if (selected.length >= stageTargets[stage]) break;
    }

    return {
      stage,
      label: profile.label,
      purpose: profile.purpose,
      tracks: selected,
    };
  });

  const estimatedRuntimeSeconds = sessionStages.reduce(
    (sum, stage) =>
      sum +
      stage.tracks.reduce(
        (stageSum, track) =>
          stageSum +
          Number(track.durationSeconds ?? track.duration_seconds ?? 0),
        0,
      ),
    0,
  );

  return {
    title:
      intent.mood === "catalog"
        ? "Catalog Discovery Session"
        : `${intent.mood.replace("-", " ")} listening session`,
    mood: intent.mood,
    reason: intent.reason,
    estimatedRuntimeSeconds,
    stages: sessionStages,
  };
}
