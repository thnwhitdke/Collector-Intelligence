"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/src/lib/supabase/admin";

export async function addFavoriteArtist(formData: FormData) {
  const artistName = String(formData.get("artist_name") || "").trim();

  if (!artistName) return;

  const supabase = createAdminClient();

  await supabase
    .from("favorite_artists")
    .insert({ artist_name: artistName, active: true })
    .select()
    .single();

  revalidatePath("/collection/favorite-artists");
}

export async function toggleFavoriteArtist(formData: FormData) {
  const id = Number(formData.get("id"));
  const active = String(formData.get("active")) === "true";

  if (!id) return;

  const supabase = createAdminClient();

  await supabase
    .from("favorite_artists")
    .update({ active: !active })
    .eq("id", id);

  revalidatePath("/collection/favorite-artists");
}

export async function deleteFavoriteArtist(formData: FormData) {
  const id = Number(formData.get("id"));

  if (!id) return;

  const supabase = createAdminClient();

  await supabase
    .from("favorite_artists")
    .delete()
    .eq("id", id);

  revalidatePath("/collection/favorite-artists");
}
