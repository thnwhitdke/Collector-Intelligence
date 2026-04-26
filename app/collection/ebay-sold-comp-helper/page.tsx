import Link from "next/link";
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
  ebay_sold_price: string | number | null;
  ebay_sold_date: string | null;
  ebay_sold_url: string | null;
  ebay_confidence: string | null;
};

function cleanText(value: string | number | null | undefined): string {
  return String(value ?? "").trim();
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

  const id = cleanText(formData.get("id")?.toString());
  const returnTo = cleanText(formData.get("returnTo")?.toString());
  const priceRaw = cleanText(formData.get("ebay_sold_price")?.toString());
  const dateRaw = cleanText(formData.get("ebay_sold_date")?.toString());
  const urlRaw = cleanText(formData.get("ebay_sold_url")?.toString());
  const confidenceRaw = cleanText(formData.get("ebay_confidence")?.toString());

  const priceNumber = priceRaw ? Number(priceRaw) : null;

  if (!id) {
    redirect("/collection/ebay-sold-comp-helper");
  }

  await supabase
    .from("records_clean_safe")
    .update({
      ebay_sold_price: Number.isFinite(priceNumber) ? priceNumber : null,
      ebay_sold_date: dateRaw || null,
      ebay_sold_url: urlRaw || null,
      ebay_confidence: confidenceRaw || null,
    })
    .eq("id", id);

  revalidatePath("/collection");
  revalidatePath(`/collection/${id}`);
  revalidatePath("/collection/ebay-sold-comp-helper");

  const safeReturnTo = returnTo.startsWith("/collection/ebay-sold-comp-helper")
    ? returnTo
    : "/collection/ebay-sold-comp-helper";

  const separator = safeReturnTo.includes("?") ? "&" : "?";

  redirect(`${safeReturnTo}${separator}saved=${id}`);
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
      "id, artist, title, year_released, label, catalogue_number, country, format, discogs_release_id, ebay_sold_price, ebay_sold_date, ebay_sold_url, ebay_confidence",
    )
    .order("artist", { ascending: true })
    .limit(75);

  if (q) {
    query = query.or(
      `artist.ilike.%${q}%,title.ilike.%${q}%,label.ilike.%${q}%,catalogue_number.ilike.%${q}%`,
    );
  }

  if (missingOnly) {
    query = query.is("ebay_sold_price", null).is("ebay_sold_url", null);
  }

  const { data, error } = await query;
  const records = (data ?? []) as RecordRow[];

  return (
    <main className="min-h-screen bg-[#0f1411] px-6 py-8 text-stone-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[2rem] border border-stone-700 bg-[#151a16] p-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-amber-300">
            Collector Intelligence
          </p>

          <h1 className="text-3xl font-black">
            eBay Sold-Comp Search Helper
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Open prebuilt eBay sold searches, review the sold listing, then save
            the price, date, listing URL, and confidence directly to Supabase.
          </p>
        </header>

        {saved ? (
          <section className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-5 text-sm font-bold text-emerald-200">
            eBay sold comp saved successfully.
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
              <option value="true">Needs eBay comp only</option>
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
            const hasComp = Boolean(record.ebay_sold_price || record.ebay_sold_url);

            return (
              <article
                key={record.id}
                className="rounded-2xl border border-stone-700 bg-[#171b17] p-5"
              >
                <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span
                        className={
                          hasComp
                            ? "rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-200"
                            : "rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-200"
                        }
                      >
                        {hasComp ? "Comp entered" : "Needs comp"}
                      </span>

                      {record.ebay_confidence ? (
                        <span className="rounded-full border border-stone-600 px-3 py-1 text-xs font-bold text-stone-300">
                          Confidence: {record.ebay_confidence}
                        </span>
                      ) : null}
                    </div>

                    <h2 className="text-lg font-bold">{displayTitle(record)}</h2>

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

                    <div className="mt-4 flex flex-wrap gap-3">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded bg-amber-300 px-4 py-2 font-bold text-black"
                      >
                        Search eBay Sold
                      </a>

                      <Link
                        href={`/collection/${record.id}`}
                        className="rounded border border-stone-600 px-4 py-2 font-bold text-stone-100"
                      >
                        Open Record
                      </Link>

                      {record.ebay_sold_url ? (
                        <a
                          href={record.ebay_sold_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-emerald-400/50 px-4 py-2 font-bold text-emerald-200"
                        >
                          Open Saved Comp
                        </a>
                      ) : null}
                    </div>

                    {hasComp ? (
                      <p className="mt-4 text-sm font-bold text-emerald-200">
                        Current comp:{" "}
                        {record.ebay_sold_price
                          ? `$${record.ebay_sold_price}`
                          : "Price not entered"}
                        {record.ebay_sold_date
                          ? ` · Sold date: ${record.ebay_sold_date}`
                          : ""}
                      </p>
                    ) : null}
                  </div>

                  <form
                    action={saveEbayComp}
                    className="rounded-2xl border border-stone-700 bg-[#0f1411] p-4"
                  >
                    <input type="hidden" name="id" value={record.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />

                    <h3 className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-amber-300">
                      Save eBay Comp
                    </h3>

                    <div className="grid gap-3">
                      <label className="grid gap-1 text-xs font-bold text-stone-300">
                        Sold Price
                        <input
                          name="ebay_sold_price"
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={cleanText(record.ebay_sold_price)}
                          placeholder="Example: 24.99"
                          className="rounded-xl border border-stone-700 bg-[#171b17] px-3 py-2 text-sm text-stone-100 outline-none"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-bold text-stone-300">
                        Sold Date
                        <input
                          name="ebay_sold_date"
                          type="date"
                          defaultValue={cleanText(record.ebay_sold_date)}
                          className="rounded-xl border border-stone-700 bg-[#171b17] px-3 py-2 text-sm text-stone-100 outline-none"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-bold text-stone-300">
                        Sold Listing URL
                        <input
                          name="ebay_sold_url"
                          type="url"
                          defaultValue={cleanText(record.ebay_sold_url)}
                          placeholder="Paste eBay sold listing URL"
                          className="rounded-xl border border-stone-700 bg-[#171b17] px-3 py-2 text-sm text-stone-100 outline-none"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-bold text-stone-300">
                        Confidence
                        <select
                          name="ebay_confidence"
                          defaultValue={cleanText(record.ebay_confidence)}
                          className="rounded-xl border border-stone-700 bg-[#171b17] px-3 py-2 text-sm text-stone-100 outline-none"
                        >
                          <option value="">Select confidence</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </label>

                      <button
                        type="submit"
                        className="mt-2 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-black text-stone-950"
                      >
                        Save Comp to Supabase
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