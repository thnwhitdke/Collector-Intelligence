// ======================================================
// Collector Intelligence
// Premium Search Service
// Search Query Utilities + Filtering Logic
// ======================================================

export type SearchFilters = {
  query?: string
  artist?: string
  label?: string
  genre?: string
  minValue?: number
  maxValue?: number
}

export function normalizeSearchText(
  value?: string | null
): string {
  return (value || '')
    .trim()
    .toLowerCase()
}

export function buildSearchTerms(
  filters: SearchFilters
): string[] {
  const terms: string[] = []

  if (filters.query) {
    terms.push(normalizeSearchText(filters.query))
  }

  if (filters.artist) {
    terms.push(normalizeSearchText(filters.artist))
  }

  if (filters.label) {
    terms.push(normalizeSearchText(filters.label))
  }

  if (filters.genre) {
    terms.push(normalizeSearchText(filters.genre))
  }

  return terms.filter(Boolean)
}

export function hasValueRange(
  filters: SearchFilters
): boolean {
  return (
    filters.minValue !== undefined ||
    filters.maxValue !== undefined
  )
}