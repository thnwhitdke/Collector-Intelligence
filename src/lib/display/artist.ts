export function displayArtistName(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";

  if (!raw) return "Unknown Artist";
  if (!raw.includes(",")) return raw;

  const [last, ...rest] = raw.split(",");
  const first = rest.join(" ").trim();

  if (!last.trim() || !first) return raw;

  return `${first} ${last.trim()}`;
}
