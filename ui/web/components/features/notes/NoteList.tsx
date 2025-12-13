"use client"

import { memo, useMemo } from "react"
import type { CSSProperties } from "react"
import { Loader2, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { NoteListSkeleton } from "@/components/NoteListSkeleton"
import { NoteCard } from "./NoteCard"
import type { Note, SearchResult } from "@core/types/domain"
import AutoSizer from "react-virtualized-auto-sizer"
import * as ReactWindow from "react-window"

// react-window v2 uses different API (rowCount, rowHeight, rowComponent, rowProps)
// and exports useDynamicRowHeight hook. TypeScript may cache old v1 types.
// Cast to any to use v2 API correctly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VirtualList = ReactWindow.List as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useDynamicRowHeight = (ReactWindow as any).useDynamicRowHeight as (options: { defaultRowHeight: number }) => unknown

// Row component props type for react-window v2
type RowComponentProps<T> = {
  index: number
  style: CSSProperties
  ariaAttributes: {
    "aria-posinset": number
    "aria-setsize": number
    role: "listitem"
  }
} & T

// Define NoteRecord locally to match what's used in page.tsx
// Ideally this should be in a shared types file
type NoteRecord = Note & {
  content?: string | null
  headline?: string | null
  rank?: number | null
}

interface NoteListProps {
  notes: NoteRecord[]
  isLoading: boolean
  selectedNoteId?: string
  selectionMode?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (note: NoteRecord) => void
  onSelectNote: (note: NoteRecord) => void
  onTagClick: (tag: string) => void
  onLoadMore: () => void
  hasMore: boolean
  isFetchingNextPage: boolean

  // FTS Search Props
  ftsQuery: string
  ftsLoading: boolean
  showFTSResults: boolean
  ftsData?: {
    total?: number
    executionTime?: number
    results: SearchResult[]
  }
  ftsHasMore?: boolean
  ftsLoadingMore?: boolean
  onLoadMoreFts?: () => void
  onSearchResultClick: (note: SearchResult) => void
}

interface ItemData {
  items: NoteRecord[]
  selectedNoteId?: string
  selectionMode: boolean
  selectedIds: Set<string>
  onToggleSelect?: (note: NoteRecord) => void
  onSelectNote: (note: NoteRecord) => void
  onTagClick: (tag: string) => void
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
}

interface SearchItemData {
  items: SearchResult[]
  selectionMode: boolean
  selectedIds: Set<string>
  onToggleSelect?: (note: NoteRecord) => void
  onSearchResultClick: (note: SearchResult) => void
  onTagClick: (tag: string) => void
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
}

// Row component for react-window (regular notes list)
const NoteRow = memo(({ index, style, ...props }: RowComponentProps<ItemData>) => {
  const {
    items,
    selectedNoteId,
    selectionMode,
    selectedIds,
    onToggleSelect,
    onSelectNote,
    onTagClick,
    hasMore,
    isLoadingMore,
    onLoadMore,
  } = props as unknown as ItemData

  // Render Load More / Loading indicator at the end
  if (index === items.length) {
    return (
      <div style={style} className="px-2 py-2 flex justify-center items-center">
        {isLoadingMore ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : hasMore ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            className="text-xs text-muted-foreground w-full"
          >
            Load more...
          </Button>
        ) : null}
      </div>
    )
  }

  const note = items[index]
  if (!note) return null

  return (
    <div style={style} className="px-2 py-1">
      <NoteCard
        note={note}
        variant="compact"
        isSelected={selectionMode ? selectedIds.has(note.id) : selectedNoteId === note.id}
        selectionMode={selectionMode}
        onToggleSelect={() => onToggleSelect?.(note)}
        onClick={() =>
          selectionMode
            ? onToggleSelect?.(note)
            : onSelectNote(note)
        }
        onTagClick={onTagClick}
      />
    </div>
  )
})
NoteRow.displayName = 'NoteRow'

// Row component for react-window (search results)
const SearchRow = memo(({ index, style, ...props }: RowComponentProps<SearchItemData>) => {
  const {
    items,
    selectionMode,
    selectedIds,
    onToggleSelect,
    onSearchResultClick,
    onTagClick,
    hasMore,
    isLoadingMore,
    onLoadMore,
  } = props as unknown as SearchItemData

  // Render Load More / Loading indicator at the end
  if (index === items.length) {
    return (
      <div style={style} className="px-4 py-2 flex justify-center items-center">
        {isLoadingMore ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : hasMore ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            className="text-xs text-muted-foreground w-full"
          >
            Load more...
          </Button>
        ) : null}
      </div>
    )
  }

  const note = items[index]
  if (!note) return null

  return (
    <div style={style} className="px-4 py-2">
      <NoteCard
        note={note}
        variant="search"
        selectionMode={selectionMode}
        isSelected={selectionMode ? selectedIds.has(note.id) : false}
        onToggleSelect={() => onToggleSelect?.(note as unknown as NoteRecord)}
        onClick={() =>
          selectionMode
            ? onToggleSelect?.(note as unknown as NoteRecord)
            : onSearchResultClick(note)
        }
        onTagClick={onTagClick}
      />
    </div>
  )
})
SearchRow.displayName = 'SearchRow'

