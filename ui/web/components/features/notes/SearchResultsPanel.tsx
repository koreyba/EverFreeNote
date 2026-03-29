"use client"

import * as React from "react"
import { useEffect, useState, useRef } from "react"
import { ChevronLeft, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import InteractiveTag from "@/components/InteractiveTag"

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

import { useDebouncedCallback } from "@ui/web/hooks/useDebouncedCallback"
import { useSearchMode } from "@ui/web/hooks/useSearchMode"
import { useAIPaginatedSearch } from "@ui/web/hooks/useAIPaginatedSearch"
import { AI_SEARCH_MIN_QUERY_LENGTH } from "@core/constants/aiSearch"
import { resolveRagSearchSettings } from "@core/rag/searchSettings"
import { RagSearchSettingsService } from "@core/services/ragSearchSettings"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"

import { AiSearchToggle } from "@/components/features/search/AiSearchToggle"
import { AiSearchPrecisionSlider } from "@/components/features/search/AiSearchPrecisionSlider"
import { AiSearchViewTabs } from "@/components/features/search/AiSearchViewTabs"
import { NoteSearchResults } from "@/components/features/search/NoteSearchResults"
import { ChunkSearchResults } from "@/components/features/search/ChunkSearchResults"
import { NoteList } from "@/components/features/notes/NoteList"
import { SelectionModeActions } from "@/components/features/notes/SelectionModeActions"
import { BulkDeleteDialog } from "@/components/features/notes/BulkDeleteDialog"
import { useBulkDeleteConfirm } from "@ui/web/hooks/useBulkDeleteConfirm"
import type { NoteAppController } from "@ui/web/hooks/useNoteAppController"
import { cn } from "@ui/web/lib/utils"

interface SearchResultsPanelProps {
    controller: NoteAppController
    hasGeminiApiKey?: boolean
    onOpenInContext: (noteId: string, charOffset: number, chunkLength: number) => void
    onClose: () => void
    className?: string
}

export interface SearchResultsPanelHandle {
    focusInput: () => void
}

export const SearchResultsPanel = React.forwardRef<SearchResultsPanelHandle, SearchResultsPanelProps>(function SearchResultsPanel({
    controller,
    hasGeminiApiKey = true,
    onOpenInContext,
    onClose,
    className
}: SearchResultsPanelProps, ref) {
    const { supabase } = useSupabase()
    const ragSearchSettingsService = React.useMemo(() => new RagSearchSettingsService(supabase), [supabase])
    const {
        searchQuery,
        filterByTag,
        ftsSearchResult,
        showFTSResults,
        ftsData,
        ftsHasMore,
        ftsLoadingMore,
        showTagOnlyResults,
        tagOnlyResults,
        tagOnlyTotal,
        tagOnlyLoading,
        tagOnlyHasMore,
        tagOnlyLoadingMore,
        handleSelectNote,
        handleTagClick,
        handleSearchResultClick,
        loadMoreFts,
        loadMoreTagOnly,
    } = controller

    const [searchDraft, setSearchDraft] = useState(searchQuery)
    const [aiSearchQuery, setAiSearchQuery] = useState(searchQuery)
    const [panelSelectionMode, setPanelSelectionMode] = useState(false)
    const [panelSelectedIds, setPanelSelectedIds] = useState<Set<string>>(new Set())
    const [panelBulkDeleting, setPanelBulkDeleting] = useState(false)

    const debouncedSearch = useDebouncedCallback(controller.handleSearch, 250)

    // AI Search state
    const { isAIEnabled, viewMode, setIsAIEnabled, setViewMode } = useSearchMode()
    const aiEnabled = isAIEnabled && hasGeminiApiKey
    const prevAiEnabledRef = useRef(aiEnabled)
    const precisionSaveRequestRef = useRef(0)
    const confirmedRagSearchSettingsRef = useRef(resolveRagSearchSettings())
    const [ragSearchSettings, setRagSearchSettings] = useState(() => resolveRagSearchSettings())
    const [draftPrecision, setDraftPrecision] = useState(resolveRagSearchSettings().similarity_threshold)
    const [ragSearchSettingsLoading, setRagSearchSettingsLoading] = useState(hasGeminiApiKey)
    const [precisionError, setPrecisionError] = useState<string | null>(null)
    const {
        noteGroups,
        chunks: aiChunks,
        isLoading: aiLoading,
        error: aiError,
        refetch: aiRefetch,
        aiHasMore,
        aiLoadingMore,
        loadMoreAI,
        resetAIResults,
    } = useAIPaginatedSearch({
        query: aiSearchQuery,
        topK: ragSearchSettings.top_k,
        threshold: ragSearchSettings.similarity_threshold,
        filterTag: filterByTag,
        isEnabled: aiEnabled && !ragSearchSettingsLoading,
        resultMode: viewMode,
    })

    const showAIResults = aiEnabled && aiSearchQuery.trim().length >= AI_SEARCH_MIN_QUERY_LENGTH
    const showAIInitialization = showAIResults && ragSearchSettingsLoading
    const usesVirtualizedList = !showAIResults && (showFTSResults || showTagOnlyResults)
    const selectionSwitchTitle = "Remove selection to switch"
    const canSelectInPanel =
        showFTSResults ||
        showTagOnlyResults ||
        (showAIResults && viewMode === 'note')
    const shouldShowResultsHeader =
        showAIResults ||
        showFTSResults ||
        showTagOnlyResults

    const visibleResultIds = React.useMemo(() => {
        if (showAIResults && viewMode === 'note') {
            return noteGroups.map((group) => group.noteId)
        }
        if (showTagOnlyResults) {
            return tagOnlyResults.map((note) => note.id)
        }
        if (showFTSResults && ftsData) {
            return ftsData.results.map((note) => note.id)
        }
        return []
    }, [showAIResults, viewMode, noteGroups, showTagOnlyResults, tagOnlyResults, showFTSResults, ftsData])

    const visibleResultsSummary = React.useMemo(() => {
        if (showAIResults && viewMode === 'note') {
            return {
                count: noteGroups.length,
                singularLabel: 'note',
                pluralLabel: 'notes',
            }
        }

        if (showAIResults && viewMode === 'chunk') {
            return {
                count: aiChunks.length,
                singularLabel: 'chunk',
                pluralLabel: 'chunks',
            }
        }

        if (showTagOnlyResults) {
            return {
                count: tagOnlyTotal,
                singularLabel: 'note',
                pluralLabel: 'notes',
            }
        }

        const visibleCount = typeof ftsData?.total === 'number' ? ftsData.total : (ftsData?.results.length ?? 0)
        return {
            count: visibleCount,
            singularLabel: 'note',
            pluralLabel: 'notes',
        }
    }, [showAIResults, viewMode, noteGroups, aiChunks.length, showTagOnlyResults, tagOnlyTotal, ftsData])

    useEffect(() => {
        if (!hasGeminiApiKey) {
            const defaults = resolveRagSearchSettings()
            confirmedRagSearchSettingsRef.current = defaults
            setRagSearchSettings(defaults)
            setDraftPrecision(defaults.similarity_threshold)
            setRagSearchSettingsLoading(false)
            return
        }

        let isMounted = true
        setRagSearchSettingsLoading(true)
        setPrecisionError(null)

        void ragSearchSettingsService
            .getStatus()
            .then((settings) => {
                if (!isMounted) return
                confirmedRagSearchSettingsRef.current = settings
                setRagSearchSettings(settings)
                setDraftPrecision(settings.similarity_threshold)
            })
            .catch((error) => {
                if (!isMounted) return
                const defaults = resolveRagSearchSettings()
                confirmedRagSearchSettingsRef.current = defaults
                setRagSearchSettings(defaults)
                setDraftPrecision(defaults.similarity_threshold)
                setPrecisionError(
                    error instanceof Error ? error.message : "Failed to load AI search precision settings"
                )
            })
            .finally(() => {
                if (!isMounted) return
                setRagSearchSettingsLoading(false)
            })

        return () => {
            isMounted = false
        }
    }, [hasGeminiApiKey, ragSearchSettingsService])

    const handlePrecisionCommit = React.useCallback((nextThreshold: number) => {
        const normalizedThreshold = Number(nextThreshold.toFixed(2))
        setDraftPrecision(normalizedThreshold)

        if (normalizedThreshold === ragSearchSettings.similarity_threshold) {
            return
        }

        precisionSaveRequestRef.current += 1
        const requestId = precisionSaveRequestRef.current
        setPrecisionError(null)
        setRagSearchSettings((current) => ({
            ...current,
            similarity_threshold: normalizedThreshold,
        }))

        void ragSearchSettingsService
            .upsert({ similarity_threshold: normalizedThreshold })
            .then((settings) => {
                confirmedRagSearchSettingsRef.current = settings
                if (requestId !== precisionSaveRequestRef.current) return
                setRagSearchSettings(settings)
                setDraftPrecision(settings.similarity_threshold)
            })
            .catch((error) => {
                if (requestId !== precisionSaveRequestRef.current) return
                const rollbackSettings = confirmedRagSearchSettingsRef.current
                setRagSearchSettings(rollbackSettings)
                setDraftPrecision(rollbackSettings.similarity_threshold)
                setPrecisionError(
                    error instanceof Error ? error.message : "Failed to save AI search precision"
                )
            })
    }, [ragSearchSettings, ragSearchSettingsService])

    const selectedCount = panelSelectedIds.size
    const allVisibleSelected =
        visibleResultIds.length > 0 &&
        visibleResultIds.every((id) => panelSelectedIds.has(id))

    const togglePanelSelection = React.useCallback((id: string) => {
        setPanelSelectionMode(true)
        setPanelSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }, [])

    const exitPanelSelectionMode = React.useCallback(() => {
        setPanelSelectionMode(false)
        setPanelSelectedIds(new Set())
    }, [])

    const selectAllVisibleInPanel = React.useCallback(() => {
        if (!visibleResultIds.length) return
        setPanelSelectionMode(true)
        setPanelSelectedIds(new Set(visibleResultIds))
    }, [visibleResultIds])

    const handlePanelDelete = React.useCallback(async () => {
        if (!selectedCount) return
        setPanelBulkDeleting(true)
        try {
            const result = await controller.deleteNotesByIds(Array.from(panelSelectedIds))
            if (showAIResults && viewMode === 'note') {
                resetAIResults()
            } else {
                controller.resetFtsResults()
            }
            if (result.failed === 0) {
                exitPanelSelectionMode()
            }
        } finally {
            setPanelBulkDeleting(false)
        }
    }, [
        selectedCount,
        controller,
        panelSelectedIds,
        showAIResults,
        viewMode,
        resetAIResults,
        exitPanelSelectionMode,
    ])

    const {
        isDialogOpen: panelBulkDialogOpen,
        setIsDialogOpen: setPanelBulkDialogOpen,
        requestDelete: requestPanelBulkDelete,
        confirmDelete: handleConfirmPanelBulkDelete,
        error: panelBulkDeleteError,
        clearError: clearPanelBulkDeleteError,
    } = useBulkDeleteConfirm(handlePanelDelete)

    const handleSearchChange = (value: string) => {
        setSearchDraft(value)
        if (!aiEnabled) {
            if (value === '') {
                debouncedSearch.cancel()
                controller.handleSearch('')
                return
            }
            debouncedSearch.call(value)
        }
    }

    useEffect(() => {
        controller.registerAIPaginationControls({
            loadMoreAI,
            resetAIResults,
        })
    }, [controller, loadMoreAI, resetAIResults])

    useEffect(() => {
        const wasAIEnabled = prevAiEnabledRef.current
        const normalizedQuery = searchDraft.trim()

        if (!wasAIEnabled && aiEnabled) {
            debouncedSearch.cancel()
            setAiSearchQuery(normalizedQuery)
        }

        if (wasAIEnabled && !aiEnabled) {
            controller.handleSearch(normalizedQuery)
            if (normalizedQuery === searchQuery.trim()) {
                ftsSearchResult?.refetch()
            }
        }
        prevAiEnabledRef.current = aiEnabled
    }, [aiEnabled, searchDraft, controller, searchQuery, ftsSearchResult, debouncedSearch])

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const normalizedQuery = searchDraft.trim()
            debouncedSearch.cancel()
            if (aiEnabled) {
                const queryChanged = normalizedQuery !== aiSearchQuery.trim()
                setAiSearchQuery(normalizedQuery)
                // If query is the same, setAiSearchQuery won't re-trigger useAISearch; force refetch.
                if (!queryChanged) aiRefetch()
            } else {
                controller.handleSearch(normalizedQuery)
                // If query is the same, force a fresh FTS fetch
                if (normalizedQuery === searchQuery.trim()) {
                    ftsSearchResult?.refetch()
                }
            }
        }
    }

    const handleClear = () => {
        debouncedSearch.cancel()
        controller.handleSearch('')
        setSearchDraft('')
        setAiSearchQuery('')
        resetAIResults()
        exitPanelSelectionMode()
    }

    useEffect(() => {
        if (!panelSelectionMode) return
        const visible = new Set(visibleResultIds)
        setPanelSelectedIds((prev) => {
            const next = new Set(Array.from(prev).filter((id) => visible.has(id)))
            if (next.size === prev.size) return prev
            return next
        })
    }, [panelSelectionMode, visibleResultIds])

    useEffect(() => {
        if (panelSelectionMode && selectedCount === 0) {
            setPanelSelectionMode(false)
        }
    }, [panelSelectionMode, selectedCount])

    useEffect(() => {
        if (!canSelectInPanel && panelSelectionMode) {
            exitPanelSelectionMode()
        }
    }, [canSelectInPanel, panelSelectionMode, exitPanelSelectionMode])

    // Provide auto-focus on mount
    const inputRef = useRef<HTMLInputElement>(null)

    React.useImperativeHandle(ref, () => ({
        focusInput: () => {
            inputRef.current?.focus()
        }
    }), [])

    useEffect(() => {
        // Slight delay to allow layout to settle before focusing
        const id = setTimeout(() => {
            inputRef.current?.focus()
        }, 100)
        return () => clearTimeout(id)
    }, [])

    // Resizable Logic
    const MIN_WIDTH = 300
    const MAX_WIDTH_PCT = 0.5 // 50% max width
    const STORAGE_KEY = "search-panel-width"

    const [panelWidth, setPanelWidth] = useState<number>(() => {
        if (typeof window === "undefined") return 350
        const stored = window.localStorage.getItem(STORAGE_KEY)
        const parsed = stored ? parseInt(stored, 10) : NaN
        const maxPixelWidth = window.innerWidth * MAX_WIDTH_PCT
        if (Number.isFinite(parsed)) {
            return Math.max(MIN_WIDTH, Math.min(parsed, maxPixelWidth))
        }
        return 350
    })

    const [isResizing, setIsResizing] = useState(false)
    const pointerMoveHandlerRef = useRef<((event: PointerEvent) => void) | null>(null)
    const pointerUpHandlerRef = useRef<((event: PointerEvent) => void) | null>(null)

    const cleanupResizeListeners = React.useCallback(() => {
        document.body.style.cursor = ""
        if (pointerMoveHandlerRef.current) {
            document.removeEventListener("pointermove", pointerMoveHandlerRef.current)
            pointerMoveHandlerRef.current = null
        }
        if (pointerUpHandlerRef.current) {
            document.removeEventListener("pointerup", pointerUpHandlerRef.current)
            pointerUpHandlerRef.current = null
        }
    }, [])

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault()
        cleanupResizeListeners()
        setIsResizing(true)
        document.body.style.cursor = "col-resize"
        const startX = e.clientX
        const startWidth = panelWidth

        const maxPixelWidth = window.innerWidth * MAX_WIDTH_PCT

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const deltaX = moveEvent.clientX - startX
            let newWidth = startWidth + deltaX
            newWidth = Math.max(MIN_WIDTH, Math.min(newWidth, maxPixelWidth))
            setPanelWidth(newWidth)
        }

        const handlePointerUp = () => {
            setIsResizing(false)
            cleanupResizeListeners()
        }

        pointerMoveHandlerRef.current = handlePointerMove
        pointerUpHandlerRef.current = handlePointerUp
        document.addEventListener("pointermove", handlePointerMove)
        document.addEventListener("pointerup", handlePointerUp)
    }

    useEffect(() => {
        return () => {
            cleanupResizeListeners()
        }
    }, [cleanupResizeListeners])

    useEffect(() => {
        if (!isResizing) {
            localStorage.setItem(STORAGE_KEY, panelWidth.toString())
        }
    }, [isResizing, panelWidth])

    const renderResultsHeader = () => {
        if (panelSelectionMode) {
            return (
                <SelectionModeActions
                    selectedCount={selectedCount}
                    onSelectAll={selectAllVisibleInPanel}
                    onDelete={requestPanelBulkDelete}
                    onCancel={exitPanelSelectionMode}
                    selectingAllDisabled={allVisibleSelected || !visibleResultIds.length || panelBulkDeleting}
                    deletingDisabled={!selectedCount || panelBulkDeleting}
                    deleting={panelBulkDeleting}
                    className="border-b bg-card/70 backdrop-blur"
                />
            )
        }

        if (!shouldShowResultsHeader) return null

        const resultLabel =
            visibleResultsSummary.count === 1
                ? visibleResultsSummary.singularLabel
                : visibleResultsSummary.pluralLabel

        return (
            <div className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground border-b bg-card/70">
                <div>
                    Found: <span className="font-semibold">{visibleResultsSummary.count}</span> {resultLabel}
                </div>
                {typeof ftsData?.executionTime === "number" && !showAIResults && (
                    <div>{ftsData.executionTime}ms</div>
                )}
            </div>
        )
    }

    return (
        <div
            className={cn("relative flex flex-col h-full w-full md:w-[var(--search-panel-width)] shrink-0 bg-card border-r z-10 motion-safe:animate-in motion-safe:slide-in-from-left-2 motion-safe:duration-200", className)}
            style={{ "--search-panel-width": `${panelWidth}px` } as React.CSSProperties}
            data-testid="search-results-panel"
        >
            <div className="px-3 pt-3 pb-2 border-b shrink-0 space-y-2">
                {/* Search input row — Back (mobile) | input | X (desktop) */}
                <TooltipProvider>
                <div className="flex items-center gap-2">
                    <Button data-testid="search-panel-back" variant="ghost" size="sm" className="h-8 px-1.5 md:hidden shrink-0" onClick={onClose}>
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back
                    </Button>

                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70 pointer-events-none" />
                        <Input
                            data-testid="search-panel-input"
                            ref={inputRef}
                            type="text"
                            placeholder={filterByTag ? `In "${filterByTag}"…` : "Search notes…"}
                            value={searchDraft}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            className={cn(
                                "pl-9 pr-7 h-9 bg-background transition-shadow",
                                aiEnabled && "ring-1 ring-primary/35 focus-visible:ring-primary/60"
                            )}
                        />
                        {searchDraft && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        data-testid="search-panel-clear"
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                                        onClick={handleClear}
                                        aria-label="Clear search"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Clear search</TooltipContent>
                            </Tooltip>
                        )}
                    </div>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button data-testid="search-panel-close" variant="ghost" size="icon" className="hidden md:inline-flex h-8 w-8 shrink-0" onClick={onClose}>
                                <X className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Close</TooltipContent>
                    </Tooltip>
                </div>
                </TooltipProvider>

                {filterByTag && (
                    <div className="flex items-center gap-2">
                        <InteractiveTag
                            tag={filterByTag}
                            onClick={controller.handleClearTagFilter}
                            showIcon={false}
                            className="text-xs px-2 py-0.5 max-w-[70%] truncate"
                        />
                        <Button
                            data-testid="search-panel-clear-tag"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={controller.handleClearTagFilter}
                        >
                            Clear tag
                        </Button>
                    </div>
                )}

                {hasGeminiApiKey && (
                    <div className="flex flex-col gap-2 pt-1 border-t">
                        <div className="flex items-center justify-between pt-1">
                            <AiSearchToggle
                                enabled={isAIEnabled}
                                hasApiKey={hasGeminiApiKey}
                                onChange={setIsAIEnabled}
                                disabled={panelSelectionMode}
                                disabledTitle={selectionSwitchTitle}
                            />
                            {isAIEnabled && (
                                <AiSearchViewTabs
                                    value={viewMode}
                                    onChange={setViewMode}
                                    disabled={panelSelectionMode}
                                    disabledTitle={selectionSwitchTitle}
                                />
                            )}
                        </div>
                        {isAIEnabled && (
                            <AiSearchPrecisionSlider
                                value={draftPrecision}
                                topK={ragSearchSettings.top_k}
                                disabled={panelSelectionMode || ragSearchSettingsLoading}
                                onChange={setDraftPrecision}
                                onCommit={handlePrecisionCommit}
                            />
                        )}
                        {isAIEnabled && precisionError && (
                            <p className="text-xs text-destructive">{precisionError}</p>
                        )}
                    </div>
                )}
            </div>

            <div
                data-testid="search-results-scroll-region"
                className={cn(
                    "flex-1 min-h-0 bg-muted/10 relative",
                    usesVirtualizedList ? "overflow-hidden" : "overflow-y-auto"
                )}
            >
                {renderResultsHeader()}
                {showAIResults ? (
                    <div className="px-3 py-2">
                        {(showAIInitialization || aiLoading) && (
                            <div className="flex flex-col gap-3 py-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="space-y-1.5 p-3 rounded-md bg-card border">
                                        <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                                        <div className="h-2.5 bg-muted animate-pulse rounded w-full" />
                                        <div className="h-2.5 bg-muted animate-pulse rounded w-5/6" />
                                    </div>
                                ))}
                            </div>
                        )}
                        {aiError && !showAIInitialization && !aiLoading && (
                            <div className="py-2 text-center" data-testid="search-panel-ai-error">
                                <p className="text-xs text-destructive">AI Search unavailable</p>
                                <Button data-testid="search-panel-ai-retry" variant="ghost" size="sm" className="h-5 text-xs px-0 mt-1" onClick={() => aiRefetch()}>
                                    Retry
                                </Button>
                            </div>
                        )}
                        {!showAIInitialization && !aiLoading && !aiError && (
                            viewMode === 'chunk' ? (
                                <ChunkSearchResults
                                    chunks={aiChunks}
                                    onOpenInContext={onOpenInContext}
                                    query={aiSearchQuery}
                                    hasMore={aiHasMore}
                                    loadingMore={aiLoadingMore}
                                    onLoadMore={loadMoreAI}
                                />
                            ) : (
                                <NoteSearchResults
                                    noteGroups={noteGroups}
                                    onOpenInContext={onOpenInContext}
                                    query={aiSearchQuery}
                                    onTagClick={handleTagClick}
                                    selectionMode={panelSelectionMode}
                                    selectedIds={panelSelectedIds}
                                    onToggleSelect={togglePanelSelection}
                                    hasMore={aiHasMore}
                                    loadingMore={aiLoadingMore}
                                    onLoadMore={loadMoreAI}
                                />
                            )
                        )}
                    </div>
                ) : showFTSResults ? (
                    <NoteList
                        notes={[]}
                        isLoading={ftsSearchResult?.isLoading ?? false}
                        selectedNoteId={controller.selectedNote?.id}
                        selectionMode={panelSelectionMode}
                        selectedIds={panelSelectedIds}
                        onToggleSelect={(note) => togglePanelSelection(note.id)}
                        onSelectNote={(note) => handleSelectNote(note)}
                        onTagClick={handleTagClick}
                        onLoadMore={() => { }}
                        hasMore={false}
                        isFetchingNextPage={false}
                        ftsQuery={searchQuery}
                        ftsLoading={ftsSearchResult?.isLoading ?? false}
                        showFTSResults={showFTSResults}
                        ftsData={
                            ftsData
                                ? {
                                    total: ftsData.total,
                                    executionTime: ftsData.executionTime,
                                    results: ftsData.results,
                                }
                                : undefined
                        }
                        ftsHasMore={ftsHasMore}
                        ftsLoadingMore={ftsLoadingMore}
                        onLoadMoreFts={loadMoreFts}
                        onSearchResultClick={handleSearchResultClick}
                        ftsHeader={false}
                    />
                ) : showTagOnlyResults ? (
                    <NoteList
                        notes={tagOnlyResults}
                        isLoading={tagOnlyLoading}
                        selectedNoteId={controller.selectedNote?.id}
                        selectionMode={panelSelectionMode}
                        selectedIds={panelSelectedIds}
                        onToggleSelect={(note) => togglePanelSelection(note.id)}
                        onSelectNote={(note) => handleSelectNote(note)}
                        onTagClick={handleTagClick}
                        onLoadMore={loadMoreTagOnly}
                        hasMore={tagOnlyHasMore}
                        isFetchingNextPage={tagOnlyLoadingMore}
                    />
                ) : (
                    <div className="flex flex-col items-center gap-3 py-14 px-6 text-center">
                        <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
                            <Search className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground/70">
                                {searchDraft.trim().length > 0 ? "Press Enter to search" : "Search your notes"}
                            </p>
                            {aiEnabled && searchDraft.trim().length > 0 && (
                                <p className="text-xs text-muted-foreground/45 mt-1">AI search uses semantic similarity</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Resize Handle */}
            <div
                className={cn(
                    "hidden md:block absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50 transition-colors z-20",
                    isResizing && "bg-primary"
                )}
                onPointerDown={handlePointerDown}
            />

            <BulkDeleteDialog
                open={panelBulkDialogOpen}
                onOpenChange={setPanelBulkDialogOpen}
                count={selectedCount}
                onConfirm={() => void handleConfirmPanelBulkDelete()}
                loading={panelBulkDeleting}
                errorMessage={panelBulkDeleteError?.message ?? null}
                onClearError={clearPanelBulkDeleteError}
            />
        </div>
    )
})
