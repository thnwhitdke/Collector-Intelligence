import CINavigation from "@/app/components/CINavigation";
import { createAdminClient } from "@/src/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Check = {
  key: string;
  label: string;
  description: string;
  severity: "Critical" | "Warning" | "Monitor" | "Healthy";
  count: number;
};

function tone(severity: Check["severity"], count: number) {
  if (count === 0) return "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-100";
  if (severity === "Critical") return "border-red-500/30 bg-red-500/[0.09] text-red-100";
  if (severity === "Warning") return "border-orange-500/30 bg-orange-500/[0.09] text-orange-100";
  return "border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-100";
}

export default async function IntegrityCenterPage() {
  const supabase = createAdminClient();

  const { count: totalRecords } = await supabase
    .from("records_clean_safe")
    .select("id", { count: "exact", head: true });

  const { count: missingDiscogsId } = await supabase
    .from("records_clean_safe")
    .select("id", { count: "exact", head: true })
    .or("discogs_release_id.is.null,discogs_release_id.eq.");

  const { count: missingDiscogsUrl } = await supabase
    .from("records_clean_safe")
    .select("id", { count: "exact", head: true })
    .or("discogs_url.is.null,discogs_url.eq.");

  const { count: missingCover } = await supabase
    .from("records_clean_safe")
    .select("id", { count: "exact", head: true })
    .or("cover_url.is.null,cover_url.eq.")
    .or("discogs_image_url.is.null,discogs_image_url.eq.");

  const { count: missingCountry } = await supabase
    .from("records_clean_safe")
    .select("id", { count: "exact", head: true })
    .or("country.is.null,country.eq.");

  const { count: missingYear } = await supabase
    .from("records_clean_safe")
    .select("id", { count: "exact", head: true })
    .or("year_released.is.null,year_released.eq.");

  const { count: missingEstimatedValue } = await supabase
    .from("records_clean_safe")
    .select("id", { count: "exact", head: true })
    .or("estimated_value.is.null,estimated_value.eq.");

  const { data: mismatchData } = await supabase
    .from("records_clean_safe")
    .select("id, discogs_release_id, discogs_url");

  const urlIdMismatches = (mismatchData || []).filter((record) => {
    const url = String(record.discogs_url || "");
    const match = url.match(/\/release\/(\d+)/);
    if (!match) return false;
    return String(record.discogs_release_id || "").trim() !== match[1];
  }).length;

  const { data: valueData } = await supabase
    .from("records_clean_safe")
    .select("id, estimated_value, discogs_median_price");

  const valueMismatches = (valueData || []).filter((record) => {
    if (record.estimated_value === null || record.discogs_median_price === null) return false;
    const estimated = Number(String(record.estimated_value).replace(/[^0-9.]/g, ""));
    const median = Number(record.discogs_median_price);
    if (!Number.isFinite(estimated) || !Number.isFinite(median)) return false;
    return Math.abs(estimated - median) > 10;
  }).length;

  const { data: duplicateData } = await supabase
    .from("records_clean_safe")
    .select("discogs_release_id")
    .not("discogs_release_id", "is", null);

  const duplicateMap = new Map<string, number>();

  (duplicateData || []).forEach((record) => {
    const id = String(record.discogs_release_id || "").trim();
    if (!id) return;
    duplicateMap.set(id, (duplicateMap.get(id) || 0) + 1);
  });

  const duplicateReleaseGroups = Array.from(duplicateMap.values()).filter((count) => count > 1).length;

  const checks: Check[] = [
    {
      key: "discogs-id",
      label: "Missing Discogs ID",
      description: "Records without a Discogs release ID cannot reliably refresh market intelligence.",
      severity: "Critical",
      count: missingDiscogsId || 0,
    },
    {
      key: "discogs-url",
      label: "Missing Discogs URL",
      description: "Records without a Discogs URL lose direct auditability back to source.",
      severity: "Warning",
      count: missingDiscogsUrl || 0,
    },
    {
      key: "url-id",
      label: "URL / ID Mismatch",
      description: "Records where the Discogs URL release number does not match the stored release ID.",
      severity: "Critical",
      count: urlIdMismatches,
    },
    {
      key: "value-mismatch",
      label: "Value Mismatch",
      description: "Estimated value differs from Discogs median by more than $10.",
      severity: "Critical",
      count: valueMismatches,
    },
    {
      key: "cover",
      label: "Missing Cover Art",
      description: "Records without local or Discogs artwork.",
      severity: "Monitor",
      count: missingCover || 0,
    },
    {
      key: "duplicates",
      label: "Duplicate Release IDs",
      description: "Discogs release IDs appearing on more than one record. Some are legitimate duplicate copies.",
      severity: "Monitor",
      count: duplicateReleaseGroups,
    },
    {
      key: "country",
      label: "Missing Country",
      description: "Records missing country data weaken pressing and portfolio analysis.",
      severity: "Warning",
      count: missingCountry || 0,
    },
    {
      key: "year",
      label: "Missing Year",
      description: "Records missing release year weaken decade and historical valuation analysis.",
      severity: "Warning",
      count: missingYear || 0,
    },
    {
      key: "estimated-value",
      label: "Missing Estimated Value",
      description: "Records without estimated value are excluded from portfolio valuation totals.",
      severity: "Warning",
      count: missingEstimatedValue || 0,
    },
  ];

  const issueCount = checks.reduce((sum, check) => sum + check.count, 0);
  const criticalCount = checks
    .filter((check) => check.severity === "Critical")
    .reduce((sum, check) => sum + check.count, 0);

  const healthScore = Math.max(
    0,
    Math.round(100 - Math.min(100, (criticalCount / Math.max(Number(totalRecords || 1), 1)) * 100)),
  );

  return (
    <main className="min-h-screen bg-[#050403] px-6 py-8 text-[#F4EFE6] lg:px-10">
      <CINavigation />

      <div className="mx-auto flex max-w-[1600px] flex-col gap-8">
        <section className="rounded-[44px] border border-[#3A2A14] bg-[radial-gradient(circle_at_top_left,rgba(255,210,30,0.18),transparent_34%),linear-gradient(135deg,#170F08,#060403_54%,#130B05)] p-9 shadow-[0_24px_100px_rgba(0,0,0,.72)]">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#F4CD68]">
            Collection Integrity Center
          </p>

          <h1 className="mt-5 text-5xl font-black tracking-tight md:text-7xl">
            Database <span className="text-[#FFD21E]">Health</span>
          </h1>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-[#B8AA96]">
            Monitor data quality issues before they distort valuation,
            market intelligence, track intelligence, or acquisition signals.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Kpi label="Records" value={String(totalRecords || 0)} />
          <Kpi label="Health Score" value={`${healthScore}%`} />
          <Kpi label="Total Issues" value={String(issueCount)} />
          <Kpi label="Critical Issues" value={String(criticalCount)} />
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {checks.map((check) => (
            <article key={check.key} className={`rounded-[30px] border p-6 ${tone(check.severity, check.count)}`}>
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
            </article>
          ))}
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
