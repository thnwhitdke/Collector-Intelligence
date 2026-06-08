import CINavigation from "@/app/components/CINavigation";
import Link from "next/link";
import { createAdminClient } from "@/src/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  issue?: string;
}>;

type Check = {
  key: string;
  label: string;
  description: string;
  severity: "Critical" | "Warning" | "Monitor" | "Healthy";
  count: number;
};

type RecordRow = {
  id: number;
  artist: string | null;
  artist_canonical: string | null;
  title: string | null;
  discogs_release_id: string | null;
  discogs_url: string | null;
  cover_url: string | null;
  discogs_image_url: string | null;
  country: string | null;
  year_released: string | null;
  estimated_value: string | null;
  discogs_median_price: number | null;
};

function tone(severity: Check["severity"], count: number) {
  if (count === 0) return "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-100";
  if (severity === "Critical") return "border-red-500/30 bg-red-500/[0.09] text-red-100";
  if (severity === "Warning") return "border-orange-500/30 bg-orange-500/[0.09] text-orange-100";
  return "border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-100";
}

function money(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(parsed)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(parsed);
}

function urlReleaseId(url: string | null | undefined) {
  const match = String(url || "").match(/\/release\/(\d+)/);
  return match?.[1] || null;
}

function valueMismatch(record: RecordRow) {
  if (record.estimated_value === null || record.discogs_median_price === null) return false;

  const estimated = Number(String(record.estimated_value).replace(/[^0-9.]/g, ""));
  const median = Number(record.discogs_median_price);

  if (!Number.isFinite(estimated) || !Number.isFinite(median)) return false;

  return Math.abs(estimated - median) > 10;
}

function matchesIssue(record: RecordRow, issue: string, duplicateIds: Set<string>) {
  const discogsId = String(record.discogs_release_id || "").trim();
  const discogsUrl = String(record.discogs_url || "").trim();
  const parsedUrlId = urlReleaseId(record.discogs_url);

  switch (issue) {
    case "missing-discogs-id":
      return !discogsId;
    case "missing-discogs-url":
      return !discogsUrl;
    case "url-id-mismatch":
      return parsedUrlId !== null && discogsId !== parsedUrlId;
    case "value-mismatch":
      return valueMismatch(record);
    case "missing-cover":
      return !record.cover_url && !record.discogs_image_url;
    case "duplicate-release-id":
      return discogsId && duplicateIds.has(discogsId);
    case "missing-country":
      return !String(record.country || "").trim();
    case "missing-year":
      return !String(record.year_released || "").trim();
    case "missing-estimated-value":
      return !String(record.estimated_value || "").trim();
    default:
      return false;
  }
}