export const NoteList = memo(function NoteList({
  notes,
  isLoading,
  selectedNoteId,
  selectionMode = false,
  selectedIds = new Set(),
  onToggleSelect,
  onSelectNote,
  onTagClick,
  onLoadMore,
  hasMore,
  isFetchingNextPage,
  ftsQuery,
  ftsLoading,
  showFTSResults,
  ftsData,
  ftsHasMore = false,
  ftsLoadingMore = false,
  onLoadMoreFts,
  onSearchResultClick,
}: NoteListProps) {
  const isInitialFtsLoading = ftsQuery.length >= 3 && ftsLoading && !ftsData
  const isSearch = showFTSResults && !!ftsData

  // Dynamic row height for virtualized lists - measures actual content height
  const dynamicRowHeight = useDynamicRowHeight({ defaultRowHeight: 140 })
  const dynamicSearchRowHeight = useDynamicRowHeight({ defaultRowHeight: 180 })

  // Memoize item data for virtualized list (notes only)
  const itemData = useMemo(() => ({
    items: notes,
    selectedNoteId,
    selectionMode,
    selectedIds,
    onToggleSelect,
    onSelectNote,
    onTagClick,
    hasMore,
    isLoadingMore: isFetchingNextPage,
    onLoadMore,
  }), [
    notes,
    selectedNoteId,
    selectionMode,
    selectedIds,
    onToggleSelect,
    onSelectNote,
    onTagClick,
    hasMore,
    isFetchingNextPage,
    onLoadMore,
  ])

  // Memoize item data for search results
  const searchItemData = useMemo(() => ({
    items: ftsData?.results ?? [],
    selectionMode,
    selectedIds,
    onToggleSelect,
    onSearchResultClick,
    onTagClick,
    hasMore: ftsHasMore ?? false,
    isLoadingMore: ftsLoadingMore ?? false,
    onLoadMore: onLoadMoreFts ?? (() => { }),
  }), [
    ftsData?.results,
    selectionMode,
    selectedIds,
    onToggleSelect,
    onSearchResultClick,
    onTagClick,
    ftsHasMore,
    ftsLoadingMore,
    onLoadMoreFts,
  ])

  // FTS Loading State (initial)
  if (isInitialFtsLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Searching notes...</span>
        </div>
      </div>
    )
  }

  // FTS Results - with virtualization and dynamic row heights
  if (isSearch) {
    const displayTotal = typeof ftsData.total === "number" ? ftsData.total : ftsData.results.length

    if (ftsData.results.length === 0) {
      return (
        <div className="p-4 h-full">
          {/* FTS Search Results Header */}
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
            <div>
              Found: <span className="font-semibold">0</span> notes
            </div>
          </div>
          <div className="text-sm text-muted-foreground py-8 text-center">No results found.</div>
        </div>
      )
    }

    return (
      <div className="h-full flex flex-col">
        {/* FTS Search Results Header */}
        <div className="flex items-center justify-between text-sm text-muted-foreground p-4 pb-2 flex-shrink-0">
          <div>
            Found: <span className="font-semibold">{displayTotal}</span> {displayTotal === 1 ? "note" : "notes"}
          </div>
          {typeof ftsData.executionTime === "number" && (
            <div className="flex items-center gap-2">
              <span>{ftsData.executionTime}ms</span>
              <Badge variant="outline" className="text-xs gap-1">
                <Zap className="h-3 w-3" />
                Quick search
              </Badge>
            </div>
          )}
        </div>

        {/* Virtualized FTS Results List */}
        <div className="flex-1 h-full min-h-0">
          <AutoSizer defaultHeight={500} defaultWidth={300} style={{ height: '100%', width: '100%' }}>
            {({ height, width }) => (
              <VirtualList
                height={height}
                width={width}
                rowCount={ftsData.results.length + (ftsHasMore ? 1 : 0)}
                rowHeight={dynamicSearchRowHeight}
                rowProps={searchItemData}
                overscanCount={3}
                onRowsRendered={({ stopIndex }: { stopIndex: number }) => {
                  // Trigger load more when we're 3 items from the end
                  if (ftsHasMore && !ftsLoadingMore && stopIndex >= ftsData.results.length - 3) {
                    onLoadMoreFts?.()
                  }
                }}
                rowComponent={SearchRow}
              />
            )}
          </AutoSizer>
        </div>
      </div>
    )
  }

  // Loading Skeleton
  if (isLoading) {
    return <NoteListSkeleton count={5} />
  }

  // Empty State
  if (notes.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No notes yet</p>
        <p className="text-sm mt-2">Create your first note to get started!</p>
      </div>
    )
  }

  // Regular Notes List - with virtualization
  return (
    <div className="h-full flex flex-col">
      {/* Virtualized List */}
      <div className="flex-1 h-full min-h-0">
        <AutoSizer defaultHeight={500} defaultWidth={300} style={{ height: '100%', width: '100%' }}>
          {({ height, width }) => (
            <VirtualList
              height={height}
              width={width}
              rowCount={notes.length + (hasMore ? 1 : 0)}
              rowHeight={dynamicRowHeight}
              rowProps={itemData}
              overscanCount={5}
              onRowsRendered={({ stopIndex }: { stopIndex: number }) => {
                // Trigger load more when we're 5 items from the end
                if (hasMore && !isFetchingNextPage && stopIndex >= notes.length - 5) {
                  onLoadMore()
                }
              }}
              rowComponent={NoteRow}
            />
          )}
        </AutoSizer>
      </div>
    </div>
  )
})
