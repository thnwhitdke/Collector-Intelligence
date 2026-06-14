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

function titleHas(title: string, terms: string[]) {
  return terms.some((term) => title.includes(term));
}

export function scoreTrackForIntent(track: TrackMoodInput, intent: MoodIntent) {
  const seconds = track.durationSeconds || 0;
  const title = track.title.toLowerCase();
  const artist = String(track.artistCredit || "").toLowerCase();

  let score = 0;

  const disqualifiers = [
    "interview",
    "documentary",
    "commentary",
    "commercial",
    "advert",
    "radio spot",
    "trailer",
  ];

  if (titleHas(title, disqualifiers)) return -100;

  if (intent.artistQuery && artist.includes(intent.artistQuery.toLowerCase())) {
    score += 25;
  }

  if (intent.maxDurationSeconds !== null && seconds > intent.maxDurationSeconds) {
    score -= 40;
  }

  if (intent.minDurationSeconds !== null && seconds < intent.minDurationSeconds) {
    score -= 40;
  }

  if (seconds > 0) score += 3;

  switch (intent.mood) {
    case "grounding":
      if (seconds > 0 && seconds <= 420) score += 8;
      if (titleHas(title, ["peace", "calm", "light", "morning", "garden", "water", "warm"])) score += 18;
      if (titleHas(title, ["home", "stay", "safe"])) score += 10;
      if (titleHas(title, ["easy"])) score += 4;
      if (titleHas(title, ["blackout", "dark", "shadow", "grief", "tears", "cry", "noise", "dub", "mix"])) score -= 25;
      break;

    case "late-night":
      if (seconds >= 180 && seconds <= 480) score += 10;
      if (titleHas(title, ["quiet", "slow", "light", "morning", "garden", "water", "drift", "dream"])) score += 14;
      if (titleHas(title, ["moon", "space"])) score += 3;
      if (titleHas(title, ["blackout", "dark", "shadow", "noise", "hard", "rock", "dance", "party"])) score -= 24;
      break;

    case "focus":
      if (titleHas(title, ["instrumental", "theme", "ambient", "suite", "sequence", "part", "sound"])) score += 25;
      if (seconds >= 150 && seconds <= 600) score += 12;
      if (titleHas(title, ["party", "dance", "scream", "cry", "tears", "interview"])) score -= 20;
      break;

    case "reflective":
      if (titleHas(title, ["memory", "time", "dream", "silence", "eyes", "soul", "garden"])) score += 18;
      if (titleHas(title, ["moon", "space"])) score += 8;
      if (titleHas(title, ["party", "dance", "rock", "noise"])) score -= 16;
      break;

    case "energy":
      if (titleHas(title, ["rock", "dance", "party", "swing", "drive", "fire", "power", "young"])) score += 22;
      if (seconds > 0 && seconds <= 300) score += 10;
      if (titleHas(title, ["sleep", "silence", "ambient", "theme"])) score -= 15;
      break;

    case "nostalgic":
      if (titleHas(title, ["time", "years", "young", "yesterday", "remember", "old", "again"])) score += 20;
      if (titleHas(title, ["noise", "dub", "remix"])) score -= 15;
      break;

    case "experimental":
      if (titleHas(title, ["dub", "mix", "remix", "version", "noise", "machine", "alternate", "demo"])) score += 22;
      break;

    case "immersive":
      if (seconds >= 420) score += 28;
      if (titleHas(title, ["suite", "part", "sequence", "journey", "space"])) score += 10;
      break;

    case "short-form":
      if (seconds > 0 && seconds <= 150) score += 40;
      break;

    case "melancholy":
      if (titleHas(title, ["blue", "sad", "lonely", "tears", "cry", "grief", "sorrow"])) score += 22;
      if (titleHas(title, ["party", "dance", "happy"])) score -= 15;
      break;

    case "catalog":
      score += 12;
      break;
  }

  return score;
}
