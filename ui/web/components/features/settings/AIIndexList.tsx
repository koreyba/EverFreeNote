"use client"

import { memo, useMemo } from "react"
import type { CSSProperties } from "react"
import AutoSizer from "react-virtualized-auto-sizer"
import * as ReactWindow from "react-window"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { AIIndexNoteRow as AIIndexNoteRowData } from "@core/types/aiIndex"
import { AIIndexNoteRow } from "@/components/features/settings/AIIndexNoteRow"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VirtualList = ReactWindow.List as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useDynamicRowHeight = (ReactWindow as any).useDynamicRowHeight as (options: { defaultRowHeight: number }) => unknown

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
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  onMutated: () => void
}

const AIIndexRowRenderer = memo(({ index, style, ...props }: RowComponentProps<ItemData>) => {
  const { items, hasMore, isLoadingMore, onLoadMore, onMutated } = props as unknown as ItemData

  if (index === items.length) {
    return (
      <div style={style} className="flex items-center justify-center px-2 py-2">
        {isLoadingMore ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : hasMore ? (
          <Button variant="ghost" size="sm" onClick={onLoadMore} className="text-xs text-muted-foreground">
            Load more notes
          </Button>
        ) : null}
      </div>
    )
  }

  const note = items[index]
  if (!note) return null

  return (
    <div style={style} className="px-2 py-1.5">
      <AIIndexNoteRow note={note} onMutated={onMutated} />
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
  isLoading,
  hasMore,
  isFetchingNextPage,
  onLoadMore,
  onMutated,
  emptyMessage,
  height,
  width,
}: {
  notes: AIIndexNoteRowData[]
  isLoading: boolean
  hasMore: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
  onMutated: () => void
  emptyMessage: string
  height?: number
  width?: number
}) {
  const dynamicRowHeight = useDynamicRowHeight({ defaultRowHeight: 168 })

  const itemData = useMemo(() => ({
    items: notes,
    hasMore,
    isLoadingMore: isFetchingNextPage,
    onLoadMore,
    onMutated,
  }), [hasMore, isFetchingNextPage, notes, onLoadMore, onMutated])

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (notes.length === 0) {
    return (
      <div className="flex h-full min-h-[16rem] items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="h-full min-h-0">
      <Sizer height={height} width={width}>
        {({ height: listHeight, width: listWidth }) => (
          <VirtualList
            height={listHeight}
            width={listWidth}
            rowCount={notes.length + (hasMore ? 1 : 0)}
            rowHeight={dynamicRowHeight}
            rowProps={itemData}
            overscanCount={4}
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
