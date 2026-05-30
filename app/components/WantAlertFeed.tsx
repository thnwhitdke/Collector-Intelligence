import { createAdminClient } from "@/src/lib/supabase/admin";

type Props = {
  userId: string | null;
};

function formatArtistName(name: string | null | undefined) {
  const trimmed = String(name || "").trim();
  if (!trimmed.includes(",")) return trimmed;

  const [last, ...rest] = trimmed.split(",");
  const first = rest.join(",").trim();

  return `${first} ${last}`.replace(/\s+/g, " ").trim();
}

export default async function WantAlertFeed({ userId }: Props) {
  if (!userId) return null;

  const supabase = createAdminClient();

  const { data: history } = await supabase
    .from("want_market_history")
    .select("id, want_id, signal, captured_at, lowest_price, for_sale")
    .eq("user_id", userId)
    .not("signal", "is", null)
    .order("captured_at", { ascending: false })
    .limit(8);

  if (!history?.length) return null;

  const wantIds = [...new Set(history.map((h) => h.want_id))];

  const { data: wants } = await supabase
    .from("want_list")
    .select("id, artist, title")
    .in("id", wantIds);

  const wantMap = new Map((wants || []).map((w) => [w.id, w]));

  return (
    <section className="mt-8 overflow-hidden rounded-[34px] border border-red-500/20 bg-gradient-to-r from-[#1A0C0C] via-[#140A0A] to-[#0C0808] shadow-[0_15px_60px_rgba(180,20,20,.18)]">
      <div className="flex items-center justify-between border-b border-red-500/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-400" />
          <p className="text-xs font-black uppercase tracking-[0.35em] text-red-300">
            Breaking Want Intelligence
          </p>
        </div>

        <p className="text-xs uppercase tracking-[0.2em] text-red-200/70">
          {history.length} live signals
        </p>
      </div>

      <div className="divide-y divide-white/[0.05]">
        {history.map((row) => {
          const want = wantMap.get(row.want_id);

          return (
            <div
              key={row.id}
              className="grid gap-3 px-6 py-4 md:grid-cols-[1fr_auto]"
            >
              <div>
                <p className="text-sm font-black text-[#F6E7C8]">
                  {row.signal}
                </p>

                <p className="mt-1 text-sm text-[#BCA98A]">
                  {formatArtistName(want?.artist)} — {want?.title || `Want #${row.want_id}`}
                </p>
              </div>

              <div className="text-right text-xs uppercase tracking-[0.18em] text-[#8F8170]">
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
