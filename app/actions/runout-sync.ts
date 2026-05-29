"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";
import { fetchDiscogsRunoutIdentifiers } from "@/src/lib/discogs";

type SyncResult = {
  ok: boolean;
  releaseId?: string;
  inserted?: number;
  message: string;
};

function dedupeRunoutRows(
  rows: {
    discogs_release_id: string;
    identifier_type: string;
    identifier_value: string;
    identifier_description: string | null;
  }[]
) {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const key = [
      row.discogs_release_id,
      row.identifier_type,
      row.identifier_value,
    ].join("||");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function syncRunoutsForDiscogsReleaseId(
  releaseId: string
): Promise<SyncResult> {
  if (!releaseId) {
    return {
      ok: false,
      message: "Missing Discogs release ID.",
    };
  }

  const supabase = createAdminClient();

  const identifiers = await fetchDiscogsRunoutIdentifiers(releaseId);

  if (identifiers.length === 0) {
    return {
      ok: true,
      releaseId,
      inserted: 0,
      message: "No Matrix / Runout identifiers found for this Discogs release.",
    };
  }

  const rawRows = identifiers
    .filter((identifier) => identifier.value && identifier.type)
    .map((identifier) => ({
      discogs_release_id: releaseId,
      identifier_type: identifier.type ?? "Matrix / Runout",
      identifier_value: identifier.value ?? "",
      identifier_description: identifier.description ?? null,
    }));

  const rows = dedupeRunoutRows(rawRows);

  if (rows.length === 0) {
    return {
      ok: true,
      releaseId,
      inserted: 0,
      message: "No usable Matrix / Runout identifiers found.",
    };
  }

  const { error } = await supabase
    .from("release_runout_identifiers")
    .upsert(rows, {
      onConflict: "discogs_release_id,identifier_type,identifier_value",
      ignoreDuplicates: false,
    });

  if (error) {
    return {
      ok: false,
      releaseId,
      inserted: 0,
      message: error.message,
    };
  }

  return {
    ok: true,
    releaseId,
    inserted: rows.length,
    message: `Synced ${rows.length} Matrix / Runout identifier(s).`,
  };
}

export async function syncRunoutsForRecordId(
  recordId: number
): Promise<SyncResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("records_clean_safe")
    .select("id, discogs_release_id")
    .eq("id", recordId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  if (!data?.discogs_release_id) {
    return {
      ok: false,
      message: "This record does not have a Discogs release ID.",
    };
  }

  return syncRunoutsForDiscogsReleaseId(String(data.discogs_release_id));
}

export async function syncRunoutsForCollection(
  limit = 25
): Promise<{
  ok: boolean;
  processed: number;
  inserted: number;
  results: SyncResult[];
}> {
  const supabase = createAdminClient();

  const { data: records, error: recordsError } = await supabase
    .from("records_clean_safe")
    .select("discogs_release_id")
    .not("discogs_release_id", "is", null)
    .limit(limit * 5);

  if (recordsError) {
    return {
      ok: false,
      processed: 0,
      inserted: 0,
      results: [
        {
          ok: false,
          message: recordsError.message,
        },
      ],
    };
  }

  const candidateReleaseIds = Array.from(
    new Set(
      (records ?? [])
        .map((row) => row.discogs_release_id)
        .filter(Boolean)
        .map(String)
    )
  );

  const { data: existingRunouts, error: existingError } = await supabase
    .from("release_runout_identifiers")
    .select("discogs_release_id")
    .in("discogs_release_id", candidateReleaseIds);

  if (existingError) {
    return {
      ok: false,
      processed: 0,
      inserted: 0,
      results: [
        {
          ok: false,
          message: existingError.message,
        },
      ],
    };
  }

  const alreadySynced = new Set(
    (existingRunouts ?? []).map((row) => String(row.discogs_release_id))
  );

  const releaseIdsToSync = candidateReleaseIds
    .filter((releaseId) => !alreadySynced.has(releaseId))
    .slice(0, limit);

  const results: SyncResult[] = [];

  for (const releaseId of releaseIdsToSync) {
    const result = await syncRunoutsForDiscogsReleaseId(releaseId);
    results.push(result);
  }

  return {
    ok: true,
    processed: results.length,
    inserted: results.reduce((sum, result) => sum + (result.inserted ?? 0), 0),
    results,
  };
}
