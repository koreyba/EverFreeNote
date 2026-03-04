"use client"

import * as React from "react"
import { useEffect, useState, useRef } from "react"
import { ChevronLeft, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

import { useDebouncedCallback } from "@ui/web/hooks/useDebouncedCallback"
import { useSearchMode } from "@ui/web/hooks/useSearchMode"
import { useAISearch } from "@ui/web/hooks/useAISearch"
import { AI_SEARCH_MIN_QUERY_LENGTH } from "@core/constants/aiSearch"

import { AiSearchToggle } from "@/components/features/search/AiSearchToggle"
import { AiSearchPresetSelector } from "@/components/features/search/AiSearchPresetSelector"
import { AiSearchViewTabs } from "@/components/features/search/AiSearchViewTabs"
import { NoteSearchResults } from "@/components/features/search/NoteSearchResults"
import { ChunkSearchResults } from "@/components/features/search/ChunkSearchResults"
import { NoteList } from "@/components/features/notes/NoteList"
import type { NoteAppController } from "@ui/web/hooks/useNoteAppController"
import { cn } from "@ui/web/lib/utils"

interface SearchResultsPanelProps {
    controller: NoteAppController
    hasGeminiApiKey?: boolean
    onOpenInContext: (noteId: string, charOffset: number, chunkLength: number) => void
    onClose: () => void
    className?: string
}

export function SearchResultsPanel({
    controller,
    hasGeminiApiKey = true,
    onOpenInContext,
    onClose,
    className
}: SearchResultsPanelProps) {
    const {
        searchQuery,
        filterByTag,
        ftsSearchResult,
        showFTSResults,
        ftsData,
        ftsHasMore,
        ftsLoadingMore,
        handleSelectNote,
        selectionMode,
        selectedNoteIds,
        toggleNoteSelection,
        handleTagClick,
        handleSearchResultClick,
        loadMoreFts
    } = controller

    const [searchDraft, setSearchDraft] = useState(searchQuery)
    const [aiSearchQuery, setAiSearchQuery] = useState(searchQuery)

    const debouncedSearch = useDebouncedCallback(controller.handleSearch, 250)

    // AI Search state
    const { isAIEnabled, preset, viewMode, setIsAIEnabled, setPreset, setViewMode } = useSearchMode()
    const { noteGroups, isLoading: aiLoading, error: aiError, refetch: aiRefetch } = useAISearch({
        query: aiSearchQuery,
        preset,
        filterTag: filterByTag,
        isEnabled: isAIEnabled,
    })

    const showAIResults = isAIEnabled && aiSearchQuery.trim().length >= AI_SEARCH_MIN_QUERY_LENGTH

    const handleSearchChange = (value: string) => {
        setSearchDraft(value)
        if (!isAIEnabled) {
            debouncedSearch.call(value)
        }
    }

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (isAIEnabled) {
                setAiSearchQuery(searchDraft)
                controller.handleSearch(searchDraft) // Keep regular search query synced
            } else {
                controller.handleSearch(searchDraft)
            }
        }
    }

    const handleClear = () => {
        controller.handleSearch('')
        setSearchDraft('')
        setAiSearchQuery('')
    }

    // Provide auto-focus on mount
    const inputRef = useRef<HTMLInputElement>(null)
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

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault()
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
            document.body.style.cursor = ""
            setIsResizing(false)
            document.removeEventListener("pointermove", handlePointerMove)
            document.removeEventListener("pointerup", handlePointerUp)
        }

        document.addEventListener("pointermove", handlePointerMove)
        document.addEventListener("pointerup", handlePointerUp)
    }

    useEffect(() => {
        if (!isResizing) {
            localStorage.setItem(STORAGE_KEY, panelWidth.toString())
        }
    }, [isResizing, panelWidth])

    return (
        <div
            className={cn("relative flex flex-col h-full w-full md:w-[var(--search-panel-width)] shrink-0 bg-card border-r z-10 motion-safe:animate-in motion-safe:slide-in-from-left-2 motion-safe:duration-200", className)}
            style={{ "--search-panel-width": `${panelWidth}px` } as React.CSSProperties}
            data-testid="search-results-panel"
        >
            <div className="p-4 border-b shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" className="h-7 px-1 md:hidden" onClick={onClose}>
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back
                    </Button>
                    <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 md:mr-auto">
                        <Search className="w-4 h-4" />
                        Search
                    </h2>
                    <Button variant="ghost" size="icon" className="hidden md:inline-flex h-6 w-6" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder={filterByTag ? `Search in "${filterByTag}" notes...` : "Search notes..."}
                        value={searchDraft}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="pl-10 pr-8 bg-background"
                    />
                    {searchDraft && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 hover:bg-transparent"
                                            onClick={handleClear}
                                        >
                                            <X className="w-4 h-4 text-gray-400 hover:text-foreground" />
                                            <span className="sr-only">Clear Search</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Clear Search</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}
                </div>

                {hasGeminiApiKey && (
                    <div className="flex flex-col gap-2 pt-1 border-t">
                        <div className="flex items-center justify-between pt-1">
                            <AiSearchToggle enabled={isAIEnabled} hasApiKey={hasGeminiApiKey} onChange={setIsAIEnabled} />
                            {isAIEnabled && <AiSearchViewTabs value={viewMode} onChange={setViewMode} />}
                        </div>
                        {isAIEnabled && <AiSearchPresetSelector value={preset} onChange={setPreset} />}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 bg-muted/10 relative">
                {showAIResults ? (
                    <div className="px-3 py-1">
                        {aiLoading && (
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
                        {aiError && !aiLoading && (
                            <div className="py-2 text-center">
                                <p className="text-xs text-destructive">AI Search unavailable</p>
                                <Button variant="ghost" size="sm" className="h-5 text-xs px-0 mt-1" onClick={() => aiRefetch()}>
                                    Retry
                                </Button>
                            </div>
                        )}
                        {!aiLoading && !aiError && (
                            viewMode === 'chunk' ? (
                                <ChunkSearchResults noteGroups={noteGroups} onOpenInContext={onOpenInContext} />
                            ) : (
                                <NoteSearchResults noteGroups={noteGroups} onOpenInContext={onOpenInContext} />
                            )
                        )}
                    </div>
                ) : showFTSResults ? (
                    <NoteList
                        notes={[]}
                        isLoading={ftsSearchResult?.isLoading ?? false}
                        selectedNoteId={controller.selectedNote?.id}
                        selectionMode={selectionMode}
                        selectedIds={selectedNoteIds}
                        onToggleSelect={(note) => toggleNoteSelection(note.id)}
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
                    />
                ) : (
                    <div className="p-4 text-sm text-muted-foreground text-center pt-10">
                        {searchDraft.trim().length > 0 ? "Press Enter to search..." : "Type to start searching..."}
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
        </div>
    )
}
