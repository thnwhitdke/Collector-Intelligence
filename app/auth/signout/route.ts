import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

async function signOut(request: NextRequest) {
  const supabase = await createClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/", request.url));
}

export async function POST(request: NextRequest) {
  return signOut(request);
}

export async function GET(request: NextRequest) {
  return signOut(request);
}
