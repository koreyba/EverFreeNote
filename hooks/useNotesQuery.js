import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

const PAGE_SIZE = 50 // Optimized for smooth infinite scroll (larger pages = fewer requests)
const SEARCH_DEBOUNCE_MS = 300 // Debounce search input
const SEARCH_STALE_TIME_MS = 30000 // Cache search results for 30s

/**
 * Custom hook for fetching paginated notes with search and filter support
 * Uses React Query for caching and infinite scroll pagination
 * 
 * @param {Object} options - Query options
 * @param {string} options.userId - User ID for query isolation
 * @param {string} options.searchQuery - Search term for filtering notes
 * @param {string|null} options.selectedTag - Tag to filter by
 * @param {boolean} options.enabled - Whether to enable the query
 * @returns {Object} Query result with notes data and pagination controls
 */
export function useNotesQuery({ userId, searchQuery = '', selectedTag = null, enabled = true } = {}) {
  const supabase = createClient()
  
  return useInfiniteQuery({
    enabled,
    // Query key includes userId for proper cache isolation between users
    queryKey: ['notes', userId, searchQuery, selectedTag],
    
    queryFn: async ({ pageParam = 0 }) => {
      // Calculate range for pagination
      const start = pageParam
      const end = pageParam + PAGE_SIZE - 1
      
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
        notes: data || [],
        nextCursor: data && data.length === PAGE_SIZE ? end + 1 : undefined,
        totalCount: count || 0,
        hasMore: data && data.length === PAGE_SIZE
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
 * @param {Object} queryResult - Result from useNotesQuery
 * @returns {Array} Flattened array of all notes across pages
 */
export function useFlattenedNotes(queryResult) {
  if (!queryResult.data?.pages) return []
  
  return queryResult.data.pages.flatMap(page => page.notes)
}

/**
 * Custom hook for debouncing a value
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} Debounced value
 */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  
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
 * @returns {string} Language code (ru, en, uk)
 */
function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return 'ru'
  
  const locale = navigator.language || navigator.userLanguage || 'ru'
  const lang = locale.split('-')[0].toLowerCase()
  
  // Map to supported languages
  if (lang === 'en') return 'en'
  if (lang === 'uk') return 'uk'
  return 'ru' // Default to Russian
}

/**
 * Custom hook for FTS search with debouncing and caching
 * Uses new /api/notes/search endpoint with Full-Text Search
 * 
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @param {string} options.language - Language code (auto-detected by default)
 * @param {number} options.minRank - Minimum relevance rank (default: 0.1)
 * @param {number} options.limit - Results limit (default: 20)
 * @param {number} options.offset - Pagination offset (default: 0)
 * @param {boolean} options.enabled - Whether to enable the query (default: true)
 * @returns {Object} Query result with search results and metadata
 */
export function useSearchNotes(query, options = {}) {
  const {
    language = detectBrowserLanguage(),
    minRank = 0.1,
    limit = 20,
    offset = 0,
    enabled = true
  } = options
  
  // Debounce query to avoid excessive API calls
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)
  
  // Validate query length (min 3 characters)
  const isValidQuery = debouncedQuery && debouncedQuery.trim().length >= 3
  
  return useQuery({
    queryKey: ['notes', 'search', debouncedQuery, language, minRank, limit, offset],
    queryFn: async () => {
      // Build query parameters
      const params = new URLSearchParams({
        q: debouncedQuery,
        lang: language,
        minRank: minRank.toString(),
        limit: limit.toString(),
        offset: offset.toString()
      })
      
      // Call search API
      const response = await fetch(`/api/notes/search?${params}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Search failed')
      }
      
      return response.json()
    },
    enabled: enabled && isValidQuery,
    staleTime: SEARCH_STALE_TIME_MS,
    // Keep previous data while fetching new results (better UX)
    placeholderData: (previousData) => previousData,
  })
}

