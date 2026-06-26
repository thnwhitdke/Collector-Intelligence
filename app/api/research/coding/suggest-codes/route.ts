import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Missing OPENAI_API_KEY in environment." },
      { status: 500 }
    )
  }

  const body = await req.json()
  const text = String(body?.text || "").trim()
  const existingCodes = Array.isArray(body?.existingCodes) ? body.existingCodes : []

  if (!text) {
    return NextResponse.json({ ok: false, error: "No segment text provided." }, { status: 400 })
  }

  const prompt = `
You are assisting with inductive qualitative open coding for a dissertation interview transcript.

Return ONLY valid JSON.

Segment:
${text}

Existing codes:
${existingCodes.map((c: any) => `- ${c.name}: ${c.definition || ""}`).join("\n")}

Suggest 3 to 6 possible open codes. The researcher will decide whether to apply them.

JSON format:
{
  "suggestions": [
    {
      "name": "short code name",
      "type": "Open Code",
      "definition": "one sentence definition",
      "rationale": "why this code may fit this segment",
      "confidence": 0.0
    }
  ]
}
`

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.2,
    }),
  })

  const json = await response.json()

  if (!response.ok) {
    return NextResponse.json({ ok: false, error: json }, { status: 500 })
  }

  const content =
    json.output_text ||
    json.output?.flatMap((o: any) => o.content || [])?.map((c: any) => c.text || "").join("") ||
    ""

  try {
    const parsed = JSON.parse(content)
    return NextResponse.json({ ok: true, suggestions: parsed.suggestions || [] })
  } catch {
    return NextResponse.json({ ok: false, error: "AI returned invalid JSON", raw: content }, { status: 500 })
  }
}
