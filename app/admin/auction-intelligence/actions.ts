"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/src/lib/supabase/admin";

export async function reviewAuctionCandidate(
  id: number,
  decision: "accepted" | "rejected"
) {
  const supabase = createAdminClient();

  const accepted = decision === "accepted";

  await supabase
    .from("market_evidence")
    .update({
      evidence_type: accepted ? "verified_auction_sale" : "excluded_variant_sale",
      evidence_strength: accepted ? "gold" : "excluded",
      appraisal_eligible: accepted,
      notes: accepted
        ? "User approved this evidence as appraisal-eligible."
        : "User rejected this evidence as not appraisal-eligible.",
      metadata: {
        review_status: decision,
        reviewed_at: new Date().toISOString(),
        reviewed_by: "admin_review_queue",
      },
    })
    .eq("id", id);

  revalidatePath("/admin/auction-intelligence");
}
