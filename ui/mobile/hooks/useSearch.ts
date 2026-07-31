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

type SearchQueryContext = {
    userId: string
    trimmed: string
    tag: string | null
    pageParam: number
    isOnline: boolean
    searchService: SearchService
    noteService: NoteService
}

function createEmptySearchPage(): SearchPage {
    return { results: [], total: 0, hasMore: false }
}

async function searchOnline({ userId, trimmed, tag, pageParam, searchService, noteService }: SearchQueryContext): Promise<SearchPage> {
    const offset = pageParam * SEARCH_CONFIG.PAGE_SIZE

    if (trimmed) {
        const result = await searchService.searchNotes(userId, trimmed, {
            tag,
            limit: SEARCH_CONFIG.PAGE_SIZE,
            offset,
        })
        const results = result.results
        const total = result.total
        const hasMore = offset + results.length < total
        return {
            results,
            total,
            hasMore,
            nextCursor: hasMore ? pageParam + 1 : undefined,
            method: result.method,
        }
    }

    const result = await noteService.getNotes(userId, {
        tag,
        page: pageParam,
        pageSize: SEARCH_CONFIG.PAGE_SIZE,
    })
    return {
        results: result.notes,
        total: result.totalCount,
        hasMore: result.hasMore,
        nextCursor: result.hasMore ? pageParam + 1 : undefined,
        method: 'tag_only',
    }
}

async function searchOffline({ userId, trimmed, tag, pageParam }: SearchQueryContext): Promise<SearchPage> {
    const offset = pageParam * SEARCH_CONFIG.PAGE_SIZE

    if (!trimmed && tag) {
        const { notes, total } = await databaseService.getLocalNotesByTag(userId, tag, {
            limit: SEARCH_CONFIG.PAGE_SIZE,
            offset,
        })
        const hasMore = offset + notes.length < total
        return {
            results: notes,
            total,
            hasMore,
            nextCursor: hasMore ? pageParam + 1 : undefined,
            method: 'local_tag_only',
        }
    }

    const results = await databaseService.searchNotes(trimmed, userId, {
        limit: SEARCH_CONFIG.PAGE_SIZE,
        offset,
        tag,
    })
    const hasMore = results.length === SEARCH_CONFIG.PAGE_SIZE
    return {
        results,
        total: offset + results.length,
        hasMore,
        nextCursor: hasMore ? pageParam + 1 : undefined,
        method: 'local_fts',
    }
}

async function fetchSearchPage(context: SearchQueryContext): Promise<SearchPage> {
    const { trimmed, tag, isOnline } = context

    if (!trimmed && !tag) return createEmptySearchPage()

    if (isOnline) {
        try {
            return await searchOnline(context)
        } catch (error) {
            console.warn('Online search failed, falling back to local FTS:', error)
        }
    }

    return searchOffline(context)
}

export function useSearch(query: string, options: { tag?: string | null; enabled?: boolean } = {}) {
    const { client, user } = useSupabase()
    const searchService = new SearchService(client)
    const noteService = new NoteService(client)
    const isOnline = useNetworkStatus()
    const tag = options.tag && options.tag.trim().length > 0 ? options.tag : null
    const isEnabled = options.enabled ?? true
    const trimmed = query.trim()
    const queryKey = ['search', user?.id, trimmed, tag] as const

    return useInfiniteQuery<SearchPage, Error, InfiniteData<SearchPage>, typeof queryKey, number>({
        queryKey,
        initialPageParam: 0,
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
        queryFn: async ({ pageParam }) => {
            if (!user?.id) throw new Error('User not authenticated')
            return fetchSearchPage({ userId: user.id, trimmed, tag, pageParam, isOnline, searchService, noteService })
        },
        enabled: isEnabled && !!user?.id && (trimmed.length >= 2 || !!tag),
        staleTime: 0, // Don't cache search results for long
    })
}
