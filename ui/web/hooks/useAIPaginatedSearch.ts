import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'
import { AI_SEARCH_MIN_QUERY_LENGTH } from '@core/constants/aiSearch'
import { RAG_SEARCH_TOP_K_MAX, getRagSearchReadonlySettings } from '@core/rag/searchSettings'
import type { RagChunk, RagNoteGroup } from '@core/types/ragSearch'

const STALE_TIME_MS = 30_000
const READONLY_RAG_SEARCH_SETTINGS = getRagSearchReadonlySettings()

function deduplicateChunks(
  chunks: RagChunk[],
  maxCount: number
): { accepted: RagChunk[]; hiddenCount: number } {
  const accepted: RagChunk[] = []
  for (const chunk of chunks) {
    const tooClose = accepted.some(
      (a) => Math.abs(chunk.charOffset - a.charOffset) < READONLY_RAG_SEARCH_SETTINGS.offset_delta_threshold
    )
    if (!tooClose) accepted.push(chunk)
    if (accepted.length >= maxCount) break
  }
  return { accepted, hiddenCount: chunks.length - accepted.length }
}

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

function hashText(value: string | undefined): string {
  // Fast non-crypto hash for change detection signatures.
  const normalizedValue = value ?? ''
  let hash = 2166136261
  for (let i = 0; i < normalizedValue.length; i += 1) {
    hash ^= normalizedValue.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function buildGroupsSignature(groups: RagNoteGroup[]): string {
  return groups
    .map((group) => {
      const tagsSignature = Array.isArray(group.noteTags)
        ? [...group.noteTags].sort().join(',')
        : ''
      const chunksSignature = group.chunks
        .map((chunk) =>
          `${chunk.chunkIndex}:${chunk.charOffset}:${chunk.similarity.toFixed(6)}:` +
          `${hashText(chunk.content)}:${hashText(chunk.bodyContent ?? chunk.content)}:${hashText(chunk.overlapPrefix)}`
        )
        .join('|')
      return `${group.noteId}:${hashText(group.noteTitle)}:${hashText(tagsSignature)}:${group.topScore.toFixed(6)}:${group.hiddenCount}:${chunksSignature}`
    })
    .join('||')
}

interface UseAIPaginatedSearchOptions {
  query: string
  topK: number
  threshold: number
  filterTag: string | null
  isEnabled: boolean
}

interface UseAIPaginatedSearchResult {
  noteGroups: RagNoteGroup[]
  isLoading: boolean
  error: string | null
  refetch: () => void
  aiOffset: number
  aiAccumulatedResults: RagNoteGroup[]
  aiHasMore: boolean
  aiLoadingMore: boolean
  loadMoreAI: () => void
  resetAIResults: () => void
}

export function useAIPaginatedSearch({
  query,
  topK,
  threshold,
  filterTag,
  isEnabled,
}: UseAIPaginatedSearchOptions): UseAIPaginatedSearchResult {
  const { supabase } = useSupabase()
  const pageSize = Math.max(1, Math.min(topK, RAG_SEARCH_TOP_K_MAX))

  const [aiOffset, setAiOffset] = useState(0)
  const [aiAccumulatedResults, setAiAccumulatedResults] = useState<RagNoteGroup[]>([])

  const lastProcessedDataRef = useRef<string>('')

  const trimmedQuery = query.trim()
  const queryEnabled = isEnabled && trimmedQuery.length >= AI_SEARCH_MIN_QUERY_LENGTH
  const searchIdentity = `${trimmedQuery}::${pageSize}::${threshold.toFixed(2)}::${filterTag ?? ''}::${isEnabled}`
  const [committedIdentity, setCommittedIdentity] = useState(searchIdentity)
  const effectiveAiOffset =
    committedIdentity !== searchIdentity ? 0 : aiOffset

  const requestedTopK = useMemo(
    () => Math.min(RAG_SEARCH_TOP_K_MAX, pageSize + effectiveAiOffset),
    [pageSize, effectiveAiOffset]
  )

  const resetAIResults = useCallback(() => {
    setAiOffset(0)
    setAiAccumulatedResults([])
    lastProcessedDataRef.current = ''
  }, [])

  // Reset pagination whenever the effective search identity changes.
  useEffect(() => {
    if (committedIdentity === searchIdentity) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCommittedIdentity(searchIdentity)
    resetAIResults()
  }, [committedIdentity, searchIdentity, resetAIResults])

  const result = useQuery({
    queryKey: ['aiSearch', trimmedQuery, pageSize, threshold, filterTag, requestedTopK],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('rag-search', {
        body: {
          query: trimmedQuery,
          topK: requestedTopK,
          threshold,
          filterTag: filterTag ?? null,
        },
      })

      if (error) throw new Error(error.message ?? 'AI Search failed')

      const chunks = Array.isArray(data?.chunks) ? (data.chunks as RagChunk[]) : []
      return {
        chunkCount: chunks.length,
        hasMore: data?.hasMore === true,
        groups: groupByNote(chunks),
      }
    },
    enabled: queryEnabled,
    staleTime: STALE_TIME_MS,
    retry: 1,
  })

  useEffect(() => {
    if (!queryEnabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAiAccumulatedResults([])
      setAiOffset(0)
      lastProcessedDataRef.current = ''
      return
    }
    if (!result.data) return

    const dataSignature =
      `${effectiveAiOffset}-${result.data.chunkCount}-${result.data.groups.length}-` +
      buildGroupsSignature(result.data.groups)
    if (dataSignature === lastProcessedDataRef.current) return
    lastProcessedDataRef.current = dataSignature

    // rag-search returns cumulative topK results. Always replacing keeps ranking,
    // scores, and snippets fresh when existing note groups are updated.
    setAiAccumulatedResults(result.data.groups)
  }, [effectiveAiOffset, queryEnabled, result.data])

  const aiHasMore =
    queryEnabled &&
    !!result.data &&
    requestedTopK < RAG_SEARCH_TOP_K_MAX &&
    result.data.hasMore === true

  const normalizedLoadingMore = result.isFetching && effectiveAiOffset > 0

  const loadMoreAI = useCallback(() => {
    if (!queryEnabled || normalizedLoadingMore || !aiHasMore) return
    setAiOffset((prev) =>
      Math.min(prev + pageSize, Math.max(0, RAG_SEARCH_TOP_K_MAX - pageSize))
    )
  }, [queryEnabled, normalizedLoadingMore, aiHasMore, pageSize])

  const refetch = useCallback(() => {
    void result.refetch()
  }, [result])

  const initialLoading =
    queryEnabled &&
    result.isFetching &&
    effectiveAiOffset === 0 &&
    aiAccumulatedResults.length === 0

  return {
    noteGroups: queryEnabled ? aiAccumulatedResults : [],
    isLoading: initialLoading,
    error: result.error ? String(result.error) : null,
    refetch,
    aiOffset: effectiveAiOffset,
    aiAccumulatedResults,
    aiHasMore,
    aiLoadingMore: normalizedLoadingMore,
    loadMoreAI,
    resetAIResults,
  }
}
