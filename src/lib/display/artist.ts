function flipSingleArtistName(value: string): string {
  const raw = value.trim()
  if (!raw.includes(",")) return raw

  const parts = raw.split(",").map((part) => part.trim()).filter(Boolean)
  if (parts.length < 2) return raw

  const last = parts[0]
  const first = parts.slice(1).join(" ")

  if (!first || !last) return raw
  return `${first} ${last}`.trim()
}

export function displayArtistName(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : ""

  if (!raw) return "Unknown Artist"

  return raw
    .split(/\s*&\s*/)
    .map((part) => flipSingleArtistName(part))
    .join(" & ")
}
