/* ============================================================================
   COLLECTOR INTELLIGENCE — PREMIUM RECORD INTELLIGENCE PROFILE
   FULL REPLACEMENT FILE
   app/collection/[id]/page.tsx
============================================================================ */

import { pullSingleDiscogsValue } from "../../actions/pull-single-discogs";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../src/lib/supabase/server";

import {
  refreshCoverFromDiscogs,
  updateCollectorDetails,
  updateReleaseDetails,
} from "../../actions/records";

import ValueIntelligenceCard from "../../components/ValueIntelligenceCard";
import ManualValueCompForm from "../../components/ManualValueCompForm";
import MarketplaceVerification from "../../components/MarketplaceVerification";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    returnTo?: string;
    q?: string;
    view?: string;
    preset?: string;
    sort?: string;
  }>;
};

type RecordDetail = Record<string, string | number | boolean | null>;

function getValue(record: RecordDetail, key: string) {
  return record[key] ?? null;
}

function getText(record: RecordDetail, key: string) {
  const value = getValue(record, key);
  if (value === null || value === undefined) return "";
  return String(value);
}

function getNumber(record: RecordDetail, key: string) {
  const value = getValue(record, key);

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function displayValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return "—";

  const text = String(value).trim();

  return text === "" ? "—" : text;
}

function money(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || typeof value === "boolean") {
    return "—";
  }

  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[$,]/g, ""));

  if (!Number.isFinite(parsed)) return displayValue(value);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parsed);
}

