import { useInfiniteQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const PAGE_SIZE = 50 // Optimized for smooth infinite scroll (larger pages = fewer requests)

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

