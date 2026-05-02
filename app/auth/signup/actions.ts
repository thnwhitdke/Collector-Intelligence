"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirect("/auth/signup");
  }

  redirect("/auth/login");
}