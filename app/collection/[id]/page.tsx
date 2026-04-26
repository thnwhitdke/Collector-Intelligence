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
import ValueIntelligencePanel from "../ValueIntelligencePanel";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
};

type RecordDetail = Record<string, string | number | boolean | null>;

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

type GridProps = {
  children: React.ReactNode;
};

type FieldProps = {
  label: string;
  name: string;
  defaultValue?: string | number | boolean | null;
  type?: string;
};

type TextAreaProps = {
  label: string;
  name: string;
  defaultValue?: string | number | boolean | null;
};

type SelectFieldProps = {
  label: string;
  name: string;
  defaultValue?: string | number | boolean | null;
};

type ReadProps = {
  label: string;
  value?: string | number | boolean | null;
};

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
    typeof value === "number" ? value : Number(String(value).replace(/[$,]/g, ""));

  if (!Number.isFinite(parsed)) return displayValue(value);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parsed);
}

function formatDate(value: string | number | boolean | null | undefined) {
  if (!value || typeof value === "boolean") return "Not available from Discogs API";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Not available from Discogs API";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getMarketSignal(forSale: number | null) {
  if (forSale === null) {
    return {
      label: "Market Status Unknown",
      description: "Current Discogs supply has not been pulled for this record yet.",
      className: "border-slate-500/30 bg-slate-500/10 text-slate-200",
    };
  }

  if (forSale <= 2) {
    return {
      label: "Thin Market",
      description: "Very few copies are currently listed. Scarcity may matter here.",
      className: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    };
  }

  if (forSale >= 30) {
    return {
      label: "Saturated Market",
      description: "Many copies are listed. Pricing may need to be competitive.",
      className: "border-slate-400/30 bg-slate-400/10 text-slate-100",
    };
  }

  if (forSale >= 10) {
    return {
      label: "Active Supply",
      description: "There is meaningful marketplace activity around this release.",
      className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    };
  }

  return {
    label: "Balanced Market",
    description: "Supply is present but not crowded.",
    className: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  };
}

