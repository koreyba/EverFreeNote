import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query"

import { SEARCH_CONFIG } from "@core/constants/search"
import type { AIIndexFilter, AIIndexNotesPage, AIIndexNoteRow, AIIndexStatus } from "@core/types/aiIndex"
import { buildTsQuery, detectLanguage, ftsLanguage } from "@core/utils/search"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"

const AI_INDEX_PAGE_SIZE = 50
const AI_INDEX_STALE_TIME_MS = 30_000

type AIIndexRpcRow = {
  id: string
  title: string | null
  updated_at: string
  last_indexed_at: string | null
  status: AIIndexStatus
  total_count: number | string | null
}

function parseTotalCount(rows: AIIndexRpcRow[]): number {
  const rawValue = rows[0]?.total_count
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) return rawValue
  if (typeof rawValue === "string") {
    const parsed = Number.parseInt(rawValue, 10)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function mapRow(row: AIIndexRpcRow): AIIndexNoteRow {
  return {
    id: row.id,
    title: typeof row.title === "string" ? row.title : "",
    updatedAt: row.updated_at,
    lastIndexedAt: row.last_indexed_at,
    status: row.status,
  }
}

export function getAIIndexNotesQueryPrefix(userId?: string) {
  return ["ai-index-notes", userId ?? null] as const
}

function normalizeSearchQuery(searchQuery: string) {
  return searchQuery.trim()
}

export function getAIIndexNotesQueryKey(userId: string | undefined, filter: AIIndexFilter, searchQuery = "") {
  return [...getAIIndexNotesQueryPrefix(userId), filter, normalizeSearchQuery(searchQuery)] as const
}

export function useAIIndexNotes(filter: AIIndexFilter = "all", searchQuery = "", enabled = true) {
  const { supabase, user } = useSupabase()
  const normalizedSearchQuery = normalizeSearchQuery(searchQuery)
  const activeSearchQuery =
    normalizedSearchQuery.length >= SEARCH_CONFIG.MIN_QUERY_LENGTH ? normalizedSearchQuery : ""
  const searchTsQuery = buildTsQuery(activeSearchQuery)
  const searchLanguage = searchTsQuery ? ftsLanguage(detectLanguage(activeSearchQuery)) : null

  return useInfiniteQuery<AIIndexNotesPage>({
    queryKey: getAIIndexNotesQueryKey(user?.id, filter, activeSearchQuery),
    enabled: Boolean(enabled && user?.id),
    initialPageParam: 0,
    staleTime: AI_INDEX_STALE_TIME_MS,
    queryFn: async ({ pageParam = 0 }) => {
      const page = pageParam as number
      const { data, error } = await supabase.rpc("get_ai_index_notes", {
        filter_status: filter,
        page_number: page,
        page_size: AI_INDEX_PAGE_SIZE,
        search_query: activeSearchQuery || null,
        search_ts_query: searchTsQuery,
        search_language: searchLanguage,
      })

      if (error) throw error

      const rows = (data ?? []) as AIIndexRpcRow[]
      const totalCount = parseTotalCount(rows)
      const notes = rows.map(mapRow)
      const hasMore = page * AI_INDEX_PAGE_SIZE + notes.length < totalCount

      return {
        notes,
        totalCount,
        hasMore,
        nextCursor: hasMore ? page + 1 : undefined,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}

export function useFlattenedAIIndexNotes(queryResult: { data?: InfiniteData<AIIndexNotesPage> }) {
  return queryResult.data?.pages.flatMap((page) => page.notes) ?? []
}