function formatDate(value: string | number | boolean | null | undefined) {
  if (!value || typeof value === "boolean") return "Not available";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getSafeReturnPath({
  returnTo,
  q,
  view,
  preset,
  sort,
}: {
  returnTo?: string;
  q?: string;
  view?: string;
  preset?: string;
  sort?: string;
}) {
  if (returnTo && returnTo.startsWith("/collection")) {
    return returnTo;
  }

  const params = new URLSearchParams();

  if (q && q.trim() !== "") {
    params.set("q", q);
  }

  if (preset && preset !== "all") {
    params.set("preset", preset);
  }

  if (sort && sort !== "id_desc") {
    params.set("sort", sort);
  }

  if (view && view !== "tiles") {
    params.set("view", view);
  }

  const queryString = params.toString();

  return queryString ? `/collection?${queryString}` : "/collection";
}

function getMarketSignal(forSale: number | null) {
  if (forSale === null) {
    return {
      label: "Market Status Unknown",
      description:
        "Current marketplace supply has not yet been analyzed.",
      className:
        "border-slate-500/30 bg-slate-500/10 text-slate-200",
    };
  }

  if (forSale <= 2) {
    return {
      label: "Thin Market",
      description:
        "Very few copies are currently listed. Scarcity may be significant.",
      className:
        "border-amber-400/30 bg-amber-400/10 text-amber-100",
    };
  }

  if (forSale >= 30) {
    return {
      label: "Saturated Market",
      description:
        "High active supply. Competitive pricing pressure may exist.",
      className:
        "border-slate-400/30 bg-slate-400/10 text-slate-100",
    };
  }

  if (forSale >= 10) {
    return {
      label: "Active Supply",
      description:
        "Healthy marketplace activity detected around this release.",
      className:
        "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    };
  }

  return {
    label: "Balanced Market",
    description:
      "Supply appears stable with moderate marketplace availability.",
    className:
      "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  };
}

export default async function RecordDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  const returnPath = getSafeReturnPath({
    returnTo: resolvedSearchParams.returnTo,
    q: resolvedSearchParams.q,
    view: resolvedSearchParams.view,
    preset: resolvedSearchParams.preset,
    sort: resolvedSearchParams.sort,
  });

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("records_clean_safe")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  const record = data as RecordDetail;

  const title = getText(record, "title") || "Untitled";
  const artist = getText(record, "artist") || "Unknown Artist";

  const coverUrl = getText(record, "cover_url");

  const estimatedValue = money(getValue(record, "estimated_value"));

  const forSale =
    getNumber(
      record,
      "market_num_for_sale"
    ) ??
    getNumber(
      record,
      "discogs_for_sale"
    );

  const marketSignal = getMarketSignal(forSale);

  const discogsReleaseId = getText(record, "discogs_release_id");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090909] text-[#F4EFE6]">
      {/* BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_35%)]" />

        <div className="absolute inset-0 opacity-[0.04]">
          <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:70px_70px]" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        {/* TOP NAV */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#D8B86A]">
              Collector Intelligence Profile
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              {title}
            </h1>

            <p className="mt-3 text-lg text-[#B8AA96]">
              {artist}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={returnPath}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm transition hover:bg-white/5"
            >
              Back to Collection
            </Link>

            <Link
              href="/collection"
              className="rounded-2xl border border-[#C7A45D]/30 bg-[#C7A45D]/10 px-5 py-3 text-sm text-[#D8B86A] transition hover:bg-[#C7A45D]/20"
            >
              Full Archive
            </Link>

            <Link
              href="/collection/market-intelligence"
              className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-400/10 px-5 py-3 text-sm text-fuchsia-100 transition hover:bg-fuchsia-400/20"
            >
              Market Intelligence
            </Link>
          </div>
        </div>

        {/* HERO */}
        <section className="grid gap-8 lg:grid-cols-[380px_1fr]">
          {/* LEFT */}
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-2xl">
              <div className="relative aspect-square bg-black">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={`${artist} - ${title}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#8E8170]">
                    No Cover Available
                  </div>
                )}
              </div>

              <div className="p-5">
                <form action={refreshCoverFromDiscogs}>
                  <input
                    type="hidden"
                    name="id"
                    value={String(getValue(record, "id"))}
                  />

                  <input
                    type="hidden"
                    name="returnTo"
                    value={returnPath}
                  />

                  <button className="w-full rounded-2xl bg-[#C7A45D] px-5 py-4 text-sm font-bold text-black transition hover:bg-[#D8B86A]">
                    Refresh Cover Artwork
                  </button>
                </form>
              </div>
            </div>

            {/* QUICK SIGNALS */}
            <div className="grid gap-4">
              <SignalCard
                label="Estimated Value"
                value={estimatedValue}
              />

              <SignalCard
                label="Market Momentum"
                value={displayValue(
                  getValue(record, "market_momentum")
                )}
              />

              <SignalCard
                label="Value Signal"
                value={displayValue(
                  getValue(record, "value_signal")
                )}
              />

              <SignalCard
                label="Collection IQ"
                value={displayValue(
                  getValue(record, "value_confidence_score")
                )}
              />
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-8">
            {/* MARKET STATUS */}
            <section
              className={`rounded-[32px] border p-6 backdrop-blur-xl ${marketSignal.className}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] opacity-70">
                    Market Status
                  </p>

                  <h2 className="mt-3 text-3xl font-black">
                    {marketSignal.label}
                  </h2>

                  <p className="mt-3 max-w-2xl text-sm leading-7 opacity-80">
                    {marketSignal.description}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/20 px-6 py-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                    Copies For Sale
                  </p>

                  <p className="mt-2 text-4xl font-black">
                    {forSale ?? "—"}
                  </p>
                </div>
              </div>
            </section>

            {/* VALUE INTELLIGENCE */}
            <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-2xl">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[#D8B86A]">
                  Value Intelligence
                </p>

                <h3 className="mt-3 text-3xl font-black">
                  Market Valuation Analysis
                </h3>
              </div>

              <ValueIntelligenceCard
                valueInput={{
                  discogsLowPrice: getNumber(
                    record,
                    "discogs_low_price"
                  ),
                  discogsMedianPrice: getNumber(
                    record,
                    "discogs_median_price"
                  ),
                  discogsHighPrice: getNumber(
                    record,
                    "discogs_high_price"
                  ),
                  ebayLastSoldPrice: getNumber(
                    record,
                    "ebay_last_sold_price"
                  ),
                  ebayAvgSoldPrice: getNumber(
                    record,
                    "ebay_avg_sold_price"
                  ),
                  ebaySoldCount: getNumber(
                    record,
                    "ebay_sold_count"
                  ),
                  manualCompPrice: getNumber(
                    record,
                    "manual_comp_price"
                  ),
                  purchasePrice: getNumber(
                    record,
                    "purchase_price"
                  ),
                  conditionGrade:
                    getText(record, "condition_grade") ||
                    getText(record, "media_grade") ||
                    null,
                  valueLastUpdated:
                    getText(record, "value_last_updated") ||
                    null,
                }}
              />
            </section>

            <MarketplaceVerification
  recordId={String(record.id)}
  releaseId={String(
    getText(
      record,
      "discogs_release_id"
    )
  )}
/>

            {/* MOMENTUM */}
            <section className="rounded-[32px] border border-cyan-400/20 bg-cyan-400/5 p-6">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Market Momentum Intelligence
                </p>

                <h3 className="mt-3 text-3xl font-black">
                  Trend & Supply Analysis
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <MomentumCard
                  label="Momentum"
                  value={displayValue(
                    getValue(record, "market_momentum")
                  )}
                />

                <MomentumCard
                  label="Trend"
                  value={displayValue(
                    getValue(record, "market_trend")
                  )}
                />

                <MomentumCard
                  label="Value Change %"
                  value={
                    getValue(
                      record,
                      "market_value_change_percent"
                    ) !== null
                      ? `${getValue(
                          record,
                          "market_value_change_percent"
                        )}%`
                      : "—"
                  }
                />

                <MomentumCard
                  label="Supply Change"
                  value={displayValue(
                    getValue(record, "market_supply_change")
                  )}
                />
              </div>
            </section>

            {/* MARKET ACTIONS */}
            <section className="rounded-[32px] border border-fuchsia-400/20 bg-fuchsia-400/5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-200">
                    Market Intelligence Engine
                  </p>

                  <h3 className="mt-3 text-3xl font-black">
                    Refresh Market Data
                  </h3>

                  <p className="mt-3 max-w-xl text-sm leading-7 text-white/70">
                    Pull fresh Discogs marketplace intelligence,
                    pricing analytics, and supply signals for this
                    release.
                  </p>
                </div>

                <form action={pullSingleDiscogsValue}>
                  <input
                    type="hidden"
                    name="id"
                    value={String(getValue(record, "id"))}
                  />

                  <input
                    type="hidden"
                    name="releaseId"
                    value={discogsReleaseId}
                  />

                  <input
                    type="hidden"
                    name="returnTo"
                    value={returnPath}
                  />

                  <button
                    type="submit"
                    disabled={!discogsReleaseId}
                    className="rounded-2xl bg-fuchsia-500 px-6 py-4 text-sm font-bold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:bg-neutral-700"
                  >
                    Pull Market Intelligence
                  </button>
                </form>
              </div>
            </section>

            {/* MANUAL COMPS */}
            <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur-xl">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[#D8B86A]">
                  Manual Value Intelligence
                </p>

                <h3 className="mt-3 text-3xl font-black">
                  Collector Value Comps
                </h3>
              </div>

              <ManualValueCompForm
                recordId={String(getValue(record, "id"))}
                currentValues={{
                  manualCompPrice: getNumber(
                    record,
                    "manual_comp_price"
                  ),
                  manualCompNote: getText(
                    record,
                    "manual_comp_note"
                  ),
                  ebayLastSoldPrice: getNumber(
                    record,
                    "ebay_last_sold_price"
                  ),
                  ebayAvgSoldPrice: getNumber(
                    record,
                    "ebay_avg_sold_price"
                  ),
                  ebaySoldCount: getNumber(
                    record,
                    "ebay_sold_count"
                  ),
                  ebayCompUrl: getText(
                    record,
                    "ebay_comp_url"
                  ),
                  conditionGrade:
                    getText(record, "condition_grade") ||
                    getText(record, "media_grade"),
                }}
              />
            </section>

            {/* RELEASE DETAILS */}
            <Section title="Release Details">
              <form action={updateReleaseDetails} className="space-y-5">
                <input
                  type="hidden"
                  name="id"
                  value={String(getValue(record, "id"))}
                />

                <input
                  type="hidden"
                  name="returnTo"
                  value={returnPath}
                />

                <Grid>
                  <Field
                    label="Artist"
                    name="artist"
                    defaultValue={getValue(record, "artist")}
                  />

                  <Field
                    label="Title"
                    name="title"
                    defaultValue={getValue(record, "title")}
                  />

                  <Field
                    label="Format"
                    name="format"
                    defaultValue={getValue(record, "format")}
                  />

                  <Field
                    label="Label"
                    name="label"
                    defaultValue={getValue(record, "label")}
                  />

                  <Field
                    label="Year"
                    name="year_released"
                    defaultValue={getValue(
                      record,
                      "year_released"
                    )}
                  />

                  <Field
                    label="Country"
                    name="country"
                    defaultValue={getValue(record, "country")}
                  />

                  <Field
                    label="Discogs Release ID"
                    name="discogs_release_id"
                    defaultValue={getValue(
                      record,
                      "discogs_release_id"
                    )}
                  />

                  <Field
                    label="Discogs URL"
                    name="discogs_url"
                    defaultValue={getValue(
                      record,
                      "discogs_url"
                    )}
                  />
                </Grid>

                <TextArea
                  label="Notes"
                  name="notes"
                  defaultValue={getValue(record, "notes")}
                />

                <SaveButton />
              </form>
            </Section>

            {/* COLLECTOR DETAILS */}
            <Section title="Collector Archive Details">
              <form action={updateCollectorDetails} className="space-y-5">
                <input
                  type="hidden"
                  name="id"
                  value={String(getValue(record, "id"))}
                />

                <input
                  type="hidden"
                  name="returnTo"
                  value={returnPath}
                />

                <Grid>
                  <SelectField
                    label="Media Grade"
                    name="media_grade"
                    defaultValue={getValue(
                      record,
                      "media_grade"
                    )}
                  />

                  <SelectField
                    label="Sleeve Grade"
                    name="sleeve_grade"
                    defaultValue={getValue(
                      record,
                      "sleeve_grade"
                    )}
                  />

                  <Field
                    label="Purchase Price"
                    name="purchase_price"
                    defaultValue={getValue(
                      record,
                      "purchase_price"
                    )}
                  />

                  <Field
                    label="Current Value"
                    name="current_value"
                    defaultValue={getValue(
                      record,
                      "current_value"
                    )}
                  />
                </Grid>

                <TextArea
                  label="Collector Notes"
                  name="grading_notes"
                  defaultValue={getValue(
                    record,
                    "grading_notes"
                  )}
                />

                <SaveButton />
              </form>
            </Section>

            {/* SNAPSHOT */}
            <Section title="Archive Snapshot">
              <div className="grid gap-4 md:grid-cols-3">
                <Read
                  label="Estimated Value"
                  value={estimatedValue}
                />

                <Read
                  label="Discogs Median"
                  value={money(
                    getValue(record, "discogs_median_price")
                  )}
                />

                <Read
                  label="Discogs High"
                  value={money(
                    getValue(record, "discogs_high_price")
                  )}
                />

                <Read
                  label="Discogs Low"
                  value={money(
                    getValue(record, "discogs_low_price")
                  )}
                />

                <Read
                  label="Last Sold"
                  value={formatDate(
                    getValue(
                      record,
                      "discogs_last_sold_date"
                    )
                  )}
                />

                <Read
                  label="Copies For Sale"
                  value={forSale ?? "—"}
                />

                <Read
                  label="Value Source"
                  value={getValue(record, "value_source")}
                />

                <Read
                  label="Last Refreshed"
                  value={formatDate(
                    getValue(record, "value_last_updated")
                  )}
                />

                <Read
                  label="Discogs Release ID"
                  value={getValue(
                    record,
                    "discogs_release_id"
                  )}
                />
              </div>
            </Section>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ============================================================================
   UI COMPONENTS
============================================================================ */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur-xl">
      <h3 className="mb-6 text-2xl font-black tracking-tight text-[#F4EFE6]">
        {title}
      </h3>

      {children}
    </section>
  );
}

function Grid({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="grid gap-5 md:grid-cols-2">{children}</div>;
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string | number | boolean | null;
  type?: string;
}) {
  return (
    <label>
      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[#8E8170]">
        {label}
      </div>

      <input
        type={type}
        name={name}
        defaultValue={
          defaultValue == null ? "" : String(defaultValue)
        }
        className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white outline-none transition focus:border-[#C7A45D]/60"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | boolean | null;
}) {
  return (
    <label>
      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[#8E8170]">
        {label}
      </div>

      <textarea
        rows={5}
        name={name}
        defaultValue={
          defaultValue == null ? "" : String(defaultValue)
        }
        className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white outline-none transition focus:border-[#C7A45D]/60"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | boolean | null;
}) {
  const grades = [
    "",
    "Mint",
    "Near Mint",
    "NM",
    "VG+",
    "VG",
    "Good",
    "Fair",
    "Poor",
  ];

  return (
    <label>
      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[#8E8170]">
        {label}
      </div>

      <select
        name={name}
        defaultValue={
          defaultValue == null ? "" : String(defaultValue)
        }
        className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white outline-none transition focus:border-[#C7A45D]/60"
      >
        {grades.map((grade) => (
          <option key={grade} value={grade}>
            {grade || "Select Grade"}
          </option>
        ))}
      </select>
    </label>
  );
}

function SaveButton() {
  return (
    <button className="rounded-2xl bg-[#C7A45D] px-6 py-4 text-sm font-black text-black transition hover:bg-[#D8B86A]">
      Save Changes
    </button>
  );
}

function Read({
  label,
  value,
}: {
  label: string;
  value?: string | number | boolean | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[#8E8170]">
        {label}
      </div>

      <div className="mt-3 text-sm leading-7 text-white">
        {value == null || value === ""
          ? "—"
          : String(value)}
      </div>
    </div>
  );
}

function SignalCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl backdrop-blur-xl">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#8E8170]">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black">
        {value}
      </p>
    </div>
  );
}

function MomentumCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-xl font-black text-white">
        {value}
      </p>
    </div>
  );
}