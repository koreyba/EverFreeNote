import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

import { useSearchNotes } from './useNotesQuery'
import { useInfiniteScroll } from './useInfiniteScroll'
import type { SearchResult } from '@core/types/domain'
import { computeFtsHasMore, computeFtsTotal } from '@core/services/ftsPagination'

export function useNoteSearch(userId: string | undefined) {
    // -- State --
    const [searchQuery, setSearchQuery] = useState("")
    const [ftsSearchQuery, setFtsSearchQuery] = useState("")
    const [filterByTag, setFilterByTag] = useState<string | null>(null)
    const [ftsOffset, setFtsOffset] = useState(0)
    const [ftsAccumulatedResults, setFtsAccumulatedResults] = useState<SearchResult[]>([])
    const ftsLimit = 50
    const lastProcessedDataRef = useRef<string>('')

    // -- Logic --

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query)
        setFtsSearchQuery(query)
        setFtsOffset(0)
        setFtsAccumulatedResults([])
        lastProcessedDataRef.current = ''
    }, [])

    const handleTagClick = useCallback((tag: string) => {
        setFilterByTag(tag)
        setFtsOffset(0)
        setFtsAccumulatedResults([])
        lastProcessedDataRef.current = ''
        // Don't reset search - preserve search state when clicking tags
    }, [])

    const handleClearTagFilter = useCallback(() => {
        setFilterByTag(null)
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
        searchQuery,
        ftsSearchQuery, // exposed if needed
        filterByTag,
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
        ftsSearchResult
    }
}