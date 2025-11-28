import { useInfiniteQuery, useQuery, InfiniteData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

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
  const supabase = createClient()

  return useInfiniteQuery<NotesPage>({
    enabled: !!enabled,
    // Query key includes userId for proper cache isolation between users
    queryKey: ['notes', userId, searchQuery, selectedTag],

    queryFn: async ({ pageParam = 0 }) => {
      const page = pageParam as number
      // Calculate range for pagination
      const start = page
      const end = page + PAGE_SIZE - 1

      // Build query with optimizations from Phase 1
      let query = supabase
        .from('notes')
        .select('id, title, description, tags, created_at, updated_at', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(start, end)

      // Apply tag filter on server-side (uses GIN index)
      if (selectedTag) {
        query = query.contains('tags', [selectedTag])
      }

      // Apply search filter
      // TODO Phase 6: Replace with full-text search using FTS index
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        query = query.or(`title.ilike.%${searchLower}%,description.ilike.%${searchLower}%`)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching notes:', error)
        throw error
      }

      return {
        notes: (data as Note[]) || [],
        nextCursor: data && data.length === PAGE_SIZE ? end + 1 : undefined,
        totalCount: count || 0,
        hasMore: !!(data && data.length === PAGE_SIZE)
      }
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
  enabled?: boolean
}

export type SearchQueryResult = {
  results: FtsSearchResult[]
  total: number
  query: string
 method: 'fts' | 'fallback'
  executionTime: number
  error?: string
}

/**
 * Custom hook for FTS search with debouncing and caching
 * Uses Supabase RPC function directly (SPA compatible)
 */
export function useSearchNotes(query: string, userId?: string, options: SearchOptions = {}) {
  const {
    language = detectBrowserLanguage(),
    minRank = 0.01,
    limit = 20,
    offset = 0,
    enabled = true
  } = options

  // Debounce query to avoid excessive API calls
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)

  // Validate query length (min 3 characters)
  const isValidQuery = Boolean(debouncedQuery && debouncedQuery.trim().length >= 3 && userId)

  return useQuery<SearchQueryResult>({
    queryKey: ['notes', 'search', debouncedQuery, language, minRank, limit, offset, userId],
    queryFn: async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const { buildTsQuery } = await import('@/lib/supabase/search')

      const supabase = createClient()

      if (!userId) {
        throw new Error('User ID is required for search')
      }

      // Build sanitized ts_query
      const tsQuery = buildTsQuery(debouncedQuery, language)
      const ftsLanguage = language === 'uk' ? 'russian' : language === 'en' ? 'english' : 'russian'

      const startTime = Date.now()

      try {
        // Execute FTS RPC function
        const { data, error } = await supabase
          .rpc('search_notes_fts', {
            search_query: tsQuery,
            search_language: ftsLanguage,
            min_rank: minRank,
            result_limit: limit,
            result_offset: offset,
            search_user_id: userId
          })

        const executionTime = Date.now() - startTime

        if (error) {
          console.warn('FTS search failed, falling back to regular search:', error.message)
          throw new Error(`FTS search failed: ${error.message}`)
        }

        return {
          results: data || [],
          total: data?.length || 0,
          query: debouncedQuery,
          method: 'fts',
          executionTime
        }
      } catch (error: unknown) {
        // If FTS fails, don't throw - let the component fall back to regular search
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.warn('FTS search error (will use fallback):', errorMessage)
        return {
          results: [],
          total: 0,
          query: debouncedQuery,
          method: 'fallback',
          executionTime: Date.now() - startTime,
          error: errorMessage
        }
      }
    },
    enabled: !!(enabled && isValidQuery),
    staleTime: SEARCH_STALE_TIME_MS,
    // Keep previous data while fetching new results (better UX)
    placeholderData: (previousData) => previousData,
    // Don't retry FTS failures - let it fall back gracefully
    retry: false,
  })
}

