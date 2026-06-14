// ======================================================
// Collector Intelligence
// Top Movers Service
// Unique Recent Value Movement Engine
// ======================================================

import { createAdminClient } from "@/src/lib/supabase/admin";

export type TopMover = {
  recordId: number;
  artist?: string | null;
  title?: string | null;
  percentChange: number;
  delta: number;
  direction: "up" | "down" | "flat";
};

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, places = 2): number {
  return Number(value.toFixed(places));
}

function percentDelta(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return round(((current - previous) / previous) * 100, 2);
}

function releaseKey(mover: TopMover): string {
  return `${String(mover.artist || "").toLowerCase().trim()}|${String(
    mover.title || "",
  )
    .toLowerCase()
    .trim()}`;
}

export async function getTopMovers(
  limit = 10,
  userId?: string | null,
): Promise<TopMover[]> {
  if (!userId) return [];

  const supabase = createAdminClient();

  const { data: records, error: recordError } = await supabase
    .from("records_clean_safe")
    .select("id, artist, title")
    .eq("user_id", userId);

  if (recordError) {
    throw recordError;
  }

  const recordIds = (records || []).map((record) => Number(record.id));

  if (recordIds.length === 0) {
    return [];
  }

  const { data: history, error: historyError } = await supabase
    .from("value_history")
    .select("record_id, estimated_value, snapshot_date")
    .in("record_id", recordIds)
    .order("snapshot_date", { ascending: false });

  if (historyError) {
    throw historyError;
  }

  const recordMap = new Map<
    number,
    { artist?: string | null; title?: string | null }
  >();

  for (const record of records || []) {
    recordMap.set(Number(record.id), {
      artist: record.artist,
      title: record.title,
    });
  }

  const grouped = new Map<
    number,
    Array<{ value: number; snapshotDate: string }>
  >();

  for (const row of history || []) {
    const value = toNumber(row.estimated_value);
    if (value <= 0) continue;

    const recordId = Number(row.record_id);

    if (!grouped.has(recordId)) {
      grouped.set(recordId, []);
    }

    grouped.get(recordId)!.push({
      value,
      snapshotDate: row.snapshot_date,
    });
  }

  const rawMovers: TopMover[] = [];

  for (const [recordId, snapshots] of grouped.entries()) {
    if (snapshots.length < 2) continue;

    const latest = snapshots[0];
    const previous = snapshots.find(
      (snapshot) => snapshot.snapshotDate !== latest.snapshotDate,
    );

    if (!previous) continue;

    const delta = round(latest.value - previous.value, 2);
    if (Math.abs(delta) < 25) continue;

    const percentChange = percentDelta(latest.value, previous.value);
    const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
    const record = recordMap.get(recordId);

    rawMovers.push({
      recordId,
      artist: record?.artist,
      title: record?.title,
      percentChange,
      delta,
      direction,
    });
  }

  const bestByRelease = new Map<string, TopMover>();

  for (const mover of rawMovers) {
    const key = releaseKey(mover);
    const current = bestByRelease.get(key);

    if (!current || Math.abs(mover.delta) > Math.abs(current.delta)) {
      bestByRelease.set(key, mover);
    }
  }

  const artistCounts = new Map<string, number>();

  return Array.from(bestByRelease.values())
    .sort(
      (a, b) =>
        Math.abs(b.delta) - Math.abs(a.delta) ||
        Math.abs(b.percentChange) - Math.abs(a.percentChange),
    )
    .filter((mover) => {
      const artist = String(mover.artist || "Unknown Artist")
        .toLowerCase()
        .trim();
      const count = artistCounts.get(artist) || 0;

      if (count >= 2) return false;

      artistCounts.set(artist, count + 1);
      return true;
    })
    .slice(0, limit);
}
