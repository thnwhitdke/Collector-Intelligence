import CINavigation from "@/app/components/CINavigation";
import { createAdminClient } from "@/src/lib/supabase/admin";
import {
  addFavoriteArtist,
  deleteFavoriteArtist,
  toggleFavoriteArtist,
} from "@/app/actions/favorite-artists";

export const dynamic = "force-dynamic";

type FavoriteArtist = {
  id: number;
  artist_name: string;
  active: boolean;
  created_at: string;
};

export default async function FavoriteArtistsPage() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("favorite_artists")
    .select("*")
    .order("artist_name", { ascending: true });

  const artists = (data || []) as FavoriteArtist[];

  const activeCount = artists.filter((artist) => artist.active).length;

  return (
    <main className="min-h-screen bg-[#050403] px-6 py-8 text-[#F4EFE6] lg:px-10">
      <CINavigation />

      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-[44px] border border-[#3A2A14] bg-[radial-gradient(circle_at_top_left,rgba(255,210,30,0.16),transparent_34%),linear-gradient(135deg,#170F08,#060403_54%,#130B05)] p-9 shadow-[0_24px_100px_rgba(0,0,0,.72)]">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#F4CD68]">
            Market Watchlist Control
          </p>

          <h1 className="mt-5 text-5xl font-black tracking-tight md:text-7xl">
            Favorite <span className="text-[#FFD21E]">Artists</span>
          </h1>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-[#B8AA96]">
            Control which artists Collector Intelligence watches for future
            market observations, external signals, opportunity alerts, and
            collector events.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Kpi label="Tracked Artists" value={String(artists.length)} />
            <Kpi label="Active Watches" value={String(activeCount)} />
            <Kpi label="Paused" value={String(artists.length - activeCount)} />
          </div>
        </section>

        <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D8B65A]">
            Add Artist
          </p>

          <form action={addFavoriteArtist} className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              name="artist_name"
              required
              placeholder="Example: Roxy Music"
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white outline-none focus:border-[#D8B65A]/60"
            />

            <button className="rounded-2xl bg-[#D8B65A] px-6 py-4 text-sm font-black text-black">
              Add Artist
            </button>
          </form>
        </section>

        {error ? (
          <div className="rounded-[28px] border border-red-500/25 bg-red-500/[0.08] p-6 text-red-100">
            {error.message}
          </div>
        ) : null}

        <section className="grid gap-4">
          {artists.map((artist) => (
            <article
              key={artist.id}
              className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-2xl font-black text-white">
                    {artist.artist_name}
                  </p>

                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#8E8170]">
                    {artist.active ? "Actively Watched" : "Paused"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <form action={toggleFavoriteArtist}>
                    <input type="hidden" name="id" value={artist.id} />
                    <input type="hidden" name="active" value={String(artist.active)} />
                    <button className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-3 text-sm font-black text-cyan-100">
                      {artist.active ? "Pause" : "Resume"}
                    </button>
                  </form>

                  <form action={deleteFavoriteArtist}>
                    <input type="hidden" name="id" value={artist.id} />
                    <button className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-black text-red-100">
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/25 p-5">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#8E8170]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}
