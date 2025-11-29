import { useInfiniteQuery, useQuery, InfiniteData } from '@tanstack/react-query'
import { useSupabase } from '@/lib/providers/SupabaseProvider'
import { NoteService } from '@core/services/notes'
import { SearchService, SearchResult } from '@core/services/search'
import { useState, useEffect, useMemo } from 'react'

import type { FtsSearchResult, Tables } from '@/supabase/types'

const PAGE_SIZE = 50 // Optimized for smooth infinite scroll (larger pages = fewer requests)
const SEARCH_DEBOUNCE_MS = 300 // Debounce search input
const SEARCH_STALE_TIME_MS = 30000 // Cache search results for 30s

type Note = Tables<'notes'>

interface NotesPage {
  notes: Note[]
  nextCursor?: number
  totalCount: number
  hasMore: boolean
}

interface UseNotesQueryOptions {
  userId?: string
  searchQuery?: string
  selectedTag?: string | null
  enabled?: boolean
}

/**
 * Custom hook for fetching paginated notes with search and filter support
 * Uses React Query for caching and infinite scroll pagination
 */
export function useNotesQuery({ userId, searchQuery = '', selectedTag = null, enabled = true }: UseNotesQueryOptions = {}) {
  const { supabase } = useSupabase()
  const noteService = useMemo(() => new NoteService(supabase), [supabase])

  return useInfiniteQuery<NotesPage>({
    enabled: !!enabled,
    // Query key includes userId for proper cache isolation between users
    queryKey: ['notes', userId, searchQuery, selectedTag],

    queryFn: async ({ pageParam = 0 }) => {
      const page = pageParam as number
      
      return noteService.getNotes(userId!, {
        page,
        pageSize: PAGE_SIZE,
        tag: selectedTag,
        searchQuery
      })
    },

    // Get next page cursor
    getNextPageParam: (lastPage) => lastPage.nextCursor,

    // Initial page param
    initialPageParam: 0,

    // Stale time from design review: 10 minutes
    staleTime: 1000 * 60 * 10,
  })
}

/**
 * Helper hook to get flattened notes array from infinite query
 */
export function useFlattenedNotes(queryResult: { data?: InfiniteData<NotesPage> }) {
  if (!queryResult.data?.pages) return []

  return queryResult.data.pages.flatMap(page => page.notes)
}

/**
 * Custom hook for debouncing a value
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Detect language from browser locale
 */
function detectBrowserLanguage(): LanguageCode {
  if (typeof navigator === 'undefined') return 'ru'

  const locale = navigator.language || (navigator as { userLanguage?: string }).userLanguage || 'ru'
  const lang = locale.split('-')[0].toLowerCase()

  // Map to supported languages
  if (lang === 'en') return 'en'
  if (lang === 'uk') return 'uk'
  return 'ru' // Default to Russian
}

type LanguageCode = 'ru' | 'en' | 'uk'

interface SearchOptions {
  language?: LanguageCode
  minRank?: number
  limit?: number
  offset?: number
  selectedTag?: string | null
  enabled?: boolean
}

export type SearchQueryResult = SearchResult & {
  query: string
  executionTime: number
}

/**
 * Custom hook for FTS search with debouncing and caching
 * Uses Supabase RPC function directly (SPA compatible)
 */
export function useSearchNotes(query: string, userId?: string, options: SearchOptions = {}) {
  const { supabase } = useSupabase()
  const searchService = useMemo(() => new SearchService(supabase), [supabase])

  const {
    language = detectBrowserLanguage(),
    minRank = 0.01,
    limit = 20,
    offset = 0,
    selectedTag = null,
    enabled = true
  } = options

  // Debounce query to avoid excessive API calls
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)

  // Validate query length (min 3 characters)
  const isValidQuery = Boolean(debouncedQuery && debouncedQuery.trim().length >= 3 && userId)

  return useQuery<SearchQueryResult>({
    queryKey: ['notes', 'search', debouncedQuery, language, minRank, limit, offset, selectedTag, userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required for search')
      }

      const startTime = Date.now()
      const result = await searchService.searchNotes(userId, debouncedQuery, {
        language,
        minRank,
        limit,
        offset,
        tag: selectedTag ?? undefined
      })
      const executionTime = Date.now() - startTime

      return {
        ...result,
        query: debouncedQuery,
        executionTime
      }
    },
    enabled: !!(enabled && isValidQuery),
    staleTime: SEARCH_STALE_TIME_MS,
    // Keep previous data while fetching new results (better UX)
    placeholderData: (previousData: SearchQueryResult | undefined) => previousData,
    // Don't retry FTS failures - let it fall back gracefully
    retry: false,
  })
}

