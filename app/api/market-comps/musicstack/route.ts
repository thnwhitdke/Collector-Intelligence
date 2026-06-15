import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "musicstack",
    status: "route alive"
  });
}