export default async function RecordDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { returnTo } = await searchParams;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("records_clean_safe")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  const record = data as RecordDetail;
  const coverUrl = getText(record, "cover_url");
  const title = getText(record, "title") || "Untitled";
  const artist = getText(record, "artist") || "Unknown Artist";
  const forSale = getNumber(record, "discogs_for_sale");
  const marketSignal = getMarketSignal(forSale);

  return (
    <main className="min-h-screen bg-[#11100E] px-6 py-10 text-[#F4EFE6]">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Collector Archive
            </h1>
            <p className="text-sm text-[#B8AA96]">
              Record ID: {displayValue(getValue(record, "id"))}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={returnTo || "/collection"}
              className="rounded-xl border border-[#3A3328] px-4 py-2 text-sm hover:bg-[#1A1815]"
            >
              Back to Results
            </Link>

            <Link
              href="/collection"
              className="rounded-xl border border-[#8F6F35] px-4 py-2 text-sm text-[#C7A45D] hover:bg-[#221F1A]"
            >
              Full Collection
            </Link>

            <Link
              href="/collection/market-intelligence"
              className="rounded-xl border border-fuchsia-300/40 bg-fuchsia-300/10 px-4 py-2 text-sm text-fuchsia-100 hover:bg-fuchsia-300/20"
            >
              Market Intelligence
            </Link>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-2xl border border-[#3A3328] bg-[#1A1815] p-5 shadow-xl">
            <div className="relative overflow-hidden rounded-xl border border-[#3A3328] bg-black">
              {coverUrl ? (
                <Image
                  src={coverUrl}
                  alt={`${artist} - ${title}`}
                  width={600}
                  height={600}
                  className="aspect-square w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex aspect-square items-center justify-center text-sm text-[#8E8170]">
                  No Cover
                </div>
              )}
            </div>

            <div className="mt-4">
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-sm text-[#B8AA96]">{artist}</p>
            </div>

            <form action={refreshCoverFromDiscogs} className="mt-5">
              <input
                type="hidden"
                name="id"
                value={String(getValue(record, "id"))}
              />
              <button className="w-full rounded-xl bg-[#C7A45D] px-4 py-3 text-sm font-semibold text-black hover:bg-[#D8B86A]">
                Refresh Cover
              </button>
            </form>
          </div>

          <div className="space-y-6">
          <Section title="Market Intelligence">
              <form action={pullSingleDiscogsValue} className="mb-4">
                <input
                  type="hidden"
                  name="id"
                  value={String(getValue(record, "id"))}
                />
                <input
                  type="hidden"
                  name="releaseId"
                  value={getText(record, "discogs_release_id")}
                />

                <button type="submit" className="rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-400">
                  Pull Market Data (This Record)
                </button>
              </form>

              <div className="space-y-5">
                <div className={`rounded-2xl border px-5 py-4 ${marketSignal.className}`}>
                  <div className="text-sm font-bold">{marketSignal.label}</div>
                  <div className="mt-1 text-xs opacity-80">
                    {marketSignal.description}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <Read
                    label="Estimated Value"
                    value={money(getValue(record, "estimated_value"))}
                  />
                  <Read
                    label="Discogs Median"
                    value={money(getValue(record, "discogs_median_price"))}
                  />
                  <Read
                    label="Copies for Sale"
                    value={forSale === null ? "Not pulled yet" : forSale}
                  />
                  <Read
                    label="Discogs Low"
                    value={money(getValue(record, "discogs_low_price"))}
                  />
                  <Read
                    label="Discogs High"
                    value={money(getValue(record, "discogs_high_price"))}
                  />
                  <Read
                    label="Last Sold"
                    value={formatDate(getValue(record, "discogs_last_sold_date"))}
                  />
                  <Read
                    label="Value Source"
                    value={getValue(record, "value_source")}
                  />
                  <Read
                    label="Last Refreshed"
                    value={formatDate(getValue(record, "value_last_updated"))}
                  />
                  <Read
                    label="Discogs Release ID"
                    value={getValue(record, "discogs_release_id")}
                  />
                </div>
              </div>
            </Section>

            <ValueIntelligencePanel
              recordId={String(getValue(record, "id"))}
              discogsReleaseId={getText(record, "discogs_release_id") || null}
              purchasePrice={getNumber(record, "purchase_price")}
              estimatedValue={getNumber(record, "estimated_value")}
              lowPrice={getNumber(record, "discogs_low_price")}
              medianPrice={getNumber(record, "discogs_median_price")}
              highPrice={getNumber(record, "discogs_high_price")}
              valueLastUpdated={getText(record, "value_last_updated") || null}
            />

            <Section title="Release Details">
              <form action={updateReleaseDetails} className="space-y-4">
                <input
                  type="hidden"
                  name="id"
                  value={String(getValue(record, "id"))}
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
                    label="Catalogue #"
                    name="catalogue_number"
                    defaultValue={getValue(record, "catalogue_number")}
                  />
                  <Field
                    label="Year"
                    name="year_released"
                    defaultValue={getValue(record, "year_released")}
                  />
                  <Field
                    label="Country"
                    name="country"
                    defaultValue={getValue(record, "country")}
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

            <Section title="Grading & Manual Value Fields">
              <form action={updateCollectorDetails} className="space-y-5">
                <input
                  type="hidden"
                  name="id"
                  value={String(getValue(record, "id"))}
                />

                <Grid>
                  <SelectField
                    label="Media Grade"
                    name="media_grade"
                    defaultValue={getValue(record, "media_grade")}
                  />

                  <SelectField
                    label="Sleeve Grade"
                    name="sleeve_grade"
                    defaultValue={getValue(record, "sleeve_grade")}
                  />

                  <Field
                    label="Purchase Price"
                    name="purchase_price"
                    defaultValue={getValue(record, "purchase_price")}
                  />

                  <Field
                    label="Current Value"
                    name="current_value"
                    defaultValue={getValue(record, "current_value")}
                  />

                  <Field
                    label="eBay Last Sold"
                    name="ebay_last_sold_price"
                    defaultValue={getValue(record, "ebay_last_sold_price")}
                  />

                  <Field
                    label="eBay Last Sold Date"
                    name="ebay_last_sold_date"
                    defaultValue={getValue(record, "ebay_last_sold_date")}
                    type="date"
                  />

                  <Field
                    label="eBay Comp Count"
                    name="ebay_sold_comp_count"
                    defaultValue={getValue(record, "ebay_sold_comp_count")}
                  />

                  <Field
                    label="eBay Low Sold"
                    name="ebay_low_sold_price"
                    defaultValue={getValue(record, "ebay_low_sold_price")}
                  />

                  <Field
                    label="eBay Median Sold"
                    name="ebay_median_sold_price"
                    defaultValue={getValue(record, "ebay_median_sold_price")}
                  />

                  <Field
                    label="eBay High Sold"
                    name="ebay_high_sold_price"
                    defaultValue={getValue(record, "ebay_high_sold_price")}
                  />
                </Grid>

                <TextArea
                  label="eBay Notes / Source"
                  name="ebay_notes"
                  defaultValue={getValue(record, "ebay_notes")}
                />

                <TextArea
                  label="Grading Notes"
                  name="grading_notes"
                  defaultValue={getValue(record, "grading_notes")}
                />

                <SaveButton />
              </form>
            </Section>

            <Section title="Archive Snapshot">
              <div className="grid gap-3 md:grid-cols-2">
                <Read
                  label="Media Grade"
                  value={getValue(record, "media_grade")}
                />
                <Read
                  label="Sleeve Grade"
                  value={getValue(record, "sleeve_grade")}
                />
                <Read
                  label="Purchase Price"
                  value={money(getValue(record, "purchase_price"))}
                />
                <Read
                  label="Current Value"
                  value={money(getValue(record, "current_value"))}
                />
                <Read
                  label="Discogs Estimated Value"
                  value={money(getValue(record, "estimated_value"))}
                />
                <Read
                  label="Discogs Low"
                  value={money(getValue(record, "discogs_low_price"))}
                />
                <Read
                  label="Discogs Median"
                  value={money(getValue(record, "discogs_median_price"))}
                />
                <Read
                  label="Discogs High"
                  value={money(getValue(record, "discogs_high_price"))}
                />
                <Read
                  label="Discogs Copies for Sale"
                  value={forSale === null ? "Not pulled yet" : forSale}
                />
                <Read
                  label="Discogs Last Sold"
                  value={formatDate(getValue(record, "discogs_last_sold_date"))}
                />
                <Read
                  label="eBay Last Sold"
                  value={money(getValue(record, "ebay_last_sold_price"))}
                />
                <Read
                  label="eBay Last Sold Date"
                  value={getValue(record, "ebay_last_sold_date")}
                />
                <Read
                  label="eBay Comp Count"
                  value={getValue(record, "ebay_sold_comp_count")}
                />
                <Read
                  label="eBay Low Sold"
                  value={money(getValue(record, "ebay_low_sold_price"))}
                />
                <Read
                  label="eBay Median Sold"
                  value={money(getValue(record, "ebay_median_sold_price"))}
                />
                <Read
                  label="eBay High Sold"
                  value={money(getValue(record, "ebay_high_sold_price"))}
                />
                <Read
                  label="eBay Notes / Source"
                  value={getValue(record, "ebay_notes")}
                />
                <Read
                  label="Original Median Price"
                  value={money(getValue(record, "median_price"))}
                />
                <Read
                  label="Discogs Release ID"
                  value={getValue(record, "discogs_release_id")}
                />
                <Read
                  label="Value Source"
                  value={getValue(record, "value_source")}
                />
              </div>
            </Section>
          </div>
        </section>
      </div>
    </main>
  );
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="rounded-2xl border border-[#3A3328] bg-[#1A1815] p-5 shadow-lg">
      <h3 className="mb-4 text-lg font-semibold text-[#C7A45D]">{title}</h3>
      {children}
    </section>
  );
}

