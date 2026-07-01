import { createAdminClient } from "@/src/lib/supabase/admin";
import CandidateRow from "./CandidateRow";

export const dynamic = "force-dynamic";

function money(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function AuctionIntelligencePage() {
  const supabase = createAdminClient();

  const { data: candidates } = await supabase
    .from("market_evidence_review_queue")
    .select("*")
    
    .order("amount_usd", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-[#111] p-8 text-white">
      <h1 className="text-3xl font-black">Auction Intelligence Review</h1>
      <p className="mt-2 text-sm text-[#B8AA96]">
        Review unverified Popsike auction candidates.
      </p>

      <div className="mt-8 space-y-4">
        {(candidates ?? []).map((c: any) => (
          <CandidateRow key={c.id} candidate={c} />
        ))}
      </div>
    </main>
  );
}
