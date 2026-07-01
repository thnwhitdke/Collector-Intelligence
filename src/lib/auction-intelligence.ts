export type AuctionCandidateInput = {
  auctionTitle?: string | null;
  sourceRecordUrl?: string | null;
  recordTitle?: string | null;
  recordArtist?: string | null;
  catalogNumber?: string | null;
  label?: string | null;
  year?: string | number | null;
};

export type AuctionCandidateScore = {
  score: number;
  recommendation: "accept" | "reject" | "needs_review";
  reasons: string[];
  flags: string[];
};

function includesAny(haystack: string, terms: string[]) {
  return terms.some((term) => haystack.includes(term));
}

export function scoreAuctionCandidate(input: AuctionCandidateInput): AuctionCandidateScore {
  const text = `${input.auctionTitle ?? ""} ${input.sourceRecordUrl ?? ""}`.toLowerCase();
  const catalog = String(input.catalogNumber ?? "").toLowerCase().replace(/\s+/g, "");
  const year = String(input.year ?? "").trim();

  let score = 50;
  const reasons: string[] = [];
  const flags: string[] = [];

  if (catalog && text.replace(/\s+/g, "").includes(catalog)) {
    score += 25;
    reasons.push("Catalog number matched");
  }

  if (year && text.includes(year)) {
    score += 8;
    reasons.push("Release year matched");
  }

  if (includesAny(text, ["demo", "demonstration", "sample", "not for sale", "not-for-sale"])) {
    score += 25;
    reasons.push("Demo/sample language detected");
  }

  if (includesAny(text, ["promo", "promotional"])) {
    score += 12;
    reasons.push("Promotional language detected");
  }

  if (includesAny(text, ["reissue", "re-issue"])) {
    score -= 45;
    flags.push("Reissue indicator");
  }

  if (includesAny(text, ["without center", "w/o center", "wo center", "without-centre", "w/o centre", "wo centre"])) {
    score -= 35;
    flags.push("Missing center indicator");
  }

  if (includesAny(text, ["repro", "replica", "copy", "facsimile"])) {
    score -= 60;
    flags.push("Reproduction/copy indicator");
  }

  score = Math.max(0, Math.min(100, score));

  const recommendation =
    score >= 80 ? "accept" : score <= 35 ? "reject" : "needs_review";

  return { score, recommendation, reasons, flags };
}
