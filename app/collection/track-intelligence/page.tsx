import CINavigation from "@/app/components/CINavigation";
import { createAdminClient } from "@/src/lib/supabase/admin";

type Track = {
  discogs_release_id: string;
  position: string | null;
  side: string | null;
  track_number: number | null;
  title: string;
  duration_raw: string | null;
  duration_seconds: number | null;
  artist_credit: string | null;
};

type Runtime = {
  discogs_release_id: string;
  track_count: number;
  total_runtime_minutes: number | null;
  longest_track_seconds: number | null;
  shortest_track_seconds: number | null;
  average_track_minutes: number | null;
};

function formatSeconds(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return "—";

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatMinutes(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${Number(value).toFixed(2)} min`;
}

async function getData() {
  const supabase = createAdminClient();

  const { data: tracks } = await supabase
    .from("release_tracks")
    .select("*")
    .order("title", { ascending: true })
    .limit(500);

  const { data: runtimes } = await supabase
    .from("track_runtime_intelligence")
    .select("*")
    .order("total_runtime_minutes", { ascending: false })
    .limit(25);

  return {
    tracks: (tracks ?? []) as Track[],
    runtimes: (runtimes ?? []) as Runtime[],
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
  const query = (params?.q ?? "").toLowerCase().trim();

  const { tracks, runtimes } = await getData();

  const filteredTracks = query
    ? tracks.filter((track) => {
        return (
          track.title.toLowerCase().includes(query) ||
          (track.artist_credit ?? "")
            .toLowerCase()
            .includes(query) ||
          track.discogs_release_id
            .toLowerCase()
            .includes(query)
        );
      })
    : tracks;

  return (
    <main className="min-h-screen bg-[#030303] px-6 py-6 text-zinc-100">
      <CINavigation />

      <section className="mx-auto max-w-7xl">
        <div className="rounded-[36px] border border-[#2A2418] bg-gradient-to-br from-[#11100D] via-black to-[#080706] p-8 shadow-2xl">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.4em] text-[#D8B65A]">
            Music Intelligence Layer
          </p>

          <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white md:text-6xl">
            Song Intelligence Search
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-400">
            Search songs, artists, release IDs, runtime, and sequencing inside
            Collector Intelligence.
          </p>

          <form
            action="/collection/track-intelligence"
            className="mt-8"
          >
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search song, artist, release..."
              className="w-full rounded-3xl border border-[#3A3020] bg-black/40 px-6 py-5 text-lg text-white outline-none focus:border-[#D8B65A]"
            />
          </form>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-[#3A3020] bg-black/30 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                Tracks
              </p>
              <p className="mt-2 text-4xl font-black text-white">
                {tracks.length}
              </p>
            </div>

            <div className="rounded-3xl border border-[#3A3020] bg-black/30 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                Results
              </p>
              <p className="mt-2 text-4xl font-black text-white">
                {filteredTracks.length}
              </p>
            </div>

            <div className="rounded-3xl border border-[#3A3020] bg-black/30 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                Runtime Leader
              </p>
              <p className="mt-2 text-4xl font-black text-white">
                {formatMinutes(
                  runtimes[0]?.total_runtime_minutes
                )}
              </p>
            </div>

            <div className="rounded-3xl border border-[#3A3020] bg-black/30 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                Engine
              </p>
              <p className="mt-2 text-4xl font-black text-[#D8B65A]">
                LIVE
              </p>
            </div>
          </div>
        </div>

        <section className="mt-8 rounded-[32px] border border-[#2A2418] bg-[#11100D] p-6">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.25em] text-[#D8B65A]">
              Song Search Results
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Collection Music Search
            </h2>
          </div>

          <div className="grid gap-3">
            {filteredTracks.map((track) => (
              <div
                key={`${track.discogs_release_id}-${track.position}-${track.title}`}
                className="rounded-3xl border border-[#2A2418] bg-black/30 p-5"
              >
                <div className="grid gap-4 md:grid-cols-[90px_1fr_120px_120px]">
                  <div className="font-mono font-bold text-[#D8B65A]">
                    {track.position ?? "—"}
                  </div>

                  <div>
                    <p className="text-xl font-black text-white">
                      {track.title}
                    </p>

                    {track.artist_credit ? (
                      <p className="mt-1 text-sm text-zinc-500">
                        {track.artist_credit}
                      </p>
                    ) : null}

                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Release {track.discogs_release_id}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#3A3020] px-4 py-3 text-center">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Side
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {track.side ?? "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#3A3020] px-4 py-3 text-center">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Runtime
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">
                      {track.duration_raw ??
                        formatSeconds(track.duration_seconds)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {filteredTracks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#3A3020] p-10 text-center text-zinc-500">
                No songs matched your search.
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
