import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'
import { databaseService } from '../services/database'
import { useSupabase } from '@ui/mobile/providers'
import { SearchService } from '@core/services/search'
import { NoteService } from '@core/services/notes'
import { useNetworkStatus } from './useNetworkStatus'
import { SEARCH_CONFIG } from '@core/constants/search'

type SearchResultItem = {
    id: string
    title: string | null
    description: string | null
    tags: string[] | null
    updated_at: string
    created_at: string
    user_id?: string
    snippet?: string | null
    headline?: string | null
    rank?: number | null
}

type SearchPage = {
    results: SearchResultItem[]
    total: number
    hasMore: boolean
    nextCursor?: number
    method?: string
}

export function useSearch(query: string, options: { tag?: string | null } = {}) {
    const { client, user } = useSupabase()
    const searchService = new SearchService(client)
    const noteService = new NoteService(client)
    const isOnline = useNetworkStatus()
    const tag = options.tag && options.tag.trim().length > 0 ? options.tag : null
    const trimmed = query.trim()
    const queryKey = ['search', user?.id, trimmed, tag] as const

    return useInfiniteQuery<SearchPage, Error, InfiniteData<SearchPage>, typeof queryKey, number>({
        queryKey,
        initialPageParam: 0,
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
        queryFn: async ({ pageParam }) => {
            if (!user?.id) throw new Error('User not authenticated')
            if (!trimmed && !tag) return { results: [], total: 0, hasMore: false }

            const offset = pageParam * SEARCH_CONFIG.PAGE_SIZE

            if (isOnline) {
                try {
                    if (trimmed) {
                        const result = await searchService.searchNotes(user.id, trimmed, {
                            tag,
                            limit: SEARCH_CONFIG.PAGE_SIZE,
                            offset,
                        })
                        const results = (result.results ?? []) as SearchResultItem[]
                        const total = result.total ?? results.length
                        const hasMore = offset + results.length < total
                        return {
                            results,
                            total,
                            hasMore,
                            nextCursor: hasMore ? pageParam + 1 : undefined,
                            method: result.method,
                        }
                    }

                    const result = await noteService.getNotes(user.id, {
                        tag: tag ?? null,
                        page: pageParam,
                        pageSize: SEARCH_CONFIG.PAGE_SIZE,
                    })
                    return {
                        results: result.notes as SearchResultItem[],
                        total: result.totalCount,
                        hasMore: result.hasMore,
                        nextCursor: result.hasMore ? pageParam + 1 : undefined,
                        method: 'tag_only',
                    }
                } catch (error) {
                    console.warn('Online search failed, falling back to local FTS:', error)
                }
            }

            // Offline or error fallback: Use SQLite FTS5
            if (!trimmed && tag) {
                const { notes, total } = await databaseService.getLocalNotesByTag(user.id, tag, {
                    limit: SEARCH_CONFIG.PAGE_SIZE,
                    offset,
                })
                const hasMore = offset + notes.length < total
                return {
                    results: notes as SearchResultItem[],
                    total,
                    hasMore,
                    nextCursor: hasMore ? pageParam + 1 : undefined,
                    method: 'local_tag_only',
                }
            }

            const results = await databaseService.searchNotes(trimmed, user.id, {
                limit: SEARCH_CONFIG.PAGE_SIZE,
                offset,
                tag,
            })
            const baseHasMore = results.length === SEARCH_CONFIG.PAGE_SIZE
            return {
                results: results as SearchResultItem[],
                total: offset + results.length,
                hasMore: baseHasMore,
                nextCursor: baseHasMore ? pageParam + 1 : undefined,
                method: 'local_fts',
            }
        },
        enabled: !!user?.id && (trimmed.length >= 2 || !!tag),
        staleTime: 0, // Don't cache search results for long
    })
}
