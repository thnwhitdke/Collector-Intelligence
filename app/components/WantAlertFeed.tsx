import { createAdminClient } from "@/src/lib/supabase/admin";

type WantAlertFeedProps = {
  userId: string | null;
};

function formatArtistName(name: string | null | undefined) {
  const trimmed = String(name || "").trim();

  if (!trimmed.includes(",")) return trimmed;

  const [last, ...rest] = trimmed.split(",");
  const first = rest.join(",").trim();

  if (!first || !last) return trimmed;

  return `${first} ${last}`.replace(/\s+/g, " ").trim();
}

export default async function WantAlertFeed({
  userId,
}: WantAlertFeedProps) {
  if (!userId) return null;

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("want_market_history")
    .select(`
      signal,
      captured_at,
      want_id,
      discogs_release_id,
      want_list!inner(
        title,
        artist
      )
    `)
    .eq("user_id", userId)
    .not("signal", "is", null)
    .order("captured_at", {
      ascending: false,
    })
    .limit(8);

  if (!data?.length) return null;

  return (
    <section className="mt-8 overflow-hidden rounded-[34px] border border-red-500/15 bg-gradient-to-r from-[#1A0C0C] via-[#140A0A] to-[#0C0808] shadow-[0_15px_60px_rgba(180,20,20,.12)]">
      <div className="border-b border-red-500/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-400" />

          <p className="text-xs font-black uppercase tracking-[0.35em] text-red-300">
            Breaking Want Intelligence
          </p>
        </div>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {data.map((row, index) => {
          const want = Array.isArray(row.want_list)
            ? row.want_list[0]
            : row.want_list;

          return (
            <div
              key={`${row.want_id}-${row.captured_at}-${index}`}
              className="flex flex-col gap-2 px-6 py-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="text-sm font-black text-[#F6E7C8]">
                  {row.signal}
                </div>

                <div className="mt-1 text-sm text-[#BCA98A]">
                  {formatArtistName(want?.artist)} — {want?.title}
                </div>
              </div>

              <div className="text-xs uppercase tracking-[0.2em] text-[#8F8170]">
                {new Date(row.captured_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
