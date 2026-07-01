"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/src/lib/supabase/admin";

export async function reviewAuctionCandidate(
  id: number,
  decision: "accepted" | "rejected"
) {
  const supabase = createAdminClient();

  await supabase
    .from("external_market_comp_candidates")
    .update({
      review_status: decision,
      accepted_at: decision === "accepted" ? new Date().toISOString() : null,
      rejected_at: decision === "rejected" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  revalidatePath("/admin/auction-intelligence");
}
