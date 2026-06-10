export type MoodKey =
  | "immersive"
  | "energy"
  | "reflective"
  | "short-form"
  | "melancholy"
  | "focus"
  | "late-night"
  | "grounding"
  | "nostalgic"
  | "experimental"
  | "catalog";

export type TrackMoodInput = {
  title: string;
  artistCredit?: string | null;
  durationSeconds?: number | null;
};

export type MoodIntent = {
  mood: MoodKey;
  artistQuery: string | null;
  maxDurationSeconds: number | null;
  minDurationSeconds: number | null;
  reason: string;
};

const moodAliases: Array<{
  mood: MoodKey;
  terms: string[];
  reason: string;
}> = [
  {
    mood: "grounding",
    terms: ["anxious", "anxiety", "overwhelmed", "stressed", "calm", "grounding", "settle", "steady"],
    reason: "Grounding tracks were selected because the prompt suggests a need for steadiness or emotional regulation.",
  },
  {
    mood: "energy",
    terms: ["energy", "energetic", "upbeat", "move", "moving", "workout", "drive", "dance", "hype"],
    reason: "Energy tracks were selected because the prompt asks for movement, lift, or activation.",
  },
  {
    mood: "focus",
    terms: ["focus", "study", "writing", "work", "deep work", "concentrate", "background"],
    reason: "Focus tracks were selected because the prompt suggests concentration or sustained attention.",
  },
  {
    mood: "late-night",
    terms: ["late night", "night", "midnight", "dark", "after hours"],
    reason: "Late-night tracks were selected because the prompt suggests nocturnal or after-hours listening.",
  },
  {
    mood: "melancholy",
    terms: ["sad", "blue", "lonely", "melancholy", "down", "grief"],
    reason: "Melancholy tracks were selected because the prompt suggests sadness, loneliness, or emotional heaviness.",
  },
  {
    mood: "reflective",
    terms: ["reflective", "think", "thinking", "memory", "quiet", "introspective", "reframe"],
    reason: "Reflective tracks were selected because the prompt suggests introspection or memory.",
  },
  {
    mood: "immersive",
    terms: ["immersive", "deep", "long", "album", "journey", "space out"],
    reason: "Immersive tracks were selected because the prompt suggests deeper, longer-form listening.",
  },
  {
    mood: "short-form",
    terms: ["short", "quick", "brief", "under 3", "under three", "fast"],
    reason: "Short-form tracks were selected because the prompt suggests brief listening.",
  },
  {
    mood: "nostalgic",
    terms: ["nostalgic", "nostalgia", "youth", "past", "remember", "old days"],
    reason: "Nostalgic tracks were selected because the prompt suggests memory, time, or looking back.",
  },
  {
    mood: "experimental",
    terms: ["weird", "strange", "experimental", "left field", "odd", "dub", "noise"],
    reason: "Experimental tracks were selected because the prompt asks for stranger or less conventional material.",
  },
];

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function classifyTrackMood(track: TrackMoodInput): MoodKey {
  const title = track.title.toLowerCase();
  const artist = String(track.artistCredit || "").toLowerCase();
  const text = `${title} ${artist}`;
  const seconds = track.durationSeconds || 0;

  if (seconds >= 420) return "immersive";
  if (seconds <= 150 && seconds > 0) return "short-form";

  if (includesAny(text, ["blue", "lonely", "sad", "cry", "tears", "sorrow", "hurt", "winter"])) return "melancholy";
  if (includesAny(text, ["night", "midnight", "shadow", "neon", "blackout", "after", "dark"])) return "late-night";
  if (includesAny(text, ["dream", "memory", "moon", "space", "slip", "garden", "silence"])) return "reflective";
  if (includesAny(text, ["rock", "dance", "party", "swing", "young", "rebel", "heart", "beat"])) return "energy";
  if (includesAny(text, ["ambient", "instrumental", "garden", "moss", "theme", "water", "air"])) return "focus";
  if (includesAny(text, ["calm", "peace", "home", "earth", "warm", "safe", "easy"])) return "grounding";
  if (includesAny(text, ["time", "years", "youth", "young", "yesterday", "remember"])) return "nostalgic";
  if (includesAny(text, ["dub", "mix", "version", "noise", "strange", "secret", "machine"])) return "experimental";

  return "catalog";
}

export function detectMoodIntent(command: string): MoodIntent {
  const text = command.trim().toLowerCase();

  let mood: MoodKey = "catalog";
  let reason = "No specific mood was detected, so the queue uses broad catalog discovery.";

  for (const alias of moodAliases) {
    if (includesAny(text, alias.terms)) {
      mood = alias.mood;
      reason = alias.reason;
      break;
    }
  }

  let maxDurationSeconds: number | null = null;
  let minDurationSeconds: number | null = null;

  const underMatch = text.match(/under\s+(\d+)\s*(min|minute|minutes)?/);
  if (underMatch) {
    maxDurationSeconds = Number(underMatch[1]) * 60;
  }

  if (text.includes("short")) {
    maxDurationSeconds = maxDurationSeconds ?? 180;
  }

  if (text.includes("long") || text.includes("immersive")) {
    minDurationSeconds = 360;
  }

  const artistMatch = text.match(/(?:by|from|artist)\s+([a-z0-9 '&.-]+)/);
  const artistQuery = artistMatch?.[1]?.trim() || null;

  return {
    mood,
    artistQuery,
    maxDurationSeconds,
    minDurationSeconds,
    reason,
  };
}

export function scoreTrackForIntent(track: TrackMoodInput, intent: MoodIntent) {
  let score = 0;

  const mood = classifyTrackMood(track);
  const seconds = track.durationSeconds || 0;
  const title = track.title.toLowerCase();
  const artist = String(track.artistCredit || "").toLowerCase();

  if (mood === intent.mood) score += 60;
  if (intent.mood === "catalog") score += 20;

  if (intent.artistQuery && artist.includes(intent.artistQuery.toLowerCase())) {
    score += 30;
  }

  if (intent.maxDurationSeconds !== null && seconds > intent.maxDurationSeconds) {
    score -= 50;
  }

  if (intent.minDurationSeconds !== null && seconds < intent.minDurationSeconds) {
    score -= 50;
  }

  if (title.includes("interview") || title.includes("documentary") || title.includes("commentary")) {
    score -= 100;
  }

  if (seconds > 0) score += 5;

  return score;
}