export default async function IntegrityCenterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const selectedIssue = params.issue || "";

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("records_clean_safe")
    .select(`
      id,
      artist,
      artist_canonical,
      title,
      discogs_release_id,
      discogs_url,
      cover_url,
      discogs_image_url,
      country,
      year_released,
      estimated_value,
      discogs_median_price
    `)
    .limit(10000);

  const records = (data || []) as RecordRow[];

  const duplicateMap = new Map<string, number>();
  records.forEach((record) => {
    const id = String(record.discogs_release_id || "").trim();
    if (!id) return;
    duplicateMap.set(id, (duplicateMap.get(id) || 0) + 1);
  });

  const duplicateIds = new Set(
    Array.from(duplicateMap.entries())
      .filter(([, count]) => count > 1)
      .map(([id]) => id),
  );

  const checks: Check[] = [
    {
      key: "missing-discogs-id",
      label: "Missing Discogs ID",
      description: "Records without a Discogs release ID cannot reliably refresh market intelligence.",
      severity: "Critical",
      count: records.filter((record) => matchesIssue(record, "missing-discogs-id", duplicateIds)).length,
    },
    {
      key: "missing-discogs-url",
      label: "Missing Discogs URL",
      description: "Records without a Discogs URL lose direct auditability back to source.",
      severity: "Warning",
      count: records.filter((record) => matchesIssue(record, "missing-discogs-url", duplicateIds)).length,
    },
    {
      key: "url-id-mismatch",
      label: "URL / ID Mismatch",
      description: "Records where the Discogs URL release number does not match the stored release ID.",
      severity: "Critical",
      count: records.filter((record) => matchesIssue(record, "url-id-mismatch", duplicateIds)).length,
    },
    {
      key: "value-mismatch",
      label: "Value Mismatch",
      description: "Estimated value differs from Discogs median by more than $10.",
      severity: "Critical",
      count: records.filter((record) => matchesIssue(record, "value-mismatch", duplicateIds)).length,
    },
    {
      key: "missing-cover",
      label: "Missing Cover Art",
      description: "Records without local or Discogs artwork.",
      severity: "Monitor",
      count: records.filter((record) => matchesIssue(record, "missing-cover", duplicateIds)).length,
    },
    {
      key: "duplicate-release-id",
      label: "Duplicate Release IDs",
      description: "Discogs release IDs appearing on more than one record. Some are legitimate duplicate copies.",
      severity: "Monitor",
      count: duplicateIds.size,
    },
    {
      key: "missing-country",
      label: "Missing Country",
      description: "Records missing country data weaken pressing and portfolio analysis.",
      severity: "Warning",
      count: records.filter((record) => matchesIssue(record, "missing-country", duplicateIds)).length,
    },
    {
      key: "missing-year",
      label: "Missing Year",
      description: "Records missing release year weaken decade and historical valuation analysis.",
      severity: "Warning",
      count: records.filter((record) => matchesIssue(record, "missing-year", duplicateIds)).length,
    },
    {
      key: "missing-estimated-value",
      label: "Missing Estimated Value",
      description: "Records without estimated value are excluded from portfolio valuation totals.",
      severity: "Warning",
      count: records.filter((record) => matchesIssue(record, "missing-estimated-value", duplicateIds)).length,
    },
  ];

  const selectedCheck = checks.find((check) => check.key === selectedIssue);
  const workQueue = selectedCheck
    ? records
        .filter((record) => matchesIssue(record, selectedCheck.key, duplicateIds))
        .slice(0, 100)
    : [];

  const issueCount = checks.reduce((sum, check) => sum + check.count, 0);
  const criticalCount = checks
    .filter((check) => check.severity === "Critical")
    .reduce((sum, check) => sum + check.count, 0);

  const healthScore = Math.max(
    0,
    Math.round(100 - Math.min(100, (criticalCount / Math.max(records.length || 1, 1)) * 100)),
  );

  return (
    <main className="min-h-screen bg-[#050403] px-6 py-8 text-[#F4EFE6] lg:px-10">
      <CINavigation />

      <div className="mx-auto flex max-w-[1700px] flex-col gap-8">
        <section className="rounded-[44px] border border-[#3A2A14] bg-[radial-gradient(circle_at_top_left,rgba(255,210,30,0.18),transparent_34%),linear-gradient(135deg,#170F08,#060403_54%,#130B05)] p-9 shadow-[0_24px_100px_rgba(0,0,0,.72)]">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#F4CD68]">
            Collection Integrity Center
          </p>

          <h1 className="mt-5 text-5xl font-black tracking-tight md:text-7xl">
            Database <span className="text-[#FFD21E]">Health</span>
          </h1>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-[#B8AA96]">
            Click any integrity card to open a live work queue of the records causing that issue.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Kpi label="Records" value={String(records.length)} />
          <Kpi label="Health Score" value={`${healthScore}%`} />
          <Kpi label="Total Issues" value={String(issueCount)} />
          <Kpi label="Critical Issues" value={String(criticalCount)} />
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {checks.map((check) => (
            <Link
              key={check.key}
              href={`/collection/integrity-center?issue=${check.key}`}
              className={`rounded-[30px] border p-6 transition hover:scale-[1.01] ${tone(check.severity, check.count)} ${
                selectedIssue === check.key ? "ring-2 ring-[#FFD21E]/50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em]">
                    {check.count === 0 ? "Healthy" : check.severity}
                  </p>

                  <h2 className="mt-3 text-2xl font-black text-white">
                    {check.label}
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-[#D8CDBE]">
                    {check.description}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-right">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#B8AA96]">
                    Count
                  </p>
                  <p className="mt-1 text-3xl font-black text-white">
                    {check.count}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </section>

        <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6">
          {selectedCheck ? (
            <>
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D8B65A]">
                    Integrity Work Queue
                  </p>

                  <h2 className="mt-3 text-3xl font-black text-white">
                    {selectedCheck.label}
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-[#B8AA96]">
                    Showing {workQueue.length} of {selectedCheck.count} affected records.
                  </p>
                </div>

                <Link
                  href="/collection/integrity-center"
                  className="rounded-2xl border border-white/10 bg-black/25 px-5 py-3 text-sm font-black text-[#F4CD68]"
                >
                  Clear Selection
                </Link>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[1000px] border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.22em] text-[#8E8170]">
                      <th className="px-4 py-2">Record</th>
                      <th className="px-4 py-2">Discogs ID</th>
                      <th className="px-4 py-2">URL ID</th>
                      <th className="px-4 py-2">Estimated</th>
                      <th className="px-4 py-2">Median</th>
                      <th className="px-4 py-2">Country</th>
                      <th className="px-4 py-2">Year</th>
                      <th className="px-4 py-2">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {workQueue.map((record) => (
                      <tr key={record.id} className="bg-black/25">
                        <td className="rounded-l-2xl px-4 py-4">
                          <p className="font-black text-white">
                            {record.artist_canonical || record.artist || "Unknown Artist"}
                          </p>
                          <p className="mt-1 text-sm text-[#B8AA96]">
                            {record.title || "Untitled"}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-[#D8CDBE]">
                          {record.discogs_release_id || "—"}
                        </td>
                        <td className="px-4 py-4 text-[#D8CDBE]">
                          {urlReleaseId(record.discogs_url) || "—"}
                        </td>
                        <td className="px-4 py-4 text-[#D8CDBE]">
                          {money(record.estimated_value)}
                        </td>
                        <td className="px-4 py-4 text-[#D8CDBE]">
                          {money(record.discogs_median_price)}
                        </td>
                        <td className="px-4 py-4 text-[#D8CDBE]">
                          {record.country || "—"}
                        </td>
                        <td className="px-4 py-4 text-[#D8CDBE]">
                          {record.year_released || "—"}
                        </td>
                        <td className="rounded-r-2xl px-4 py-4">
                          <Link
                            href={`/collection/${record.id}`}
                            className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-black text-cyan-100"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {workQueue.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-white/10 p-10 text-center text-[#B8AA96]">
                    No records currently match this integrity issue.
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="rounded-[28px] border border-dashed border-white/10 p-10 text-center">
              <p className="text-2xl font-black text-white">
                Select an Integrity Category
              </p>
              <p className="mt-3 text-sm text-[#B8AA96]">
                Click any card above to inspect the records behind that count.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-[#8E8170]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}
