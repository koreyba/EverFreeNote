"use client"

import { memo, useMemo } from "react"
import type { CSSProperties } from "react"
import * as React from "react"
import AutoSizer from "react-virtualized-auto-sizer"
import * as ReactWindow from "react-window"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { AIIndexMutationResult, AIIndexNoteRow as AIIndexNoteRowData } from "@core/types/aiIndex"
import { AIIndexNoteRow } from "@/components/features/settings/AIIndexNoteRow"

// react-window v2 uses different API (rowCount, rowHeight, rowComponent, rowProps)
// and exports useDynamicRowHeight/useListRef hooks. TypeScript may cache old v1
// types, so these casts keep the v2 runtime API usable until the type cache catches up.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VirtualList = ReactWindow.List as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useDynamicRowHeight = (ReactWindow as any).useDynamicRowHeight as (options: { defaultRowHeight: number }) => unknown
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useListRef = (ReactWindow as any).useListRef as () => { current: { element: HTMLDivElement | null } | null }

type RowComponentProps<T> = {
  index: number
  style: CSSProperties
  ariaAttributes: {
    "aria-posinset": number
    "aria-setsize": number
    role: "listitem"
  }
} & T

type ItemData = {
  items: AIIndexNoteRowData[]
  exitingNoteIds: Set<string>
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  onMutated: (result: AIIndexMutationResult) => void
  onOpenNote: (noteId: string) => void
}

const AIIndexRowRenderer = memo(({ index, style, ...props }: RowComponentProps<ItemData>) => {
  const { items, exitingNoteIds, hasMore, isLoadingMore, onLoadMore, onMutated, onOpenNote } = props as unknown as ItemData

  if (index === items.length) {
    let loadMoreContent: React.ReactNode = null
    if (isLoadingMore) {
      loadMoreContent = <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    } else if (hasMore) {
      loadMoreContent = (
        <Button variant="ghost" size="sm" onClick={onLoadMore} className="text-xs text-muted-foreground">
          Load more notes
        </Button>
      )
    }

    return (
      <div style={style} className="flex items-center justify-center px-2 py-2">
        {loadMoreContent}
      </div>
    )
  }

  const note = items[index]
  if (!note) return null

  return (
    <div style={style} className="px-2 py-1.5">
      <AIIndexNoteRow
        note={note}
        onMutated={onMutated}
        onOpenNote={onOpenNote}
        isExiting={exitingNoteIds.has(note.id)}
      />
    </div>
  )
})
AIIndexRowRenderer.displayName = "AIIndexRowRenderer"

const Sizer = ({
  height,
  width,
  children,
}: {
  height?: number
  width?: number
  children: (size: { height: number; width: number }) => React.ReactNode
}) => {
  if (height !== undefined && width !== undefined) {
    return <div style={{ height, width }}>{children({ height, width })}</div>
  }

  return (
    <AutoSizer defaultHeight={500} defaultWidth={300} style={{ height: "100%", width: "100%" }}>
      {children}
    </AutoSizer>
  )
}

function LoadingSkeleton() {
  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="space-y-3">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="rounded-2xl border border-border/60 bg-card/80 p-4">
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted/60" />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="h-14 animate-pulse rounded-xl bg-muted/50" />
            <div className="h-14 animate-pulse rounded-xl bg-muted/50" />
          </div>
          <div className="mt-3 flex gap-2">
            <div className="h-9 w-28 animate-pulse rounded-md bg-muted/50" />
            <div className="h-9 w-36 animate-pulse rounded-md bg-muted/50" />
          </div>
        </div>
      ))}
      </div>
    </div>
  )
}

export const AIIndexList = memo(function AIIndexList({
  notes,
  exitingNoteIds = [],
  isLoading,
  hasMore,
  isFetchingNextPage,
  onLoadMore,
  onMutated,
  onOpenNote,
  emptyState,
  initialScrollOffset = 0,
  onScrollOffsetChange,
  height,
  width,
}: {
  notes: AIIndexNoteRowData[]
  exitingNoteIds?: string[]
  isLoading: boolean
  hasMore: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
  onMutated: (result: AIIndexMutationResult) => void
  onOpenNote: (noteId: string) => void
  emptyState: React.ReactNode
  initialScrollOffset?: number
  onScrollOffsetChange?: (scrollOffset: number) => void
  height?: number
  width?: number
}) {
  const dynamicRowHeight = useDynamicRowHeight({ defaultRowHeight: 168 })
  const listRef = useListRef()
  const restoredScrollOffsetRef = React.useRef<number | null>(null)
  const exitingNoteIdSet = useMemo(() => new Set(exitingNoteIds), [exitingNoteIds])

  const itemData = useMemo(() => ({
    items: notes,
    exitingNoteIds: exitingNoteIdSet,
    hasMore,
    isLoadingMore: isFetchingNextPage,
    onLoadMore,
    onMutated,
    onOpenNote,
  }), [exitingNoteIdSet, hasMore, isFetchingNextPage, notes, onLoadMore, onMutated, onOpenNote])

  React.useLayoutEffect(() => {
    if (initialScrollOffset <= 0) return
    if (restoredScrollOffsetRef.current === initialScrollOffset) return

    const element = listRef.current?.element
    if (!element) return

    element.scrollTo({ top: initialScrollOffset, behavior: "auto" })
    restoredScrollOffsetRef.current = initialScrollOffset
  }, [initialScrollOffset, listRef, notes.length])

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (notes.length === 0) {
    return (
      <div className="flex h-full min-h-[16rem] items-center justify-center p-6 text-center">
        {emptyState}
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 [&>div>div]:[scrollbar-gutter:stable]">
      <Sizer height={height} width={width}>
        {({ height: listHeight, width: listWidth }) => (
          <VirtualList
            listRef={listRef}
            height={listHeight}
            width={listWidth}
            rowCount={notes.length + (hasMore ? 1 : 0)}
            rowHeight={dynamicRowHeight}
            rowProps={itemData}
            overscanCount={4}
            onScroll={(event: React.UIEvent<HTMLDivElement>) => {
              onScrollOffsetChange?.(event.currentTarget.scrollTop)
            }}
            onRowsRendered={({ stopIndex }: { stopIndex: number }) => {
              if (hasMore && !isFetchingNextPage && stopIndex >= notes.length - 3) {
                onLoadMore()
              }
            }}
            rowComponent={AIIndexRowRenderer}
          />
        )}
      </Sizer>
    </div>
  )
})
