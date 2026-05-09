import { createClient } from "@/src/lib/supabase/server";

export async function getReportData() {
  const supabase =
    await createClient();

  const { data, error } =
    await supabase
      .from("records_clean_safe")
      .select("*");

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}