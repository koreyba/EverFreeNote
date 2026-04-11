import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'
import { AI_SEARCH_MIN_QUERY_LENGTH } from '@core/constants/aiSearch'
import { RAG_SEARCH_TOP_K_MAX, getRagSearchReadonlySettings } from '@core/rag/searchSettings'
import type { RagChunk, RagNoteGroup } from '@core/types/ragSearch'

const STALE_TIME_MS = 30_000
const READONLY_RAG_SEARCH_SETTINGS = getRagSearchReadonlySettings()
export const RAG_SEARCH_EMBEDDING_MODEL_MISMATCH_CODE = 'embedding_model_mismatch'
export const RAG_SEARCH_EMBEDDING_MODEL_MISMATCH_MESSAGE =
  'Embedding model changed. Please reindex your notes to enable search.'

class RagSearchRequestError extends Error {
  code: string | null

  constructor(message: string, code: string | null = null) {
    super(message)
    this.name = 'RagSearchRequestError'
    this.code = code
  }
}

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

function hashText(value = ''): string {
  // Fast non-crypto hash for change detection signatures.
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
        ? [...group.noteTags].sort((a, b) => a.localeCompare(b)).join(',')
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

function buildChunksSignature(chunks: RagChunk[]): string {
  return chunks
    .map((chunk) =>
      `${chunk.noteId}:${chunk.chunkIndex}:${chunk.charOffset}:${chunk.similarity.toFixed(6)}:` +
      `${hashText(chunk.content)}:${hashText(chunk.bodyContent ?? chunk.content)}:${hashText(chunk.overlapPrefix)}`
    )
    .join('||')
}

interface UseAIPaginatedSearchOptions {
  query: string
  topK: number
  threshold: number
  filterTag: string | null
  isEnabled: boolean
  resultMode?: 'note' | 'chunk'
}

interface UseAIPaginatedSearchResult {
  noteGroups: RagNoteGroup[]
  chunks: RagChunk[]
  isLoading: boolean
  error: string | null
  errorCode: string | null
  refetch: () => void
  aiOffset: number
  aiAccumulatedResults: RagNoteGroup[]
  aiAccumulatedChunks: RagChunk[]
  aiHasMore: boolean
  aiLoadingMore: boolean
  loadMoreAI: () => void
  resetAIResults: () => void
}

const readInvokeErrorPayload = async (error: unknown): Promise<{ message: string | null; code: string | null }> => {
  const context = (error as { context?: unknown } | null)?.context as {
    clone?: () => { json?: () => Promise<unknown> }
    json?: () => Promise<unknown>
  } | undefined

  const reader = typeof context?.clone === 'function'
    ? context.clone()
    : context

  if (!reader || typeof reader.json !== 'function') {
    return { message: null, code: null }
  }

  try {
    const payload = await reader.json()
    return {
      message: typeof (payload as { error?: unknown } | null)?.error === 'string'
        ? (payload as { error: string }).error
        : null,
      code: typeof (payload as { code?: unknown } | null)?.code === 'string'
        ? (payload as { code: string }).code
        : null,
    }
  } catch {
    return { message: null, code: null }
  }
}

const toRagSearchRequestError = async (error: unknown): Promise<RagSearchRequestError> => {
  const payload = await readInvokeErrorPayload(error)
  const fallbackMessage = error instanceof Error
    ? error.message
    : typeof (error as { message?: unknown } | null)?.message === 'string'
      ? (error as { message: string }).message
      : 'AI Search failed'
  return new RagSearchRequestError(payload.message ?? fallbackMessage, payload.code)
}

const shouldRetryAiSearch = (failureCount: number, error: unknown) => (
  !(
    error instanceof RagSearchRequestError &&
    error.code === RAG_SEARCH_EMBEDDING_MODEL_MISMATCH_CODE
  ) &&
  failureCount < 1
)

export function useAIPaginatedSearch({
  query,
  topK,
  threshold,
  filterTag,
  isEnabled,
  resultMode = 'chunk',
}: UseAIPaginatedSearchOptions): UseAIPaginatedSearchResult {
  const { supabase } = useSupabase()
  const pageSize = Math.max(1, Math.min(topK, RAG_SEARCH_TOP_K_MAX))

  const [aiOffset, setAiOffset] = useState(0)
  const [aiAccumulatedResults, setAiAccumulatedResults] = useState<RagNoteGroup[]>([])
  const [aiAccumulatedChunks, setAiAccumulatedChunks] = useState<RagChunk[]>([])

  const lastProcessedDataRef = useRef<string>('')

  const trimmedQuery = query.trim()
  const queryEnabled = isEnabled && trimmedQuery.length >= AI_SEARCH_MIN_QUERY_LENGTH
  const normalizedThreshold = threshold.toFixed(2)
  const normalizedThresholdValue = Number(normalizedThreshold)
  const searchIdentity =
    `${trimmedQuery}::${pageSize}::${normalizedThreshold}::${filterTag ?? ''}::${isEnabled}::${resultMode}`
  const [committedIdentity, setCommittedIdentity] = useState(searchIdentity)
  const identityCommitted = committedIdentity === searchIdentity
  const effectiveAiOffset = identityCommitted ? aiOffset : 0

  const requestedTopK = useMemo(
    () => Math.min(RAG_SEARCH_TOP_K_MAX, pageSize + effectiveAiOffset),
    [pageSize, effectiveAiOffset]
  )

  const resetAIResults = useCallback(() => {
    setAiOffset(0)
    setAiAccumulatedResults([])
    setAiAccumulatedChunks([])
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
    queryKey: ['aiSearch', trimmedQuery, pageSize, normalizedThreshold, filterTag, requestedTopK, resultMode],
    queryFn: async () => {
      const fetchChunkWindow = async (chunkLimit: number) => {
        const { data, error } = await supabase.functions.invoke('rag-search', {
          body: {
            query: trimmedQuery,
            topK: chunkLimit,
            threshold: normalizedThresholdValue,
            filterTag: filterTag ?? null,
          },
        })

        if (error) throw await toRagSearchRequestError(error)

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
    retry: shouldRetryAiSearch,
  })

  useEffect(() => {
    if (!queryEnabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

    // rag-search returns cumulative topK results. Always replacing keeps ranking,
    // scores, and snippets fresh when existing note groups are updated.
    setAiAccumulatedResults(result.data.groups)
    setAiAccumulatedChunks(result.data.chunks)
  }, [effectiveAiOffset, queryEnabled, result.data])

  const aiHasMore =
    identityCommitted &&
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
    (!identityCommitted || (
      result.isFetching &&
      effectiveAiOffset === 0 &&
      aiAccumulatedResults.length === 0
    ))

  return {
    noteGroups: queryEnabled && identityCommitted ? aiAccumulatedResults : [],
    chunks: queryEnabled && identityCommitted ? aiAccumulatedChunks : [],
    isLoading: initialLoading,
    error: result.error instanceof Error
      ? result.error.message
      : (result.error ? String(result.error) : null),
    errorCode: result.error instanceof RagSearchRequestError ? result.error.code : null,
    refetch,
    aiOffset: effectiveAiOffset,
    aiAccumulatedResults: queryEnabled && identityCommitted ? aiAccumulatedResults : [],
    aiAccumulatedChunks: queryEnabled && identityCommitted ? aiAccumulatedChunks : [],
    aiHasMore,
    aiLoadingMore: normalizedLoadingMore,
    loadMoreAI,
    resetAIResults,
  }
}
