import Link from "next/link";
import CINavigation from "@/app/components/CINavigation";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { curateTracks } from "@/app/actions/mood-curation";

export const dynamic = "force-dynamic";

type TrackRow = {
  discogs_release_id: string;
  position: string | null;
  side: string | null;
  title: string;
  duration_raw: string | null;
  duration_seconds: number | null;
  artist_credit: string | null;
};

type RecordMatch = {
  id: number;
  artist: string | null;
  title: string | null;
  year_released: string | null;
  label: string | null;
  discogs_release_id: string | null;
  discogs_image_url: string | null;
  discogs_thumbnail_url: string | null;
  cover_url: string | null;
};

type RuntimeRow = {
  discogs_release_id: string;
  track_count: number;
  total_runtime_minutes: number | null;
  longest_track_seconds: number | null;
  shortest_track_seconds: number | null;
  average_track_minutes: number | null;
};

function formatArtistName(name: string | null | undefined) {
  const trimmed = String(name || "").trim();

  if (!trimmed.includes(",")) return trimmed || "Unknown Artist";

  const [last, ...rest] = trimmed.split(",");
  const first = rest.join(",").trim();

  if (!first || !last) return trimmed;

  return `${first} ${last}`.replace(/\s+/g, " ").trim();
}

function formatSeconds(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return "—";

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatMinutes(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${Number(value).toFixed(1)} min`;
}

function coverFor(record: RecordMatch | undefined) {
  return (
    record?.discogs_image_url ||
    record?.cover_url ||
    record?.discogs_thumbnail_url ||
    null
  );
}

const moodDefinitions = [
  {
    key: "immersive",
    label: "Immersive",
    description: "Longer tracks for deep listening.",
  },
  {
    key: "energy",
    label: "Energy",
    description: "Movement, rhythm, charge, and lift.",
  },
  {
    key: "reflective",
    label: "Reflective",
    description: "Memory, space, moonlight, and inward songs.",
  },
  {
    key: "short-form",
    label: "Short Form",
    description: "Brief tracks for quick listening shifts.",
  },
  {
    key: "melancholy",
    label: "Melancholy",
    description: "Blue, lonely, sad, and aching songs.",
  },
  {
    key: "focus",
    label: "Focus",
    description: "Instrumental, garden, ambient, and steady tracks.",
  },
  {
    key: "late-night",
    label: "Late Night",
    description: "Night, midnight, shadow, neon, and after-hours energy.",
  },
  {
    key: "grounding",
    label: "Grounding",
    description: "Calming, steady, warm, and stabilizing tracks.",
  },
  {
    key: "nostalgic",
    label: "Nostalgic",
    description: "Time, youth, memory, yesterday, and looking back.",
  },
  {
    key: "experimental",
    label: "Experimental",
    description: "Strange, dub, noise, version, and left-field tracks.",
  },
];

function moodKey(track: TrackRow) {
  const title = track.title.toLowerCase();
  const artist = String(track.artist_credit || "").toLowerCase();
  const text = `${title} ${artist}`;
  const seconds = track.duration_seconds || 0;

  if (seconds >= 420) return "immersive";
  if (seconds <= 150 && seconds > 0) return "short-form";

  if (
    ["blue", "lonely", "sad", "cry", "tears", "sorrow", "hurt", "winter"].some((term) =>
      text.includes(term),
    )
  ) {
    return "melancholy";
  }

  if (
    ["night", "midnight", "shadow", "neon", "blackout", "after", "dark"].some((term) =>
      text.includes(term),
    )
  ) {
    return "late-night";
  }

  if (
    ["dream", "memory", "moon", "space", "slip", "garden", "silence"].some((term) =>
      text.includes(term),
    )
  ) {
    return "reflective";
  }

  if (
    ["rock", "dance", "party", "swing", "young", "rebel", "heart", "beat"].some((term) =>
      text.includes(term),
    )
  ) {
    return "energy";
  }

  if (
    ["ambient", "instrumental", "garden", "moss", "theme", "water", "air"].some((term) =>
      text.includes(term),
    )
  ) {
    return "focus";
  }

  if (
    ["calm", "peace", "home", "earth", "warm", "safe", "easy"].some((term) =>
      text.includes(term),
    )
  ) {
    return "grounding";
  }

  if (
    ["time", "years", "youth", "young", "yesterday", "remember"].some((term) =>
      text.includes(term),
    )
  ) {
    return "nostalgic";
  }

  if (
    ["dub", "mix", "version", "noise", "strange", "secret", "machine"].some((term) =>
      text.includes(term),
    )
  ) {
    return "experimental";
  }

  return "catalog";
}

function moodHint(track: TrackRow) {
  return (
    moodDefinitions.find((mood) => mood.key === moodKey(track))?.label ||
    "Catalog"
  );
}

function matchesMood(track: TrackRow, selectedMood: string) {
  if (!selectedMood || selectedMood === "all") return true;
  return moodKey(track) === selectedMood;
}

function isUsableEpicTrack(track: TrackRow, record?: RecordMatch) {
  const title = track.title.toLowerCase();
  const artist = String(record?.artist || "").toLowerCase();
  const album = String(record?.title || "").toLowerCase();
  const position = String(track.position || "").toLowerCase();
  const seconds = track.duration_seconds || 0;

  if (!record) return false;
  if (seconds < 360) return false;
  if (seconds > 2400) return false;

  const text = `${title} ${artist} ${album} ${position}`;

  const excluded = [
    "documentary",
    "interview",
    "trailer",
    "video",
    "dvd",
    "commentary",
    "credits",
    "menu",
    "commercial",
    "advert",
    "film",
    "narrates",
    "narration",
    "spoken",
    "talks",
    "press conference",
    "radio interview",
    "rare interview",
  ];

  if (excluded.some((term) => text.includes(term))) return false;

  if (position.includes("dvd")) return false;

  const knownLongFormMusic = [
    "echoes",
    "supper",
    "dazed and confused",
    "thick as a brick",
    "sister ray",
    "interstellar overdrive",
    "dogs",
    "shine on you crazy diamond",
    "riders on the storm",
    "atlantis",
    "swastika girls",
    "heavenly music corporation",
    "from the isle of every where",
    "zero the hero",
    "grosses wasser",
    "why are we sleeping",
  ];

  if (knownLongFormMusic.some((term) => text.includes(term))) return true;

  const musicLikePosition =
    /^[a-h][0-9]?$/i.test(String(track.position || "")) ||
    /^[0-9]+-[0-9]+$/i.test(String(track.position || ""));

  return musicLikePosition;
}




function percent(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function nextTwoHourCronEta() {
  const now = new Date();
  const next = new Date(now);

  const currentHour = now.getHours();
  const nextEvenHour =
    currentHour % 2 === 0
      ? currentHour + 2
      : currentHour + 1;

  next.setHours(
    nextEvenHour,
    0,
    0,
    0,
  );

  const diffMs =
    next.getTime() -
    now.getTime();

  const totalMinutes =
    Math.max(
      0,
      Math.ceil(diffMs / 60000),
    );

  const hours =
    Math.floor(totalMinutes / 60);

  const minutes =
    totalMinutes % 60;

  if (hours <= 0)
    return `~${minutes}m`;

  if (minutes <= 0)
    return `~${hours}h`;

  return `~${hours}h ${minutes}m`;
}
async function getData(query: string) {
  const supabase = createAdminClient();

  const normalizedQuery = query.trim();

  let trackQuery = supabase
    .from("release_tracks")
    .select(`
      discogs_release_id,
      position,
      side,
      title,
      duration_raw,
      duration_seconds,
      artist_credit
    `)
    .order("discogs_release_id", { ascending: true })
    .order("track_number", { ascending: true })
    .limit(80);

  if (normalizedQuery) {
    trackQuery = supabase
      .from("release_tracks")
      .select(`
        discogs_release_id,
        position,
        side,
        title,
        duration_raw,
        duration_seconds,
        artist_credit
      `)
      .or(
        `title.ilike.%${normalizedQuery}%,artist_credit.ilike.%${normalizedQuery}%,discogs_release_id.ilike.%${normalizedQuery}%`,
      )
      .order("discogs_release_id", { ascending: true })
      .order("track_number", { ascending: true })
      .limit(80);
  }

  const [
    coverageResult,
    runtimeResult,
    trackResult,
    epicTrackResult,
    moodTrackResult,
  ] = await Promise.all([
    supabase
      .from("track_intelligence_coverage")
      .select("*")
      .single(),

    supabase
      .from("track_runtime_intelligence")
      .select("*")
      .order("total_runtime_minutes", { ascending: false })
      .limit(20),

    trackQuery,

    supabase
      .from("release_tracks")
      .select(`
        discogs_release_id,
        position,
        side,
        title,
        duration_raw,
        duration_seconds,
        artist_credit
      `)
      .not("duration_seconds", "is", null)
      .order("duration_seconds", { ascending: false })
      .limit(200),

    supabase
      .from("release_tracks")
      .select(`
        discogs_release_id,
        position,
        side,
        title,
        duration_raw,
        duration_seconds,
        artist_credit
      `)
      .not("duration_seconds", "is", null)
      .limit(5000),
  ]);

  const coverageStats = coverageResult.data ?? {
    track_count: 0,
    release_count: 0,
    total_collection: 0,
    indexed_today: 0,
  };

  const tracks = (trackResult.data ?? []) as TrackRow[];

  const runtimeRows = (runtimeResult.data ?? []) as RuntimeRow[];
  const epicTracks = (epicTrackResult.data ?? []) as TrackRow[];
  const moodTracks = (moodTrackResult.data ?? []) as TrackRow[];

  const releaseIds = Array.from(
    new Set(
      [
        ...tracks.map((track) => String(track.discogs_release_id)),
        ...epicTracks.map((track) => String(track.discogs_release_id)),
        ...moodTracks.slice(0, 250).map((track) => String(track.discogs_release_id)),
        ...runtimeRows.map((runtime) => String(runtime.discogs_release_id)),
      ].filter(Boolean),
    ),
  );

  const { data: records } = releaseIds.length
    ? await supabase
        .from("records_clean_safe")
        .select(`
          id,
          artist,
          title,
          year_released,
          label,
          discogs_release_id,
          discogs_image_url,
          discogs_thumbnail_url,
          cover_url
        `)
        .in("discogs_release_id", releaseIds)
    : { data: [] };

  const recordMap = new Map<string, RecordMatch>();

  const sortedRecords = (
    (records ?? []) as RecordMatch[]
  ).sort(
    (a, b) =>
      Number(b.id || 0) -
      Number(a.id || 0),
  );

  for (const record of sortedRecords) {
    if (!record.discogs_release_id) continue;

    const key = String(record.discogs_release_id);

    if (
      !recordMap.has(key) ||
      Number(record.id) >
        Number(
          recordMap.get(key)?.id || 0,
        )
    ) {
      recordMap.set(
        key,
        record,
      );
    }
  }

  return {
    trackCount: Number(coverageStats.track_count || 0),
    releaseCount: Number(coverageStats.release_count || 0),
    totalCollection: Number(coverageStats.total_collection || 0),
    indexedToday: Number(coverageStats.indexed_today || 0),
    runtimes: runtimeRows,
    tracks,
    epicTracks,
    moodTracks,
    recordMap,
  };
}

export default async function TrackIntelligencePage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    mood?: string;
    intent?: string;
  }>;
}) {
  const params = await searchParams;
  const query = params?.q ?? "";
  const selectedMood = params?.mood ?? "all";
  const moodIntentCommand = params?.intent?.trim() ?? "";

  const {
    trackCount,
    releaseCount,
    totalCollection,
    indexedToday,
    runtimes,
    tracks,
    epicTracks,
    moodTracks,
    recordMap,
  } = await getData(query);

  const commandResult =
    moodIntentCommand.length > 0
      ? await curateTracks(moodIntentCommand)
      : null;

  const uniqueReleaseResults = new Set(
    tracks.map((track) => track.discogs_release_id),
  ).size;


  const rawCoverage =
    totalCollection > 0
      ? (releaseCount / totalCollection) * 100
      : 0;

  const coverage = Math.min(100, rawCoverage);

  const surplusIndexed =
    Math.max(releaseCount - totalCollection, 0);

  const remaining =
    Math.max(
      totalCollection -
        releaseCount,
      0,
    );

  const estimatedDays =
    remaining === 0
      ? "Complete"
      : `~${Math.max(
          1,
          Math.ceil(
            remaining /
              Math.max(
                indexedToday,
                180,
              ),
          ),
        )} days`;

  const longestTrack = tracks
    .filter((track) => track.duration_seconds)
    .sort(
      (a, b) =>
        (b.duration_seconds || 0) -
        (a.duration_seconds || 0),
    )[0];

  const moodCounts = moodTracks.reduce(
    (acc, track) => {
      const mood = moodKey(track);
      acc[mood] = (acc[mood] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const moodRows = moodDefinitions
    .map((mood) => ({
      ...mood,
      count: moodCounts[mood.key] || 0,
    }))
    .sort((a, b) => b.count - a.count);

  const selectedMoodDefinition =
    moodDefinitions.find((mood) => mood.key === selectedMood) || null;

  const curatedMoodTracks = moodTracks
    .filter((track) => matchesMood(track, selectedMood))
    .filter((track) => track.duration_seconds && track.duration_seconds > 0)
    .slice(0, 24);

  const deepestAlbum = runtimes[0];
  const deepestAlbumRecord = deepestAlbum
    ? recordMap.get(String(deepestAlbum.discogs_release_id))
    : undefined;

  const averageAlbumRuntime =
    runtimes.length > 0
      ? runtimes.reduce(
          (sum, runtime) =>
            sum + Number(runtime.total_runtime_minutes || 0),
          0,
        ) / runtimes.length
      : 0;

  const filteredEpicTracks = epicTracks.filter((track) =>
    isUsableEpicTrack(
      track,
      recordMap.get(String(track.discogs_release_id)),
    ),
  );

  const longestIndexedTrack = filteredEpicTracks[0];
  const longestIndexedRecord = longestIndexedTrack
    ? recordMap.get(String(longestIndexedTrack.discogs_release_id))
    : undefined;

  return (
    <main className="min-h-screen bg-[#030303] px-6 py-6 text-zinc-100">
      <CINavigation />

      <section className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[38px] border border-[#2A2418] bg-gradient-to-br from-[#17120B] via-black to-[#050403] p-8 shadow-2xl">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.4em] text-[#D8B65A]">
            Music Knowledge Graph Layer
          </p>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
            <div>
              <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white md:text-6xl">
                Music Knowledge Graph
              </h1>

              <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-400">
                Search tracklists, inspect album sequencing, discover runtime behavior,
                and surface emerging mood intelligence across your private music archive.
              </p>
            </div>

            <div className="rounded-[30px] border border-cyan-500/15 bg-cyan-500/[0.04] p-6">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
                Engine Status
              </p>

              <p className="mt-3 text-4xl font-black text-white">
                LIVE
              </p>

              <p className="mt-2 text-sm text-zinc-400">
                {trackCount.toLocaleString()} tracks indexed across{" "}
                {releaseCount.toLocaleString()} releases with runtime
                intelligence.
              </p>
            </div>
          </div>

          <section className="mt-8 rounded-[34px] border border-[#3A2A18] bg-gradient-to-br from-[#120D08] via-[#080604] to-black p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#D8B65A]">
                  Live Indexing Engine
                </p>

                <h2 className="mt-2 text-3xl font-black text-white">
                  Autonomous Track Coverage
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-7 text-[#A99A84]">
                  Track indexing expands automatically through scheduled backfill jobs.
                  Refresh this page after cron runs to monitor growth in real time.
                </p>
              </div>

              <div className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                Healthy Autonomous Indexing
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-[26px] border border-[#2A2418] bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Tracks</p>
                <p className="mt-2 text-2xl font-black text-[#D8B65A]">
                  {trackCount.toLocaleString()}
                </p>
              </div>

              <div className="rounded-[26px] border border-[#2A2418] bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Runtime Releases</p>
                <p className="mt-2 text-2xl font-black text-white">
                  {releaseCount.toLocaleString()}
                </p>
              </div>

              <div className="rounded-[26px] border border-[#2A2418] bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Coverage</p>
                <p className="mt-2 text-2xl font-black text-[#D8B65A]">
                  {percent(coverage)}
                </p>
                {surplusIndexed > 0 ? (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                    +{surplusIndexed.toLocaleString()} surplus indexed
                  </p>
                ) : null}
              </div>

              <div className="rounded-[26px] border border-[#2A2418] bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Indexed Today</p>
                <p className="mt-2 text-2xl font-black text-white">
                  +{indexedToday.toLocaleString()}
                </p>
              </div>

              <div className="rounded-[26px] border border-[#2A2418] bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Next Sync</p>
                <p className="mt-2 text-2xl font-black text-white">
                  {nextTwoHourCronEta()}
                </p>
              </div>

              <div className="rounded-[26px] border border-[#2A2418] bg-black/25 p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">ETA</p>
                <p className="mt-2 text-2xl font-black text-[#D8B65A]">
                  {estimatedDays}
                </p>
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#241B13]">
              <div
                className="h-full rounded-full bg-[#D8B65A]"
                style={{
                  width: `${Math.max(
                    3,
                    Math.min(
                      100,
                      coverage,
                    ),
                  )}%`,
                }}
              />
            </div>
          </section>



          <form
            action="/collection/track-intelligence"
            className="mt-8"
          >
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search song, artist, release ID, mood hint..."
              className="w-full rounded-3xl border border-[#3A3020] bg-black/40 px-6 py-5 text-lg text-white outline-none focus:border-[#D8B65A]"
            />
          </form>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <Metric label="Tracks Indexed" value={trackCount.toLocaleString()} />
            <Metric label="Runtime Releases" value={releaseCount.toLocaleString()} />
            <Metric label="Current Results" value={tracks.length.toLocaleString()} />
            <Metric
              label="Release Matches"
              value={uniqueReleaseResults.toLocaleString()}
            />
          </div>

          <section className="mt-8 rounded-[34px] border border-fuchsia-500/15 bg-fuchsia-500/[0.04] p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-fuchsia-200">
                  Mood Intelligence
                </p>

                <h2 className="mt-2 text-3xl font-black text-white">
                  Emerging Listening Behavior
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
                  Early classification layer based on title language and runtime behavior.
                  This becomes the foundation for future mood matching and listening recommendations.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Dominant Mood
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {moodRows[0]?.label || "Building"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {moodRows.map((mood) => (
                <Link
                  key={mood.key}
                  href={`/collection/track-intelligence?mood=${mood.key}`}
                  className={`rounded-[26px] border p-4 transition hover:-translate-y-1 ${
                    selectedMood === mood.key
                      ? "border-fuchsia-300/40 bg-fuchsia-300/15"
                      : "border-[#2A2418] bg-black/25 hover:border-fuchsia-400/30"
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                    {mood.label}
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {mood.count.toLocaleString()}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">
                    {mood.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-8 rounded-[34px] border border-cyan-500/15 bg-cyan-500/[0.04] p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-200">
                  Mood Command Center
                </p>
                <h2 className="mt-2 text-3xl font-black text-white">
                  Tell Collector Intelligence How You Feel
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
                  Enter a feeling, listening need, or command. Collector Intelligence will translate it into a mood intent and curate tracks from your indexed collection.
                </p>
              </div>
            </div>

            <form
              action="/collection/track-intelligence"
              className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto]"
            >
              <input
                type="text"
                name="intent"
                defaultValue={moodIntentCommand}
                placeholder="Example: I feel anxious and need grounding..."
                className="rounded-3xl border border-cyan-500/20 bg-black/40 px-6 py-5 text-lg text-white outline-none focus:border-cyan-300"
              />
              <button className="rounded-3xl bg-cyan-300 px-7 py-5 text-sm font-black uppercase tracking-[0.18em] text-black">
                Curate
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-3">
              {[
                "I feel anxious and need grounding",
                "Give me energetic tracks under 4 minutes",
                "I need late night reflective songs",
                "I want strange experimental tracks",
                "Give me focus music for writing",
              ].map((prompt) => (
                <Link
                  key={prompt}
                  href={`/collection/track-intelligence?intent=${encodeURIComponent(prompt)}`}
                  className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs font-black text-cyan-100 hover:bg-cyan-500/20"
                >
                  {prompt}
                </Link>
              ))}
            </div>

            {commandResult ? (
              <div className="mt-6 rounded-[28px] border border-cyan-500/20 bg-black/30 p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                  Interpreted Mood
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {commandResult.intent.mood}
                </p>
                <p className="mt-2 text-sm leading-7 text-zinc-400">
                  {commandResult.intent.reason}
                </p>

                <div className="mt-5 grid gap-3">
                  {commandResult.tracks.slice(0, 12).map((track) => {
                    const record = recordMap.get(String(track.discogs_release_id));
                    const artwork = coverFor(record);

                    return (
                      <article
                        key={`command-${track.discogs_release_id}-${track.title}-${track.duration_raw}`}
                        className="rounded-2xl border border-white/10 bg-black/25 p-4"
                      >
                        <div className="grid grid-cols-[56px_1fr_90px] items-center gap-4">
                          {artwork ? (
                            <img
                              src={artwork}
                              alt={record?.title || track.title}
                              className="h-14 w-14 rounded-2xl object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-[10px] font-black tracking-[0.2em] text-[#D8B65A]">
                              CI
                            </div>
                          )}

                          <div>
                            <p className="font-black text-white">{track.title}</p>
                            <p className="mt-1 text-xs text-zinc-400">
                              {record
                                ? `${formatArtistName(record.artist)} — ${record.title}`
                                : `Release ${track.discogs_release_id}`}
                            </p>
                            <p className="mt-2 inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">
                              {track.mood} · Score {track.score}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                              Runtime
                            </p>
                            <p className="mt-1 text-lg font-black text-[#D8B65A]">
                              {track.duration_raw || formatSeconds(track.duration_seconds)}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>

          <section className="mt-8 rounded-[34px] border border-fuchsia-500/15 bg-black/25 p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-fuchsia-200">
                  Mood Curation
                </p>
                <h2 className="mt-2 text-3xl font-black text-white">
                  {selectedMoodDefinition
                    ? `${selectedMoodDefinition.label} Track Queue`
                    : "Dynamic Track Queue"}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
                  {selectedMoodDefinition
                    ? selectedMoodDefinition.description
                    : "Select a mood card above or search by song, artist, release ID, or mood hint."}
                </p>
              </div>

              {selectedMood !== "all" ? (
                <Link
                  href="/collection/track-intelligence"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white hover:bg-white/[0.08]"
                >
                  Clear Mood
                </Link>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3">
              {curatedMoodTracks.length > 0 ? (
                curatedMoodTracks.map((track) => {
                  const record = recordMap.get(String(track.discogs_release_id));
                  const artwork = coverFor(record);

                  return (
                    <article
                      key={`mood-${track.discogs_release_id}-${track.position}-${track.title}`}
                      className="rounded-2xl border border-white/10 bg-black/25 p-4"
                    >
                      <div className="grid grid-cols-[56px_1fr_90px] items-center gap-4">
                        {artwork ? (
                          <img
                            src={artwork}
                            alt={record?.title || track.title}
                            className="h-14 w-14 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-[10px] font-black tracking-[0.2em] text-[#D8B65A]">
                            CI
                          </div>
                        )}

                        <div>
                          <p className="font-black text-white">{track.title}</p>
                          <p className="mt-1 text-xs text-zinc-400">
                            {record
                              ? `${formatArtistName(record.artist)} — ${record.title}`
                              : `Release ${track.discogs_release_id}`}
                          </p>
                          <p className="mt-2 inline-flex rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-100">
                            {moodHint(track)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                            Runtime
                          </p>
                          <p className="mt-1 text-lg font-black text-[#D8B65A]">
                            {track.duration_raw || formatSeconds(track.duration_seconds)}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-zinc-400">
                  No tracks matched this mood yet.
                </div>
              )}
            </div>
          </section>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Longest Track"
            value={longestIndexedTrack ? formatSeconds(longestIndexedTrack.duration_seconds) : "—"}
          />
          <Metric
            label="Deepest Album"
            value={deepestAlbum ? `${deepestAlbum.track_count} tracks` : "—"}
          />
          <Metric
            label="Avg Album Runtime"
            value={averageAlbumRuntime ? formatMinutes(averageAlbumRuntime) : "—"}
          />
          <Metric
            label="Long-Form Track Signals"
            value={filteredEpicTracks.length.toLocaleString()}
          />
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-[34px] border border-[#2A2418] bg-[#11100D] p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-[#D8B65A]">
              Track Intelligence Signals
            </p>

            <h2 className="mt-2 text-3xl font-black text-white">
              Long-Form Track Signals
            </h2>

            <p className="mt-2 text-sm leading-7 text-zinc-400">
              Long-form music tracks between 6 and 40 minutes, filtered to suppress documentaries, interviews, video entries, narration, and Discogs metadata.
            </p>

            <div className="mt-6 grid gap-3">
              {filteredEpicTracks.slice(0, 20).map((track) => {
                const record = recordMap.get(String(track.discogs_release_id));
                const artwork = coverFor(record);

                return (
                  <article
                    key={`${track.discogs_release_id}-${track.position}-${track.title}`}
                    className="rounded-2xl border border-white/10 bg-black/25 p-4"
                  >
                    <div className="grid grid-cols-[64px_1fr_90px] gap-4 items-center">
                      {artwork ? (
                        <img
                          src={artwork}
                          alt={record?.title || track.title}
                          className="h-16 w-16 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-[10px] font-black tracking-[0.2em] text-[#D8B65A]">
                          CI
                        </div>
                      )}

                      <div>
                        <p className="font-black text-white">
                          {track.title}
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {record
                            ? `${formatArtistName(record.artist)} — ${record.title}`
                            : `Release ${track.discogs_release_id}`}
                        </p>
                        <p className="mt-2 inline-flex rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-fuchsia-100">
                          {moodHint(track)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                          Runtime
                        </p>
                        <p className="mt-1 text-xl font-black text-[#D8B65A]">
                          {track.duration_raw || formatSeconds(track.duration_seconds)}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-[34px] border border-[#2A2418] bg-[#11100D] p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-[#D8B65A]">
              Runtime Intelligence
            </p>

            <h2 className="mt-2 text-3xl font-black text-white">
              Largest Albums
            </h2>

            <p className="mt-2 text-sm leading-7 text-zinc-400">
              The deepest indexed releases in the archive by track count and runtime.
              This surfaces box sets, deluxe editions, live archives, and high-density releases.
            </p>

            <div className="mt-6 grid gap-3">
              {runtimes.slice(0, 20).map((runtime) => {
                const record = recordMap.get(String(runtime.discogs_release_id));

                return (
                  <article
                    key={runtime.discogs_release_id}
                    className="rounded-2xl border border-white/10 bg-black/25 p-4"
                  >
                    <div className="grid grid-cols-[64px_1fr_110px] gap-4 items-center">
                      {coverFor(record) ? (
                        <img
                          src={coverFor(record)!}
                          alt={record?.title || `Release ${runtime.discogs_release_id}`}
                          className="h-16 w-16 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-[10px] font-black tracking-[0.2em] text-[#D8B65A]">
                          CI
                        </div>
                      )}

                      <div>
                        <p className="font-black text-white">
                          {record?.title || `Release ${runtime.discogs_release_id}`}
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {record?.artist ? formatArtistName(record.artist) : "Unknown Artist"}
                        </p>
                        {record ? (
                          <Link
                            href={`/collection/${record.id}`}
                            className="mt-2 inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100"
                          >
                            Open CI Record
                          </Link>
                        ) : null}
                      </div>

                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                          Depth
                        </p>
                        <p className="mt-1 text-lg font-black text-[#D8B65A]">
                          {runtime.track_count} tracks
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {formatMinutes(runtime.total_runtime_minutes)}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-[#3A3020] bg-black/30 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-white">
        {value}
      </p>
    </div>
  );
}
