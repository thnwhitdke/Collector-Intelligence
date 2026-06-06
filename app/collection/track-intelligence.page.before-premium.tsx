import Link from "next/link";
import CINavigation from "@/app/components/CINavigation";
import { createAdminClient } from "@/src/lib/supabase/admin";

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

function moodHint(track: TrackRow) {
  const title = track.title.toLowerCase();
  const seconds = track.duration_seconds || 0;

  if (
    title.includes("dream") ||
    title.includes("memory") ||
    title.includes("moon") ||
    title.includes("space")
  ) {
    return "Reflective";
  }

  if (
    title.includes("rock") ||
    title.includes("dance") ||
    title.includes("round") ||
    title.includes("heart")
  ) {
    return "Energy";
  }

  if (seconds >= 420) return "Immersive";
  if (seconds <= 150 && seconds > 0) return "Short Form";

  return "Catalog";
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
  ] = await Promise.all([
    supabase
      .from("track_intelligence_coverage")
      .select("*")
      .single(),

    supabase
      .from("track_runtime_intelligence")
      .select("*")
      .order("total_runtime_minutes", { ascending: false })
      .limit(8),

    trackQuery,
  ]);

  const coverageStats = coverageResult.data ?? {
    track_count: 0,
    release_count: 0,
    total_collection: 0,
    indexed_today: 0,
  };

  const tracks = (trackResult.data ?? []) as TrackRow[];

  const runtimeRows = (runtimeResult.data ?? []) as RuntimeRow[];

  const releaseIds = Array.from(
    new Set(
      [
        ...tracks.map((track) => String(track.discogs_release_id)),
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
    recordMap,
  };
}

export default async function TrackIntelligencePage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const query = params?.q ?? "";

  const {
    trackCount,
    releaseCount,
    totalCollection,
    indexedToday,
    runtimes,
    tracks,
    recordMap,
  } = await getData(query);

  const uniqueReleaseResults = new Set(
    tracks.map((track) => track.discogs_release_id),
  ).size;


  const coverage =
    totalCollection > 0
      ? (releaseCount / totalCollection) * 100
      : 0;

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

  return (
    <main className="min-h-screen bg-[#030303] px-6 py-6 text-zinc-100">
      <CINavigation />

      <section className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[38px] border border-[#2A2418] bg-gradient-to-br from-[#17120B] via-black to-[#050403] p-8 shadow-2xl">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.4em] text-[#D8B65A]">
            Music Intelligence Layer
          </p>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
            <div>
              <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white md:text-6xl">
                Track Intelligence Command Center
              </h1>

              <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-400">
                Search tracklists, discover playable records, inspect album
                sequencing, and begin building the mood intelligence layer
                across your private collection.
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
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[34px] border border-[#2A2418] bg-[#11100D] p-6">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[#D8B65A]">
                  Track Search Results
                </p>

                <h2 className="mt-2 text-3xl font-black text-white">
                  Playable Record Links
                </h2>
              </div>

              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Showing {tracks.length}
              </p>
            </div>

            <div className="grid gap-3">
              {tracks.map((track) => {
                const record = recordMap.get(
                  String(track.discogs_release_id),
                );

                const artwork = coverFor(record);

                return (
                  <article
                    key={`${track.discogs_release_id}-${track.position}-${track.title}`}
                    className="rounded-3xl border border-[#2A2418] bg-black/30 p-4"
                  >
                    <div className="grid gap-4 md:grid-cols-[74px_90px_1fr_110px_130px] md:items-center">
                      <div>
                        {artwork ? (
                          <img
                            src={artwork}
                            alt={record?.title || track.title}
                            className="h-[74px] w-[74px] rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="flex h-[74px] w-[74px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-xs text-zinc-500">
                            No Art
                          </div>
                        )}
                      </div>

                      <div className="font-mono font-bold text-[#D8B65A]">
                        {track.position ?? "—"}
                      </div>

                      <div>
                        <p className="text-xl font-black text-white">
                          {track.title}
                        </p>

                        <p className="mt-1 text-sm text-zinc-400">
                          {record
                            ? `${formatArtistName(record.artist)} — ${record.title}`
                            : `Release ${track.discogs_release_id}`}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-zinc-300">
                            {moodHint(track)}
                          </span>

                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-zinc-300">
                            Release {track.discogs_release_id}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#3A3020] px-4 py-3 text-center">
                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                          Runtime
                        </p>
                        <p className="mt-2 text-xl font-black text-white">
                          {track.duration_raw ||
                            formatSeconds(track.duration_seconds)}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        {record ? (
                          <Link
                            href={`/collection/${record.id}`}
                            className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-center text-xs font-black text-cyan-100"
                          >
                            Open CI Record
                          </Link>
                        ) : null}

                        <a
                          href={`https://www.discogs.com/release/${track.discogs_release_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl border border-[#4A3A1E] bg-[#15110C] px-4 py-3 text-center text-xs font-black text-[#D8B65A]"
                        >
                          Discogs
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}

              {tracks.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#3A3020] p-10 text-center text-zinc-500">
                  No songs matched your search.
                </div>
              ) : null}
            </div>
          </div>

          <aside className="grid gap-5">
            <section className="rounded-[34px] border border-[#2A2418] bg-[#11100D] p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-[#D8B65A]">
                Runtime Intelligence
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Longest Album Runtimes
              </h2>

              <div className="mt-5 grid gap-3">
                {runtimes.slice(0, 6).map((runtime) => {
                  const record = recordMap.get(
                    String(runtime.discogs_release_id),
                  );

                  return (
                    <div
                      key={runtime.discogs_release_id}
                      className="rounded-2xl border border-white/10 bg-black/25 p-4"
                    >
                      <div className="grid grid-cols-[64px_1fr] gap-4">
                        {coverFor(record) ? (
                          <img
                            src={coverFor(record)!}
                            alt={record?.title || `Release ${runtime.discogs_release_id}`}
                            className="h-16 w-16 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-[10px] text-zinc-500">
                            No Art
                          </div>
                        )}

                        <div>
                          <p className="text-sm font-black text-white">
                            {record?.title || `Release ${runtime.discogs_release_id}`}
                          </p>

                          <p className="mt-1 text-xs text-zinc-400">
                            {record?.artist ? formatArtistName(record.artist) : "Unknown Artist"}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            {runtime.track_count} tracks ·{" "}
                            {formatMinutes(runtime.total_runtime_minutes)}
                          </p>

                          {record ? (
                            <Link
                              href={`/collection/${record.id}`}
                              className="mt-3 inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100"
                            >
                              Open CI Record
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[34px] border border-fuchsia-500/15 bg-fuchsia-500/[0.04] p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-200">
                Mood Intelligence Preview
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Coming Online
              </h2>

              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Next layer: classify albums and tracks into playable moods like
                reflective, late-night, focused, energized, cinematic,
                melancholic, experimental, and comfort listening.
              </p>

              {longestTrack ? (
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Current Immersive Candidate
                  </p>

                  <p className="mt-2 font-black text-white">
                    {longestTrack.title}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {formatSeconds(longestTrack.duration_seconds)}
                  </p>
                </div>
              ) : null}
            </section>
          </aside>
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
