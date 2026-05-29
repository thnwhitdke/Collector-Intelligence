import Link from "next/link";
import CINavigation from "@/app/components/CINavigation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../src/lib/supabase/server";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    missingOnly?: string;
    saved?: string;
  }>;
};

type RecordRow = {
  id: string;
  artist: string | null;
  title: string | null;
  year_released: string | number | null;
  label: string | null;
  catalogue_number: string | null;
  country: string | null;
  format: string | null;
  discogs_release_id: string | number | null;
  ebay_sold_comp_count: string | number | null;
  ebay_low_sold_price: string | number | null;
  ebay_median_sold_price: string | number | null;
  ebay_high_sold_price: string | number | null;
  ebay_last_sold_price: string | number | null;
  value_source: string | null;
  value_last_updated: string | null;
};

function cleanText(value: string | number | null | undefined): string {
  return String(value ?? "").trim();
}

function formatMoney(value: string | number | null | undefined): string {
  const text = cleanText(value);
  if (!text) return "—";

  const numeric = Number(text.replace(/[$,]/g, ""));
  if (!Number.isFinite(numeric)) return text;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(numeric);
}

function buildSearchText(record: RecordRow): string {
  return [
    record.artist,
    record.title,
    record.year_released,
    record.label,
    record.catalogue_number,
    record.format,
  ]
    .map(cleanText)
    .filter(Boolean)
    .join(" ");
}

function buildEbaySoldUrl(record: RecordRow): string {
  const params = new URLSearchParams();

  params.set("_nkw", buildSearchText(record));
  params.set("LH_Sold", "1");
  params.set("LH_Complete", "1");

  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}

function displayTitle(record: RecordRow): string {
  const artist = cleanText(record.artist);
  const title = cleanText(record.title);

  if (artist && title) return `${artist} — ${title}`;
  if (title) return title;
  if (artist) return artist;

  return "Untitled record";
}

async function saveEbayComp(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const recordId = cleanText(formData.get("record_id")?.toString());
  const returnTo = cleanText(formData.get("returnTo")?.toString());
  const priceRaw = cleanText(formData.get("sold_price")?.toString());
  const dateRaw = cleanText(formData.get("sold_date")?.toString());
  const urlRaw = cleanText(formData.get("sold_url")?.toString());
  const confidenceRaw = cleanText(formData.get("confidence")?.toString());
  const notesRaw = cleanText(formData.get("notes")?.toString());

  const priceNumber = priceRaw ? Number(priceRaw) : null;

  if (!recordId) {
    redirect("/collection/ebay-sold-comp-helper");
  }

  await supabase.from("record_ebay_comps").insert({
    record_id: Number(recordId),
    sold_price: Number.isFinite(priceNumber) ? priceNumber : null,
    sold_date: dateRaw || null,
    sold_url: urlRaw || null,
    confidence: confidenceRaw || null,
    notes: notesRaw || null,
  });

  revalidatePath("/collection");
  revalidatePath(`/collection/${recordId}`);
  revalidatePath("/collection/ebay-sold-comp-helper");

  const safeReturnTo = returnTo.startsWith("/collection/ebay-sold-comp-helper")
    ? returnTo
    : "/collection/ebay-sold-comp-helper";

  const separator = safeReturnTo.includes("?") ? "&" : "?";

  redirect(`${safeReturnTo}${separator}saved=${recordId}`);
}

