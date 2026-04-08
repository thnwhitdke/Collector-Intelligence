"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addRecord(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("Not authenticated.");

  const artist = String(formData.get("artist") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const format = String(formData.get("format") ?? "").trim() || null;

  const yearRaw = String(formData.get("year") ?? "").trim();
  const ratingRaw = String(formData.get("rating") ?? "").trim();

  const year = yearRaw ? Number(yearRaw) : null;
  const rating = ratingRaw ? Number(ratingRaw) : null;

  if (!artist || !title) throw new Error("Artist and Title are required.");
  if (year !== null && Number.isNaN(year)) throw new Error("Year must be a number.");
  if (rating !== null && (Number.isNaN(rating) || rating < 1 || rating > 10)) {
    throw new Error("Rating must be a number between 1 and 10.");
  }

  const { error } = await supabase.from("records").insert({
    user_id: user.id,
    artist,
    title,
    year,
    format,
    rating,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/collection");
}

export async function getRecords(page = 1, pageSize = 72) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { records: [], total: 0 };

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("records")
    .select(
      "id, user_id, artist, title, year, country, format, pressing, condition, cover_url, value",
      { count: "exact" }
    )
    .eq("user_id", user.id)
    .order("artist", { ascending: true })
    .range(from, to);

  if (error) {
    console.error(error);
    return { records: [], total: 0 };
  }

  return { records: data ?? [], total: count ?? 0 };
}