import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSupabase } from '@ui/mobile/providers'
import {
  AI_SEARCH_MIN_QUERY_LENGTH,
  OFFSET_DELTA_THRESHOLD,
  SEARCH_PRESETS,
  type SearchPreset,
} from '@core/constants/aiSearch'
import type { RagChunk, RagNoteGroup } from '@core/types/ragSearch'

const STALE_TIME_MS = 30_000
const AI_SEARCH_TOP_K_MAX = 100

function deduplicateChunks(
  chunks: RagChunk[],
  maxCount: number
): { accepted: RagChunk[]; hiddenCount: number } {
  const accepted: RagChunk[] = []
  for (const chunk of chunks) {
    const tooClose = accepted.some(
      (acceptedChunk) => Math.abs(chunk.charOffset - acceptedChunk.charOffset) < OFFSET_DELTA_THRESHOLD
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
    map.get(chunk.noteId)?.push(chunk)
  }

  const groups: RagNoteGroup[] = Array.from(map.entries()).map(([noteId, noteChunks]) => {
    const sorted = [...noteChunks].sort((left, right) => right.similarity - left.similarity)
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

  return groups.sort((left, right) => right.topScore - left.topScore)
}

function hashText(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function buildGroupsSignature(groups: RagNoteGroup[]): string {
  return groups
    .map((group) => {
      const tagsSignature = Array.isArray(group.noteTags) ? [...group.noteTags].sort().join(',') : ''
      const chunksSignature = group.chunks
        .map((chunk) =>
          `${chunk.chunkIndex}:${chunk.charOffset}:${chunk.similarity.toFixed(6)}:${hashText(chunk.content)}`
        )
        .join('|')
      return `${group.noteId}:${hashText(group.noteTitle)}:${hashText(tagsSignature)}:${group.topScore.toFixed(6)}:${group.hiddenCount}:${chunksSignature}`
    })
    .join('||')
}

type UseMobileAIPaginatedSearchOptions = {
  query: string
  preset: SearchPreset
  filterTag: string | null
  isEnabled: boolean
}

export function useMobileAIPaginatedSearch({
  query,
  preset,
  filterTag,
  isEnabled,
}: UseMobileAIPaginatedSearchOptions) {
  const { client, user } = useSupabase()
  const { topK: baseTopK, threshold } = SEARCH_PRESETS[preset]
  const pageSize = Math.max(1, baseTopK)

  const [aiOffset, setAiOffset] = useState(0)
  const [aiAccumulatedResults, setAiAccumulatedResults] = useState<RagNoteGroup[]>([])
  const lastProcessedDataRef = useRef('')

  const trimmedQuery = query.trim()
  const queryEnabled = isEnabled && !!user?.id && trimmedQuery.length >= AI_SEARCH_MIN_QUERY_LENGTH
  const searchIdentity = `${user?.id ?? 'anonymous'}::${trimmedQuery}::${preset}::${filterTag ?? ''}::${isEnabled}`
  const [committedIdentity, setCommittedIdentity] = useState(searchIdentity)
  const effectiveAiOffset = committedIdentity !== searchIdentity ? 0 : aiOffset

  const requestedTopK = useMemo(
    () => Math.min(AI_SEARCH_TOP_K_MAX, pageSize + effectiveAiOffset),
    [effectiveAiOffset, pageSize]
  )

  const resetAIResults = useCallback(() => {
    setAiOffset(0)
    setAiAccumulatedResults([])
    lastProcessedDataRef.current = ''
  }, [])

  useEffect(() => {
    if (committedIdentity === searchIdentity) return
    setCommittedIdentity(searchIdentity)
    resetAIResults()
  }, [committedIdentity, resetAIResults, searchIdentity])

  const result = useQuery({
    queryKey: ['mobileAiSearch', user?.id ?? null, trimmedQuery, preset, filterTag, requestedTopK],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data, error } = await client.functions.invoke('rag-search', {
        body: {
          query: trimmedQuery,
          topK: requestedTopK,
          threshold,
          filterTag: filterTag ?? null,
        },
      })

      if (error) throw new Error(error.message ?? 'AI Search failed')

      const chunks = Array.isArray(data?.chunks) ? (data.chunks as RagChunk[]) : []
      const availableChunkCount =
        typeof data?.availableChunkCount === 'number' ? data.availableChunkCount : chunks.length
      return {
        availableChunkCount,
        groups: groupByNote(chunks),
      }
    },
    enabled: queryEnabled,
    staleTime: STALE_TIME_MS,
    retry: 1,
  })

  useEffect(() => {
    if (!queryEnabled) {
      setAiAccumulatedResults([])
      setAiOffset(0)
      lastProcessedDataRef.current = ''
      return
    }
    if (!result.data) return

    const dataSignature =
      `${effectiveAiOffset}-${result.data.availableChunkCount}-${result.data.groups.length}-` +
      buildGroupsSignature(result.data.groups)

    if (dataSignature === lastProcessedDataRef.current) return
    lastProcessedDataRef.current = dataSignature
    setAiAccumulatedResults(result.data.groups)
  }, [effectiveAiOffset, queryEnabled, result.data])

  const aiHasMore =
    queryEnabled &&
    !!result.data &&
    requestedTopK < AI_SEARCH_TOP_K_MAX &&
    result.data.availableChunkCount >= requestedTopK

  const aiLoadingMore = result.isFetching && effectiveAiOffset > 0

  const loadMoreAI = useCallback(() => {
    if (!queryEnabled || aiLoadingMore || !aiHasMore) return
    setAiOffset((prev) =>
      Math.min(prev + pageSize, Math.max(0, AI_SEARCH_TOP_K_MAX - pageSize))
    )
  }, [aiHasMore, aiLoadingMore, pageSize, queryEnabled])

  const refetch = useCallback(() => {
    if (!queryEnabled) return
    void result.refetch()
  }, [queryEnabled, result])

  const isLoading =
    queryEnabled &&
    result.isFetching &&
    effectiveAiOffset === 0 &&
    aiAccumulatedResults.length === 0

  return {
    noteGroups: queryEnabled ? aiAccumulatedResults : [],
    isLoading,
    error: queryEnabled && result.error ? String(result.error) : null,
    refetch,
    aiHasMore,
    aiLoadingMore,
    loadMoreAI,
    resetAIResults,
  }
}