export default async function Page({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const q = cleanText(params.q);
  const missingOnly = params.missingOnly !== "false";
  const saved = cleanText(params.saved);

  const returnParams = new URLSearchParams();

  if (q) returnParams.set("q", q);
  returnParams.set("missingOnly", missingOnly ? "true" : "false");

  const returnTo = `/collection/ebay-sold-comp-helper?${returnParams.toString()}`;

  const supabase = await createClient();

  let query = supabase
    .from("records_clean_safe")
    .select(
      "id, artist, title, year_released, label, catalogue_number, country, format, discogs_release_id, ebay_sold_comp_count, ebay_low_sold_price, ebay_median_sold_price, ebay_high_sold_price, ebay_last_sold_price, value_source, value_last_updated",
    )
    .order("artist", { ascending: true })
    .limit(75);

  if (q) {
    query = query.or(
      `artist.ilike.%${q}%,title.ilike.%${q}%,label.ilike.%${q}%,catalogue_number.ilike.%${q}%`,
    );
  }

  if (missingOnly) {
    query = query.or(
      "ebay_sold_comp_count.is.null,ebay_sold_comp_count.eq.0",
    );
  }

  const { data, error } = await query;
  const records = (data ?? []) as RecordRow[];

  return (
    <main className="min-h-screen bg-[#0f1411] px-6 py-8 text-stone-100">
      <CINavigation />
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[2rem] border border-stone-700 bg-[#151a16] p-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-amber-300">
            Collector Intelligence
          </p>

          <h1 className="text-3xl font-black">
            eBay Multi-Comp Value Helper
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Open prebuilt eBay sold searches, capture multiple sold comps per
            record, and let Supabase calculate low, median, high, last sold,
            comp count, and estimated value.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/collection"
              className="rounded-xl border border-stone-600 px-4 py-2 text-sm font-bold text-stone-100 transition hover:border-amber-300 hover:text-amber-200"
            >
              Back to Collection
            </Link>

            <Link
              href="/collection/value-queue"
              className="rounded-xl border border-amber-400/50 bg-amber-300 px-4 py-2 text-sm font-black text-stone-950 transition hover:bg-amber-200"
            >
              Value Queue
            </Link>
          </div>
        </header>

        {saved ? (
          <section className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-5 text-sm font-bold text-emerald-200">
            eBay comp saved. The record summary should now update through the
            multi-comp trigger.
          </section>
        ) : null}

        <section className="rounded-2xl border border-stone-700 bg-[#171b17] p-5">
          <form className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search artist, title, label, or catalog number..."
              className="rounded-xl border border-stone-700 bg-[#0f1411] px-4 py-3 text-sm text-stone-100 outline-none placeholder:text-stone-500"
            />

            <select
              name="missingOnly"
              defaultValue={missingOnly ? "true" : "false"}
              className="rounded-xl border border-stone-700 bg-[#0f1411] px-4 py-3 text-sm text-stone-100 outline-none"
            >
              <option value="true">Needs eBay comps only</option>
              <option value="false">Show all records</option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-black"
            >
              Filter
            </button>
          </form>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-500/40 bg-red-950/30 p-5 text-red-100">
            {error.message}
          </section>
        ) : null}

        <section className="grid gap-5">
          {records.map((record) => {
            const url = buildEbaySoldUrl(record);
            const compCount = Number(cleanText(record.ebay_sold_comp_count) || 0);
            const hasComps = compCount > 0;

            return (
              <article
                key={record.id}
                className="rounded-2xl border border-stone-700 bg-[#171b17] p-5"
              >
                <div className="grid gap-5 xl:grid-cols-[1fr_430px]">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span
                        className={
                          hasComps
                            ? "rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-200"
                            : "rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-200"
                        }
                      >
                        {hasComps ? `${compCount} comp(s)` : "Needs comps"}
                      </span>

                      {record.value_source ? (
                        <span className="rounded-full border border-stone-600 px-3 py-1 text-xs font-bold text-stone-300">
                          Source: {record.value_source}
                        </span>
                      ) : null}
                    </div>

                    <h2 className="text-xl font-black text-stone-50">
                      {displayTitle(record)}
                    </h2>

                    <p className="mt-2 text-sm text-stone-400">
                      {[
                        record.year_released ? `Year: ${record.year_released}` : "",
                        record.label ? `Label: ${record.label}` : "",
                        record.catalogue_number
                          ? `Cat #: ${record.catalogue_number}`
                          : "",
                        record.format ? `Format: ${record.format}` : "",
                        record.country ? `Country: ${record.country}` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <ValueBox
                        label="Low"
                        value={formatMoney(record.ebay_low_sold_price)}
                      />
                      <ValueBox
                        label="Median"
                        value={formatMoney(record.ebay_median_sold_price)}
                      />
                      <ValueBox
                        label="High"
                        value={formatMoney(record.ebay_high_sold_price)}
                      />
                      <ValueBox
                        label="Last Sold"
                        value={formatMoney(record.ebay_last_sold_price)}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-black"
                      >
                        Open eBay Sold Search
                      </a>

                      <Link
                        href={`/collection/${record.id}`}
                        className="rounded-xl border border-stone-600 px-4 py-2 text-sm font-bold text-stone-100"
                      >
                        Open Record
                      </Link>
                    </div>

                    {record.value_last_updated ? (
                      <p className="mt-4 text-xs text-stone-500">
                        Value last updated:{" "}
                        {new Date(record.value_last_updated).toLocaleString()}
                      </p>
                    ) : null}
                  </div>

                  <form
                    action={saveEbayComp}
                    className="rounded-2xl border border-stone-700 bg-[#0f1411] p-4"
                  >
                    <input type="hidden" name="record_id" value={record.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />

                    <h3 className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-amber-300">
                      Add New eBay Comp
                    </h3>

                    <div className="grid gap-3">
                      <label className="grid gap-1 text-xs font-bold text-stone-300">
                        Sold Price
                        <input
                          name="sold_price"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Example: 24.99"
                          className="rounded-xl border border-stone-700 bg-[#171b17] px-3 py-2 text-sm text-stone-100 outline-none"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-bold text-stone-300">
                        Sold Date
                        <input
                          name="sold_date"
                          type="date"
                          className="rounded-xl border border-stone-700 bg-[#171b17] px-3 py-2 text-sm text-stone-100 outline-none"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-bold text-stone-300">
                        Sold Listing URL
                        <input
                          name="sold_url"
                          type="url"
                          placeholder="Paste eBay sold listing URL"
                          className="rounded-xl border border-stone-700 bg-[#171b17] px-3 py-2 text-sm text-stone-100 outline-none"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-bold text-stone-300">
                        Confidence
                        <select
                          name="confidence"
                          className="rounded-xl border border-stone-700 bg-[#171b17] px-3 py-2 text-sm text-stone-100 outline-none"
                        >
                          <option value="">Select confidence</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </label>

                      <label className="grid gap-1 text-xs font-bold text-stone-300">
                        Notes
                        <textarea
                          name="notes"
                          rows={3}
                          placeholder="Example: same pressing, close condition, sealed mismatch, etc."
                          className="rounded-xl border border-stone-700 bg-[#171b17] px-3 py-2 text-sm text-stone-100 outline-none"
                        />
                      </label>

                      <button
                        type="submit"
                        className="mt-2 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-black text-stone-950"
                      >
                        Save Multi-Comp
                      </button>
                    </div>
                  </form>
                </div>
              </article>
            );
          })}
        </section>

        {!error && records.length === 0 ? (
          <section className="rounded-2xl border border-stone-700 bg-[#171b17] p-8 text-center">
            <h2 className="text-2xl font-black">No records found</h2>
            <p className="mt-2 text-stone-400">
              Try clearing the search or changing the filter to show all
              records.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function ValueBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-700 bg-[#0f1411] p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">
        {label}
      </div>

      <div className="mt-1 text-lg font-black text-stone-50">{value}</div>
    </div>
  );
}
