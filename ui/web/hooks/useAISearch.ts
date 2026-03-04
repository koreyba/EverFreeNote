import { useQuery } from '@tanstack/react-query'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'
import {
  OFFSET_DELTA_THRESHOLD,
  SEARCH_PRESETS,
  AI_SEARCH_MIN_QUERY_LENGTH,
  type SearchPreset,
} from '@core/constants/aiSearch'
import type { RagChunk, RagNoteGroup } from '@core/types/ragSearch'

const STALE_TIME_MS = 30_000

// ---------------------------------------------------------------------------
// Deduplication: removes chunks too close in offset within a single note.
// Chunks must be pre-sorted by similarity descending.
// ---------------------------------------------------------------------------
function deduplicateChunks(
  chunks: RagChunk[],
  maxCount: number
): { accepted: RagChunk[]; hiddenCount: number } {
  const accepted: RagChunk[] = []
  for (const chunk of chunks) {
    const tooClose = accepted.some(
      (a) => Math.abs(chunk.charOffset - a.charOffset) < OFFSET_DELTA_THRESHOLD
    )
    if (!tooClose) accepted.push(chunk)
    if (accepted.length >= maxCount) break
  }
  return { accepted, hiddenCount: chunks.length - accepted.length }
}

// ---------------------------------------------------------------------------
// Grouping: groups raw chunks by note, deduplicates, sorts by topScore.
// maxChunksPerNote: 5 for Note View (all dedup happens here).
// Chunk View applies its own 2-per-note limit in the component.
// ---------------------------------------------------------------------------
function groupByNote(chunks: RagChunk[]): RagNoteGroup[] {
  const map = new Map<string, RagChunk[]>()
  for (const chunk of chunks) {
    if (!map.has(chunk.noteId)) map.set(chunk.noteId, [])
    map.get(chunk.noteId)!.push(chunk)
  }

  const groups: RagNoteGroup[] = Array.from(map.entries()).map(([noteId, noteChunks]) => {
    const sorted = [...noteChunks].sort((a, b) => b.similarity - a.similarity)
    const { accepted, hiddenCount } = deduplicateChunks(sorted, 5)
    return {
      noteId,
      noteTitle: sorted[0].noteTitle,
      noteTags: sorted[0].noteTags,
      topScore: sorted[0].similarity,
      chunks: accepted,
      hiddenCount,
    }
  })

  return groups.sort((a, b) => b.topScore - a.topScore)
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
interface UseAISearchOptions {
  query: string
  preset: SearchPreset
  filterTag: string | null
  isEnabled: boolean
}

interface UseAISearchResult {
  noteGroups: RagNoteGroup[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useAISearch({
  query,
  preset,
  filterTag,
  isEnabled,
}: UseAISearchOptions): UseAISearchResult {
  const { supabase } = useSupabase()
  const { topK, threshold } = SEARCH_PRESETS[preset]

  const trimmedQuery = query.trim()
  const queryEnabled =
    isEnabled && trimmedQuery.length >= AI_SEARCH_MIN_QUERY_LENGTH

  const result = useQuery({
    queryKey: ['aiSearch', trimmedQuery, preset, filterTag],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('rag-search', {
        body: {
          query: trimmedQuery,
          topK,
          threshold,
          filterTag: filterTag ?? null,
        },
      })

      if (error) throw new Error(error.message ?? 'AI Search failed')

      const chunks = (data?.chunks ?? []) as RagChunk[]
      return groupByNote(chunks)
    },
    enabled: queryEnabled,
    staleTime: STALE_TIME_MS,
    retry: 1,
  })

  return {
    noteGroups: result.data ?? [],
    isLoading: result.isFetching,
    error: result.error ? String(result.error) : null,
    refetch: result.refetch,
  }
}