function Grid({ children }: GridProps) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function Field({ label, name, defaultValue, type = "text" }: FieldProps) {
  return (
    <label>
      <div className="mb-1 text-xs uppercase tracking-wide text-[#8E8170]">
        {label}
      </div>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue == null ? "" : String(defaultValue)}
        className="w-full rounded-xl border border-[#3A3328] bg-[#11100E] px-3 py-2 text-sm text-[#F4EFE6]"
      />
    </label>
  );
}

function SelectField({ label, name, defaultValue }: SelectFieldProps) {
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
      <div className="mb-1 text-xs uppercase tracking-wide text-[#8E8170]">
        {label}
      </div>
      <select
        name={name}
        defaultValue={defaultValue == null ? "" : String(defaultValue)}
        className="w-full rounded-xl border border-[#3A3328] bg-[#11100E] px-3 py-2 text-sm text-[#F4EFE6]"
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

function TextArea({ label, name, defaultValue }: TextAreaProps) {
  return (
    <label>
      <div className="mb-1 text-xs uppercase tracking-wide text-[#8E8170]">
        {label}
      </div>
      <textarea
        name={name}
        defaultValue={defaultValue == null ? "" : String(defaultValue)}
        rows={4}
        className="w-full rounded-xl border border-[#3A3328] bg-[#11100E] px-3 py-2 text-sm text-[#F4EFE6]"
      />
    </label>
  );
}

function SaveButton() {
  return (
    <button className="rounded-xl bg-[#C7A45D] px-4 py-2 text-sm font-semibold text-black">
      Save Changes
    </button>
  );
}

function Read({ label, value }: ReadProps) {
  return (
    <div className="rounded-xl border border-[#3A3328] bg-[#11100E] p-3">
      <div className="text-xs uppercase text-[#8E8170]">{label}</div>
      <div className="text-sm">{displayValue(value)}</div>
    </div>
  );
}
