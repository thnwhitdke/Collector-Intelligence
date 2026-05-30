import { createClient } from "@/src/lib/supabase/server";

export default async function WantAlertFeed() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("want_market_history")
    .select(`
      signal,
      captured_at,
      want_id,
      discogs_release_id,
      want_list!inner(
        title,
        artist,
        user_id
      )
    `)
    .eq("user_id", user.id)
    .not("signal","is",null)
    .order("captured_at", {
      ascending:false,
    })
    .limit(8);

  if (!data?.length) return null;

  return (
    <section className="mt-8 overflow-hidden rounded-[34px] border border-red-500/15 bg-gradient-to-r from-[#1A0C0C] via-[#140A0A] to-[#0C0808] shadow-[0_15px_60px_rgba(180,20,20,.12)]">
      <div className="border-b border-red-500/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400 animate-pulse" />

          <p className="text-xs font-black uppercase tracking-[0.35em] text-red-300">
            Breaking Want Intelligence
          </p>
        </div>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {data.map((row, i) => {
          const want =
            Array.isArray(row.want_list)
              ? row.want_list[0]
              : row.want_list;

          return (
            <div
              key={i}
              className="flex flex-col gap-2 px-6 py-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="text-sm font-black text-[#F6E7C8]">
                  {row.signal}
                </div>

                <div className="mt-1 text-sm text-[#BCA98A]">
                  {want?.artist} — {want?.title}
                </div>
              </div>

              <div className="text-xs uppercase tracking-[0.2em] text-[#8F8170]">
                {new Date(
                  row.captured_at,
                ).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
