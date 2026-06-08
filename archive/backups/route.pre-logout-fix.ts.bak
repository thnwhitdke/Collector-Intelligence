import { NextResponse } from "next/server";
import { createClient } from "../../../src/lib/supabase/server";

async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(
    new URL("/auth/login", process.env.NEXT_PUBLIC_SITE_URL || "https://www.collectorsintelligence.com"),
  );
}

export async function POST() {
  return signOut();
}

export async function GET() {
  return signOut();
}
