import { useQuery } from '@tanstack/react-query'
import { databaseService } from '../services/database'
import { useSupabase } from '@ui/mobile/providers'
import { SearchService } from '@core/services/search'
import { useNetworkStatus } from './useNetworkStatus'

export function useSearch(query: string) {
    const { client, user } = useSupabase()
    const searchService = new SearchService(client)
    const isOnline = useNetworkStatus()

    return useQuery({
        queryKey: ['search', user?.id, query],
        queryFn: async () => {
            if (!user?.id) throw new Error('User not authenticated')
            if (!query) return { results: [], total: 0 }

            if (isOnline) {
                try {
                    const result = await searchService.searchNotes(user.id, query)
                    return result
                } catch (error) {
                    console.warn('Online search failed, falling back to local FTS:', error)
                }
            }

            // Offline or error fallback: Use SQLite FTS5
            const results = await databaseService.searchNotes(query, user.id)
            return {
                results,
                total: results.length,
                method: 'local_fts'
            }
        },
        enabled: !!user?.id && query.length >= 2,
        staleTime: 0, // Don't cache search results for long
    })
}
