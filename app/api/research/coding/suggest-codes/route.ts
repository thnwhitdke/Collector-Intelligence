import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function extractText(json: any) {
  if (json?.output_text) return json.output_text

  const parts =
    json?.output
      ?.flatMap((item: any) => item?.content || [])
      ?.map((content: any) => content?.text || "")
      ?.filter(Boolean) || []

  return parts.join("\n")
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Missing OPENAI_API_KEY in Vercel environment variables." },
        { status: 500 }
      )
    }

    const body = await req.json()
    const text = String(body?.text || "").trim()
    const existingCodes = Array.isArray(body?.existingCodes) ? body.existingCodes : []

    if (!text) {
      return NextResponse.json({ ok: false, error: "No selected segment text provided." }, { status: 400 })
    }

    const prompt = `
You are assisting with inductive qualitative open coding for a dissertation interview transcript.

Important rules:
- Do not claim certainty.
- Do not replace the researcher.
- Suggest codes only; the researcher decides whether to apply them.
- Prefer concise, grounded open codes.
- Include in-vivo codes only when a short exact phrase from the excerpt is especially analytically useful.
- Return ONLY valid JSON.

Selected transcript segment:
${text}

Existing codebook:
${existingCodes.map((c: any) => `- ${c.name}: ${c.definition || ""}`).join("\n")}

Return this exact JSON shape:
{
  "suggestions": [
    {
      "name": "short code name",
      "type": "Open Code",
      "definition": "one sentence definition",
      "rationale": "brief reason this code may fit",
      "confidence": 0.75
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
      return NextResponse.json(
        { ok: false, error: json?.error?.message || "OpenAI request failed.", raw: json },
        { status: 500 }
      )
    }

    const textOut = extractText(json)
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim()

    try {
      const parsed = JSON.parse(textOut)
      return NextResponse.json({ ok: true, suggestions: parsed.suggestions || [] })
    } catch {
      return NextResponse.json(
        { ok: false, error: "AI returned a non-JSON response.", raw: textOut },
        { status: 500 }
      )
    }
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unexpected AI coding error." },
      { status: 500 }
    )
  }
}
