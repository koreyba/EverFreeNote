import { useMemo } from "react"
import { normalizeTag } from "@ui/web/lib/tags"

type UseTagSuggestionsParams = {
  allTags: string[]
  selectedTags: string[]
  query: string
  minChars?: number
  limit?: number
}

export const useTagSuggestions = ({
  allTags,
  selectedTags,
  query,
  minChars = 3,
  limit = 3,
}: UseTagSuggestionsParams) => {
  return useMemo(() => {
    const normalizedQuery = normalizeTag(query)
    if (normalizedQuery.length < minChars) return []

    const selectedSet = new Set(selectedTags.map((t) => normalizeTag(t)))
    const matchesMap = new Map<string, string>()

    for (const tag of allTags) {
      const normalizedCandidate = normalizeTag(tag)
      if (!normalizedCandidate || selectedSet.has(normalizedCandidate)) continue
      if (normalizedCandidate.startsWith(normalizedQuery)) {
        if (!matchesMap.has(normalizedCandidate)) {
          matchesMap.set(normalizedCandidate, normalizedCandidate)
        }
      }
    }

    return Array.from(matchesMap.values())
      .sort((a, b) => a.localeCompare(b))
      .slice(0, limit)
  }, [allTags, selectedTags, query, minChars, limit])
}

