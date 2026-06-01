import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { parsePopsikeHtml } from "@/app/actions/popsike-parser";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);

  if (!body?.html || typeof body.html !== "string") {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing html",
      },
      { status: 400 }
    );
  }

  const rows = await parsePopsikeHtml(body.html);

  return NextResponse.json({
    ok: true,
    rowsFound: rows.length,
    rows,
  });
}
