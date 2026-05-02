"use server";

import { createClient } from "../../../src/lib/supabase/server";

type ImportRow = {
  artist: string;
  title: string;
  year?: number;
  label?: string;
  format?: string;
  discogs_release_id?: string;
};

function normalize(str: string | null | undefined) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export async function importRecords(rows: ImportRow[]) {
  const supabase = await createClient();

  let inserted = 0;
  let flagged = 0;

  for (const row of rows) {
    const normArtist = normalize(row.artist);
    const normTitle = normalize(row.title);

    const { data: existing } = await supabase
      .from("records_clean")
      .select("id, artist, title")
      .ilike("artist", `%${row.artist}%`)
      .ilike("title", `%${row.title}%`)
      .limit(5);

    let isDuplicate = false;

    if (existing && existing.length > 0) {
      for (const rec of existing) {
        const a = normalize(rec.artist);
        const t = normalize(rec.title);

        if (a === normArtist && t === normTitle) {
          isDuplicate = true;
          break;
        }
      }
    }

    if (isDuplicate) flagged++;

    await supabase.from("records_clean").insert({
      artist: row.artist,
      title: row.title,
      year_released: row.year || null,
      label: row.label || null,
      format: row.format || null,
      discogs_release_id: row.discogs_release_id || null,
      possible_duplicate: isDuplicate,
    });

    inserted++;
  }

  return {
    inserted,
    flagged,
  };
}