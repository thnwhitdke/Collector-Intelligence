import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    job: "artist-market-snapshot",
    status: "placeholder",
    message: "Artist market snapshot route reserved for future signal history jobs.",
    timestamp: new Date().toISOString(),
  });
}
