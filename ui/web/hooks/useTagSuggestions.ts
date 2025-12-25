import { useMemo } from "react"

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
    if (query.length < minChars) return []

    const selected = new Set(selectedTags)
    const filtered = allTags.filter((tag) => tag.startsWith(query) && !selected.has(tag))

    return filtered.sort((a, b) => a.localeCompare(b)).slice(0, limit)
  }, [allTags, selectedTags, query, minChars, limit])
}
