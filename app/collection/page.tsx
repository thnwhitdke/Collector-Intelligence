import { createClient } from "../../src/lib/supabase/server";
import AddRecordForm from "../components/AddRecordForm";
import { getSavedViews, type SavedViewRow } from "../actions/records";
import { getCollectionValueSummary } from "../actions/value-summary";
import { getValueRankings } from "../actions/value-rankings";
import CollectionValueBar from "./CollectionValueBar";
import TopValueRecordsPanel from "./TopValueRecordsPanel";
import { CollectionUI, type CollectionRecord } from "./ui";
import ScrollRestorer from "./ScrollRestorer";

type CollectionPageProps = {
  searchParams?: Promise<{
    sort?: string;
    q?: string;
    preset?: string;
  }>;
};

export type SavedViewPreset =
  | "all"
  | "missing_covers"
  | "missing_discogs"
  | "review_queue"
  | "needs_pricing"
  | "needs_year"
  | "exceptions";

type SupabaseErrorLike = {
  message?: string | null;
};

type SupabaseQueryResult<T> = {
  data?: T[] | null;
  count?: number | null;
  error?: SupabaseErrorLike | null;
};

type SupabaseQueryLike<T> = PromiseLike<SupabaseQueryResult<T>> & {
  or: (filters: string) => SupabaseQueryLike<T>;
  ilike: (column: string, pattern: string) => SupabaseQueryLike<T>;
  order: (
    column: string,
    options: { ascending: boolean }
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
      return value;
    default:
      return "all";
  }
}

function applyPresetFilter<T>(
  query: SupabaseQueryLike<T>,
  preset: SavedViewPreset
): SupabaseQueryLike<T> {
  switch (preset) {
    case "missing_covers":
      return query.or("cover_url.is.null,cover_url.eq.");

    case "missing_discogs":
      return query.or(
        "discogs_release_id.is.null,discogs_release_id.eq.,discogs_release_id.eq.0"
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
        ].join(",")
      );

    case "all":
    default:
      return query;
  }
}

function applySort<T>(
  query: SupabaseQueryLike<T>,
  sort: string
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

async function getPresetCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  preset: SavedViewPreset
) {
  try {
    let query = supabase
      .from("records_clean_safe")
      .select("*", { count: "exact", head: true }) as unknown as SupabaseQueryLike<CollectionRecord>;

    query = applyPresetFilter(query, preset);

    const { count } = await query;

    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function CollectionPage({
  searchParams,
}: CollectionPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const sort = resolvedSearchParams.sort ?? "id_desc";
  const q = resolvedSearchParams.q?.trim() ?? "";
  const preset = normalizePreset(resolvedSearchParams.preset);

  const supabase = await createClient();

  let records: CollectionRecord[] = [];
  let totalCount = 0;

  try {
    let query = supabase
      .from("records_clean_safe")
      .select("*", { count: "exact" }) as unknown as SupabaseQueryLike<CollectionRecord>;

    query = applyPresetFilter(query, preset);

    if (q) {
      query = query.or(
        [
          `artist.ilike.%${q}%`,
          `title.ilike.%${q}%`,
          `label.ilike.%${q}%`,
          `catalogue_number.ilike.%${q}%`,
          `notes.ilike.%${q}%`,
        ].join(",")
      );
    }

    query = applySort(query, sort);

    const { data, count } = await query.limit(1000);

    records = data ?? [];
    totalCount = count ?? 0;
  } catch (error) {
    console.warn("Collection query warning:", getSafeErrorMessage(error));
  }

  const presetCounts = {
    all: await getPresetCount(supabase, "all"),
    missing_covers: await getPresetCount(supabase, "missing_covers"),
    missing_discogs: await getPresetCount(supabase, "missing_discogs"),
    review_queue: await getPresetCount(supabase, "review_queue"),
    needs_pricing: await getPresetCount(supabase, "needs_pricing"),
    needs_year: await getPresetCount(supabase, "needs_year"),
    exceptions: await getPresetCount(supabase, "exceptions"),
  };

  let savedViews: SavedViewRow[] = [];

  try {
    savedViews = await getSavedViews();
  } catch (error) {
    console.warn("Saved views warning:", getSafeErrorMessage(error));
  }

  const summary = await getCollectionValueSummary();
  const rankings = await getValueRankings();

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
        presetCounts={presetCounts}
        sortOptions={SORT_OPTIONS}
        savedViews={savedViews}
        addRecordForm={<AddRecordForm />}
      />
    </>
  );
}