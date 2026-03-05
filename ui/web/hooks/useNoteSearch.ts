import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

import { useFlattenedNotes, useNotesQuery, useSearchNotes } from './useNotesQuery'
import { useInfiniteScroll } from './useInfiniteScroll'
import type { SearchResult } from '@core/types/domain'
import { computeFtsHasMore, computeFtsTotal } from '@core/services/ftsPagination'
import { SEARCH_CONFIG } from '@core/constants/search'
import { shouldUpdateTagFilter } from '@core/utils/search'

export function useNoteSearch(userId: string | undefined) {
    // -- State --
    // Note: searchQuery was removed as a duplicate of ftsSearchQuery.
    // Both were always set together; ftsSearchQuery is returned as searchQuery for API compatibility.
    const [ftsSearchQuery, setFtsSearchQuery] = useState("")
    const [filterByTag, setFilterByTag] = useState<string | null>(null)
    const [ftsOffset, setFtsOffset] = useState(0)
    const [ftsAccumulatedResults, setFtsAccumulatedResults] = useState<SearchResult[]>([])
    const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false)
    const ftsLimit = SEARCH_CONFIG.PAGE_SIZE
    const lastProcessedDataRef = useRef<string>('')
    const prevQueryRef = useRef<string>('')

    // -- Logic --

    const handleSearch = useCallback((query: string) => {
        const isNewQuery = query.trim() !== prevQueryRef.current.trim()
        prevQueryRef.current = query
        setFtsSearchQuery(query)
        setFtsOffset(0)
        // Only reset accumulated results when the query actually changes.
        // Calling handleSearch with the same query (e.g. pressing Enter) must not
        // clear results, because the React Query cache won't change reference and
        // the repopulation effect won't re-run.
        if (isNewQuery) {
            setFtsAccumulatedResults([])
            lastProcessedDataRef.current = ''
        }
        if (query.trim().length > 0) {
            setIsSearchPanelOpen(true)
        }
    }, [])

    const handleTagClick = useCallback((tag: string) => {
        if (!shouldUpdateTagFilter(filterByTag, tag)) return
        setFilterByTag(tag)
        setFtsOffset(0)
        setFtsAccumulatedResults([])
        lastProcessedDataRef.current = ''
        // Tag filtering now belongs to the search panel context.
        setIsSearchPanelOpen(true)
        // Don't reset search - preserve search state when clicking tags
    }, [filterByTag, setIsSearchPanelOpen])

    const handleClearTagFilter = useCallback(() => {
        setFilterByTag(null)
        setFtsOffset(0)
        setFtsAccumulatedResults([])
        lastProcessedDataRef.current = ''
    }, [])

    const resetFtsResults = useCallback(() => {
        setFtsOffset(0)
        setFtsAccumulatedResults([])
        lastProcessedDataRef.current = ''
    }, [])

    // -- FTS Query --

    const ftsSearchResult = useSearchNotes(ftsSearchQuery, userId, {
        enabled: !!userId && ftsSearchQuery.length >= 3,
        selectedTag: filterByTag,
        offset: ftsOffset,
        limit: ftsLimit
    })

    const ftsData = ftsSearchResult.data
    const ftsResultsRaw: SearchResult[] = useMemo(() => ftsData?.results ?? [], [ftsData?.results])

    useEffect(() => {
        if (!ftsSearchResult.data) return

        // Simple serialization to check if data changed effectively for our purpose
        // (Avoiding complex object equality checks or unnecessary updates)
        const dataSignature = `${ftsOffset}-${ftsResultsRaw.length}-${ftsResultsRaw.map(r => r.id).join(',')}`
        if (dataSignature === lastProcessedDataRef.current) return
        lastProcessedDataRef.current = dataSignature

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFtsAccumulatedResults((prev) => {
            if (ftsOffset === 0) {
                if (prev.length === ftsResultsRaw.length) {
                    const prevIds = new Set(prev.map((n) => n.id))
                    const same = ftsResultsRaw.every((n) => prevIds.has(n.id))
                    if (same) return prev
                }
                return ftsResultsRaw
            }
            const next = [...prev]
            const seen = new Set(prev.map((item) => item.id))
            ftsResultsRaw.forEach((item) => {
                if (!seen.has(item.id)) {
                    next.push(item)
                }
            })
            return next
        })
    }, [ftsSearchResult.data, ftsOffset, ftsResultsRaw, ftsSearchQuery, filterByTag])

    // -- Computed --

    // Server now returns tag-filtered total, so we can use it directly
    const ftsTotalKnown = typeof ftsData?.total === 'number' && ftsData.total >= 0 ? ftsData.total : undefined
    const lastFtsPageSize = ftsResultsRaw.length

    // Simple hasMore: use server-provided total (now tag-aware) or fallback to page size check
    const ftsHasMore = !!ftsData && lastFtsPageSize > 0 &&
        computeFtsHasMore(ftsTotalKnown, ftsAccumulatedResults.length, lastFtsPageSize, ftsLimit)

    const ftsTotal = computeFtsTotal(ftsTotalKnown, ftsAccumulatedResults.length, ftsHasMore)
    const ftsLoadingMore = ftsSearchResult.isFetching && ftsOffset > 0

    const showFTSResults = ftsSearchQuery.length >= 3 &&
        !!ftsData &&
        !ftsData.error

    // -- Tag-only mode (no text query, only selected tag) --
    const showTagOnlyResults = Boolean(filterByTag) && ftsSearchQuery.trim().length < SEARCH_CONFIG.MIN_QUERY_LENGTH
    const tagOnlyQuery = useNotesQuery({
        userId,
        searchQuery: '',
        selectedTag: filterByTag,
        enabled: Boolean(userId) && showTagOnlyResults,
    })
    const tagOnlyResults = useFlattenedNotes(tagOnlyQuery)
    const tagOnlyTotal = useMemo(() => {
        const pages = tagOnlyQuery.data?.pages
        if (pages?.length && typeof pages[0]?.totalCount === 'number') {
            return pages[0].totalCount
        }
        return tagOnlyResults.length
    }, [tagOnlyQuery.data?.pages, tagOnlyResults.length])

    const loadMoreTagOnly = useCallback(() => {
        if (!tagOnlyQuery.hasNextPage || tagOnlyQuery.isFetchingNextPage) return
        void tagOnlyQuery.fetchNextPage()
    }, [tagOnlyQuery])

    const aggregatedFtsData = showFTSResults ? {
        ...ftsData,
        results: ftsAccumulatedResults,
        total: ftsTotal
    } : undefined

    // -- Infinite Scroll for FTS --
    const loadMoreFtsCallback = useCallback(() => {
        setFtsOffset((prev) => prev + ftsLimit)
    }, [ftsLimit])

    const ftsObserverTarget = useInfiniteScroll(
        loadMoreFtsCallback,
        ftsHasMore,
        ftsLoadingMore,
        { threshold: 0.8, rootMargin: '200px' }
    )

    return {
        searchQuery: ftsSearchQuery,
        filterByTag,
        isSearchPanelOpen,
        setIsSearchPanelOpen,
        handleSearch,
        handleTagClick,
        handleClearTagFilter,

        // FTS Data
        showFTSResults,
        aggregatedFtsData,
        ftsObserverTarget,
        ftsLoadingMore,
        ftsHasMore,
        ftsAccumulatedResults,
        loadMoreFts: loadMoreFtsCallback,
        ftsSearchResult,
        resetFtsResults,

        // Tag-only Data
        showTagOnlyResults,
        tagOnlyResults,
        tagOnlyTotal,
        tagOnlyLoading: tagOnlyQuery.isLoading,
        tagOnlyHasMore: Boolean(tagOnlyQuery.hasNextPage),
        tagOnlyLoadingMore: tagOnlyQuery.isFetchingNextPage,
        loadMoreTagOnly,
    }
}
