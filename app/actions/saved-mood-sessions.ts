"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveMoodSession(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in to save a mood session.");
  }

  const title = String(formData.get("title") || "").trim();
  const prompt = String(formData.get("prompt") || "").trim();
  const mood = String(formData.get("mood") || "").trim();
  const reason = String(formData.get("reason") || "").trim();
  const estimatedRuntimeSeconds = Number(
    formData.get("estimated_runtime_seconds") || 0,
  );
  const sessionJsonRaw = String(formData.get("session_json") || "{}");

  if (!title || !prompt || !mood) {
    throw new Error("Missing required mood session fields.");
  }

  let sessionJson: unknown;

  try {
    sessionJson = JSON.parse(sessionJsonRaw);
  } catch {
    throw new Error("Invalid session JSON.");
  }

  const { error } = await supabase.from("saved_mood_sessions").insert({
    user_id: user.id,
    title,
    prompt,
    mood,
    reason,
    estimated_runtime_seconds: Number.isFinite(estimatedRuntimeSeconds)
      ? estimatedRuntimeSeconds
      : 0,
    session_json: sessionJson,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/collection/track-intelligence");
}
