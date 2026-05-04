import Link from "next/link";
import { createClient } from "../../../src/lib/supabase/server";
import AddRecordForm from "../../components/AddRecordForm";
import { getSavedViews, type SavedViewRow } from "../../actions/records";
import { getCollectionValueSummary } from "../../actions/value-summary";
import { getValueRankings } from "../../actions/value-rankings";
import CollectionValueBar from "../CollectionValueBar";
import TopValueRecordsPanel from "../TopValueRecordsPanel";
import { CollectionUI, type CollectionRecord } from "../ui";
import ScrollRestorer from "../ScrollRestorer";

type CollectionPageProps = {
  searchParams?: Promise<{
    sort?: string;
    q?: string;
    preset?: string;
    view?: string;
  }>;
};

export type SavedViewPreset =
  | "all"
  | "missing_covers"
  | "missing_discogs"
  | "review_queue"
  | "needs_pricing"
  | "needs_year"
  | "exceptions"
  | "high_confidence"
  | "medium_confidence"
  | "low_confidence"
  | "needs_verification";

type ViewMode = "tiles" | "grid" | "list";

type SupabaseErrorLike = {
  message?: string | null;
};

type SupabaseQueryResult<T> = {
  data?: T[] | null;
  count?: number | null;
  error?: SupabaseErrorLike | null;
};

type SupabaseQueryLike<T> = PromiseLike<SupabaseQueryResult<T>> & {
  eq: (column: string, value: string) => SupabaseQueryLike<T>;
  or: (filters: string) => SupabaseQueryLike<T>;
  ilike: (column: string, pattern: string) => SupabaseQueryLike<T>;
  order: (
    column: string,
    options: { ascending: boolean },
  ) => SupabaseQueryLike<T>;
  limit: (count: number) => Promise<SupabaseQueryResult<T>>;
};

const SORT_OPTIONS = [
  { value: "id_desc", label: "Date Added / ID Newest" },
  { value: "id_asc", label: "Date Added / ID Oldest" },
  { value: "artist_asc", label: "Artist A–Z" },
  { value: "artist_desc", label: "Artist Z–A" },
  { value: "title_asc", label: "Title A–Z" },
  { value: "title_desc", label: "Title Z–A" },
  { value: "year_desc", label: "Year Newest" },
  { value: "year_asc", label: "Year Oldest" },
] as const;

function normalizePreset(value?: string): SavedViewPreset {
  switch (value) {
    case "missing_covers":
    case "missing_discogs":
    case "review_queue":
    case "needs_pricing":
    case "needs_year":
    case "exceptions":
    case "high_confidence":
    case "medium_confidence":
    case "low_confidence":
    case "needs_verification":
      return value;
    default:
      return "all";
  }
}

function normalizeView(value?: string): ViewMode {
  if (value === "grid" || value === "list" || value === "tiles") {
    return value;
  }

  return "tiles";
}

function applyPresetFilter<T>(
  query: SupabaseQueryLike<T>,
  preset: SavedViewPreset,
): SupabaseQueryLike<T> {
  switch (preset) {
    case "missing_covers":
      return query.or("cover_url.is.null,cover_url.eq.");

    case "missing_discogs":
      return query.or(
        "discogs_release_id.is.null,discogs_release_id.eq.,discogs_release_id.eq.0",
      );

    case "review_queue":
      return query.ilike("notes", "%[REVIEW]%");

    case "needs_pricing":
      return query.or("median_price.is.null,median_price.eq.");

    case "needs_year":
      return query.or("year_released.is.null,year_released.eq.");

    case "exceptions":
      return query.or(
        [
          "cover_url.is.null",
          "cover_url.eq.",
          "discogs_release_id.is.null",
          "discogs_release_id.eq.",
          "discogs_release_id.eq.0",
          "median_price.is.null",
          "median_price.eq.",
          "year_released.is.null",
          "year_released.eq.",
          "notes.ilike.%[REVIEW]%",
        ].join(","),
      );

    case "high_confidence":
    case "medium_confidence":
    case "low_confidence":
    case "needs_verification":
      return query;

    case "all":
    default:
      return query;
  }
}

function applySort<T>(
  query: SupabaseQueryLike<T>,
  sort: string,
): SupabaseQueryLike<T> {
  switch (sort) {
    case "id_asc":
      return query.order("id", { ascending: true });

    case "artist_asc":
      return query
        .order("artist", { ascending: true })
        .order("title", { ascending: true });

    case "artist_desc":
      return query
        .order("artist", { ascending: false })
        .order("title", { ascending: true });

    case "title_asc":
      return query
        .order("title", { ascending: true })
        .order("artist", { ascending: true });

    case "title_desc":
      return query
        .order("title", { ascending: false })
        .order("artist", { ascending: true });

    case "year_desc":
      return query
        .order("year_released", { ascending: false })
        .order("artist", { ascending: true });

    case "year_asc":
      return query
        .order("year_released", { ascending: true })
        .order("artist", { ascending: true });

    case "id_desc":
    default:
      return query.order("id", { ascending: false });
  }
}

function getSafeErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") return "Unknown error";

  const message =
    "message" in error
      ? (error as { message?: unknown }).message
      : "Unknown error";

  return typeof message === "string" && message.trim() !== ""
    ? message
    : "Unknown error";
}

function isConfidencePreset(preset: SavedViewPreset) {
  return (
    preset === "high_confidence" ||
    preset === "medium_confidence" ||
    preset === "low_confidence" ||
    preset === "needs_verification"
  );
}

function filterRecordsByConfidencePreset(
  records: CollectionRecord[],
  preset: SavedViewPreset,
) {
  if (!isConfidencePreset(preset)) {
    return records;
  }

  return records;
}

async function getPresetCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  preset: SavedViewPreset,
  userId: string,
) {
  try {
    let query = supabase
      .from("records_clean_safe")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId) as unknown as SupabaseQueryLike<CollectionRecord>;

    query = applyPresetFilter(query, preset);

    const { count } = await query;

    return count ?? 0;
  } catch {
    return 0;
  }
}

function EmptyCollectionOnboarding() {
  return (
    <main className="min-h-screen bg-[#0E0C0A] px-6 py-10 text-[#F4EFE6]">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="overflow-hidden rounded-[34px] border border-[#3A3328] bg-[radial-gradient(circle_at_top_left,_rgba(199,164,93,0.18),_transparent_34%),linear-gradient(135deg,_#0E0C0A,_#17130F_58%,_#272017)] p-8 text-center shadow-2xl shadow-black/40">
          <div className="mx-auto max-w-3xl">
            <div className="inline-flex rounded-full border border-[#8F6F35]/45 bg-[#C7A45D]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
              Collector Intelligence
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              Start Your Collection Archive
            </h1>

            <p className="mt-4 text-base leading-7 text-[#B8AA96]">
              Your collection is empty right now. Add a record manually or import
              your catalog to begin building a structured archive with valuation,
              grading, Discogs data, and market intelligence.
            </p>

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/import"
                className="rounded-2xl bg-gradient-to-r from-[#C7A45D] to-[#8F6F35] px-6 py-3 text-sm font-bold text-[#11100E] transition hover:opacity-90"
              >
                Import Records
              </Link>

              <Link
                href="/collection/value-dashboard"
                className="rounded-2xl border border-[#8F6F35]/50 bg-[#C7A45D]/10 px-6 py-3 text-sm font-semibold text-[#F4EFE6] transition hover:bg-[#C7A45D]/18"
              >
                View Value Dashboard
              </Link>

              <Link
                href="/collection/market-intelligence"
                className="rounded-2xl border border-fuchsia-300/40 bg-fuchsia-300/10 px-6 py-3 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-300/20"
              >
                Market Intelligence
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[28px] border border-[#3A3328] bg-[linear-gradient(145deg,_#211B14,_#0E0C0A)] p-6 shadow-xl shadow-black/25">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
              Add One Record
            </div>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Create your first archive entry
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#B8AA96]">
              Use this form to add a single record. Once saved, it will appear in
              your collection and become available for grading, value pulls, and
              market review.
            </p>

            <div className="mt-5 rounded-2xl border border-[#3A3328] bg-[#11100E] p-4">
              <AddRecordForm />
            </div>
          </div>

          <div className="rounded-[28px] border border-[#3A3328] bg-[linear-gradient(145deg,_#211B14,_#0E0C0A)] p-6 shadow-xl shadow-black/25">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
              Recommended Start
            </div>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Import a full collection
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#B8AA96]">
              If you already have a spreadsheet or exported list, importing is
              the fastest way to unlock dashboards, saved views, cover checks,
              value queues, and collection intelligence.
            </p>

            <div className="mt-5 grid gap-3">
              <Link
                href="/import"
                className="rounded-2xl bg-[#C7A45D] px-5 py-3 text-center text-sm font-bold text-[#11100E] transition hover:bg-[#D8B86A]"
              >
                Go to Import Records
              </Link>

              <Link
                href="/"
                className="rounded-2xl border border-[#3A3328] bg-[#17130F] px-5 py-3 text-center text-sm font-semibold text-[#D8CBB8] transition hover:border-[#C7A45D]/50"
              >
                Back to Home
              </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-[#3A3328] bg-[#11100E] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8E8170]">
                What unlocks after records exist
              </div>

              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#D8CBB8]">
                <li>• Collection grid and search</li>
                <li>• Saved views and exception queues</li>
                <li>• Discogs value pull workflow</li>
                <li>• Value dashboard and market intelligence</li>
                <li>• Record detail pages with grading fields</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default async function CollectionPage({
  searchParams,
}: CollectionPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const sort = resolvedSearchParams.sort ?? "id_desc";
  const q = resolvedSearchParams.q?.trim() ?? "";
  const preset = normalizePreset(resolvedSearchParams.preset);
  const view = normalizeView(resolvedSearchParams.view);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0E0C0A] px-6 py-10 text-[#F4EFE6]">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-[#3A3328] bg-[#17130F] p-8 text-center shadow-xl shadow-black/30">
          <h1 className="text-3xl font-semibold tracking-tight">
            Please sign in to view your collection
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#B8AA96]">
            Collector Intelligence keeps each user collection separate. Sign in
            to load your personal archive.
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex rounded-2xl bg-[#C7A45D] px-5 py-3 text-sm font-bold text-[#11100E] transition hover:bg-[#D8B86A]"
          >
            Go to Sign In
          </Link>
        </div>
      </main>
    );
  }

  const userId = user.id;

  let records: CollectionRecord[] = [];
  let totalCount = 0;

  try {
    let query = supabase
      .from("records_clean_safe")
      .select("*", { count: "exact" })
      .eq("user_id", userId) as unknown as SupabaseQueryLike<CollectionRecord>;

    query = applyPresetFilter(query, preset);

    if (q) {
      query = query.or(
        [
          `artist.ilike.%${q}%`,
          `title.ilike.%${q}%`,
          `label.ilike.%${q}%`,
          `catalogue_number.ilike.%${q}%`,
          `notes.ilike.%${q}%`,
        ].join(","),
      );
    }

    query = applySort(query, sort);

    const { data, count } = await query.limit(5000);

    records = data ?? [];

    if (isConfidencePreset(preset)) {
      records = filterRecordsByConfidencePreset(records, preset);
      totalCount = records.length;
    } else {
      totalCount = count ?? 0;
    }
  } catch (error) {
    console.warn("Collection query warning:", getSafeErrorMessage(error));
  }

  let confidenceCountRecords: CollectionRecord[] = [];

  try {
    const confidenceCountQuery = supabase
      .from("records_clean_safe")
      .select("*")
      .eq("user_id", userId) as unknown as SupabaseQueryLike<CollectionRecord>;

    const { data } = await confidenceCountQuery.limit(5000);
    confidenceCountRecords = data ?? [];
  } catch (error) {
    console.warn("Confidence counts warning:", getSafeErrorMessage(error));
  }

  const presetCounts = {
    all: await getPresetCount(supabase, "all", userId),
    missing_covers: await getPresetCount(supabase, "missing_covers", userId),
    missing_discogs: await getPresetCount(supabase, "missing_discogs", userId),
    review_queue: await getPresetCount(supabase, "review_queue", userId),
    needs_pricing: await getPresetCount(supabase, "needs_pricing", userId),
    needs_year: await getPresetCount(supabase, "needs_year", userId),
    exceptions: await getPresetCount(supabase, "exceptions", userId),
    high_confidence: filterRecordsByConfidencePreset(
      confidenceCountRecords,
      "high_confidence",
    ).length,
    medium_confidence: filterRecordsByConfidencePreset(
      confidenceCountRecords,
      "medium_confidence",
    ).length,
    low_confidence: filterRecordsByConfidencePreset(
      confidenceCountRecords,
      "low_confidence",
    ).length,
    needs_verification: filterRecordsByConfidencePreset(
      confidenceCountRecords,
      "needs_verification",
    ).length,
  };

  let savedViews: SavedViewRow[] = [];

  try {
    savedViews = await getSavedViews();
  } catch (error) {
    console.warn("Saved views warning:", getSafeErrorMessage(error));
  }

  const summary = await getCollectionValueSummary();
  const rankings = await getValueRankings();

  const hasNoRecords =
    totalCount === 0 &&
    q === "" &&
    preset === "all" &&
    records.length === 0;

  if (hasNoRecords) {
    return <EmptyCollectionOnboarding />;
  }

  return (
    <>
      <ScrollRestorer />

      <div className="mx-auto max-w-7xl px-6 pt-6">
        <CollectionValueBar
          totalEstimatedValue={summary.totalEstimatedValue}
          totalPurchaseValue={summary.totalPurchaseValue}
          totalGainLoss={summary.totalGainLoss}
          totalRecords={summary.totalRecords}
          missingValueCount={summary.missingValueCount}
        />
      </div>

      <TopValueRecordsPanel
        topEstimated={rankings.topEstimated}
        biggestGainers={rankings.biggestGainers}
        needsValuePull={rankings.needsValuePull}
      />

      <CollectionUI
        records={records}
        totalCount={totalCount}
        sort={sort}
        searchQuery={q}
        preset={preset}
        view={view}
        presetCounts={presetCounts}
        sortOptions={SORT_OPTIONS}
        savedViews={savedViews}
        addRecordForm={<AddRecordForm />}
      />
    </>
  );
}