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
    const parsed = Number(value);
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

  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) return displayValue(value);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parsed);
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

          <div className="flex gap-2">
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
                </Grid>

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
                  label="eBay Last Sold"
                  value={money(getValue(record, "ebay_last_sold_price"))}
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