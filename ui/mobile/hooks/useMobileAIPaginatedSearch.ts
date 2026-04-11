import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSupabase } from '@ui/mobile/providers'
import {
  AI_SEARCH_MIN_QUERY_LENGTH,
} from '@core/constants/aiSearch'
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
      (acceptedChunk) =>
        Math.abs(chunk.charOffset - acceptedChunk.charOffset) <
        READONLY_RAG_SEARCH_SETTINGS.offset_delta_threshold
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
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function buildGroupsSignature(groups: RagNoteGroup[]): string {
  return groups
    .map((group) => {
      const tagsSignature = Array.isArray(group.noteTags)
        ? [...group.noteTags].sort((left, right) => left.localeCompare(right)).join(',')
        : ''
      const chunksSignature = group.chunks
        .map((chunk) =>
          `${chunk.chunkIndex}:${chunk.charOffset}:${chunk.similarity.toFixed(6)}:` +
          `${hashText(chunk.content)}:${hashText(chunk.bodyContent)}:${hashText(chunk.overlapPrefix)}`
        )
        .join('|')
      return `${group.noteId}:${hashText(group.noteTitle)}:${hashText(tagsSignature)}:${group.topScore.toFixed(6)}:${group.hiddenCount}:${chunksSignature}`
    })
    .join('||')
}

function buildChunksSignature(chunks: RagChunk[]): string {
  return chunks
    .map((chunk) =>
      `${chunk.noteId}:${chunk.chunkIndex}:${chunk.charOffset}:${chunk.similarity.toFixed(6)}:` +
      `${hashText(chunk.content)}:${hashText(chunk.bodyContent)}:${hashText(chunk.overlapPrefix)}`
    )
    .join('||')
}

type UseMobileAIPaginatedSearchOptions = {
  query: string
  topK: number
  threshold: number
  filterTag: string | null
  isEnabled: boolean
  resultMode?: 'note' | 'chunk'
}

export function useMobileAIPaginatedSearch({
  query,
  topK,
  threshold,
  filterTag,
  isEnabled,
  resultMode = 'chunk',
}: UseMobileAIPaginatedSearchOptions) {
  const { client, user } = useSupabase()
  const pageSize = Math.max(1, Math.min(topK, RAG_SEARCH_TOP_K_MAX))

  const [aiOffset, setAiOffset] = useState(0)
  const [aiAccumulatedResults, setAiAccumulatedResults] = useState<RagNoteGroup[]>([])
  const [aiAccumulatedChunks, setAiAccumulatedChunks] = useState<RagChunk[]>([])
  const lastProcessedDataRef = useRef('')

  const trimmedQuery = query.trim()
  const queryEnabled = isEnabled && !!user?.id && trimmedQuery.length >= AI_SEARCH_MIN_QUERY_LENGTH
  const normalizedThreshold = threshold.toFixed(2)
  const normalizedThresholdValue = Number(normalizedThreshold)
  const searchIdentity =
    `${user?.id ?? 'anonymous'}::${trimmedQuery}::${pageSize}::${normalizedThreshold}::` +
    `${filterTag ?? ''}::${isEnabled}::${resultMode}`
  const [committedIdentity, setCommittedIdentity] = useState(searchIdentity)
  const identityCommitted = committedIdentity === searchIdentity
  const effectiveAiOffset = identityCommitted ? aiOffset : 0

  const requestedTopK = useMemo(
    () => Math.min(RAG_SEARCH_TOP_K_MAX, pageSize + effectiveAiOffset),
    [effectiveAiOffset, pageSize]
  )

  const resetAIResults = useCallback(() => {
    setAiOffset(0)
    setAiAccumulatedResults([])
    setAiAccumulatedChunks([])
    lastProcessedDataRef.current = ''
  }, [])

  useEffect(() => {
    if (committedIdentity === searchIdentity) return
    setCommittedIdentity(searchIdentity)
    resetAIResults()
  }, [committedIdentity, resetAIResults, searchIdentity])

  const result = useQuery({
    queryKey: [
      'mobileAiSearch',
      user?.id ?? null,
      trimmedQuery,
      pageSize,
      normalizedThreshold,
      filterTag,
      requestedTopK,
      resultMode,
    ],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      const fetchChunkWindow = async (chunkLimit: number) => {
        const { data, error } = await client.functions.invoke('rag-search', {
          body: {
            query: trimmedQuery,
            topK: chunkLimit,
            threshold: normalizedThresholdValue,
            filterTag: filterTag ?? null,
          },
        })

        if (error) throw new Error(error.message ?? 'AI Search failed')

        const chunks = Array.isArray(data?.chunks) ? (data.chunks as RagChunk[]) : []
        return {
          chunkCount: chunks.length,
          hasMore: data?.hasMore === true,
          chunks,
          groups: groupByNote(chunks),
        }
      }

      if (resultMode === 'chunk') {
        return fetchChunkWindow(requestedTopK)
      }

      let chunkLimit = requestedTopK
      let noteResult = await fetchChunkWindow(chunkLimit)

      while (
        noteResult.hasMore &&
        noteResult.groups.length < requestedTopK &&
        chunkLimit < RAG_SEARCH_TOP_K_MAX
      ) {
        chunkLimit = Math.min(RAG_SEARCH_TOP_K_MAX, chunkLimit + pageSize)
        noteResult = await fetchChunkWindow(chunkLimit)
      }

      return {
        chunkCount: noteResult.chunkCount,
        hasMore: noteResult.groups.length > requestedTopK || noteResult.hasMore,
        chunks: noteResult.chunks,
        groups: noteResult.groups.slice(0, requestedTopK),
      }
    },
    enabled: queryEnabled,
    staleTime: STALE_TIME_MS,
    retry: 1,
  })

  useEffect(() => {
    if (!queryEnabled) {
      setAiAccumulatedResults([])
      setAiAccumulatedChunks([])
      setAiOffset(0)
      lastProcessedDataRef.current = ''
      return
    }
    if (!result.data) return

    const dataSignature =
      `${effectiveAiOffset}-${result.data.chunkCount}-${result.data.groups.length}-` +
      `${buildChunksSignature(result.data.chunks)}::${buildGroupsSignature(result.data.groups)}`

    if (dataSignature === lastProcessedDataRef.current) return
    lastProcessedDataRef.current = dataSignature
    setAiAccumulatedResults(result.data.groups)
    setAiAccumulatedChunks(result.data.chunks)
  }, [effectiveAiOffset, queryEnabled, result.data])

  const aiHasMore =
    identityCommitted &&
    queryEnabled &&
    !!result.data &&
    requestedTopK < RAG_SEARCH_TOP_K_MAX &&
    result.data.hasMore === true

  const aiLoadingMore = result.isFetching && effectiveAiOffset > 0
  const identitySettled = identityCommitted

  const loadMoreAI = useCallback(() => {
    if (!queryEnabled || aiLoadingMore || !aiHasMore) return
    setAiOffset((prev) =>
      Math.min(prev + pageSize, Math.max(0, RAG_SEARCH_TOP_K_MAX - pageSize))
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
  const isRefreshing =
    queryEnabled &&
    result.isFetching &&
    effectiveAiOffset === 0 &&
    aiAccumulatedResults.length > 0

  return {
    noteGroups: queryEnabled && identitySettled ? aiAccumulatedResults : [],
    chunks: queryEnabled && identitySettled ? aiAccumulatedChunks : [],
    isLoading,
    isRefreshing,
    error: queryEnabled && identitySettled && result.error ? String(result.error) : null,
    refetch,
    aiHasMore,
    aiLoadingMore,
    loadMoreAI,
    resetAIResults,
  }
}
