import { NoteSearchItem } from './NoteSearchItem'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { RagNoteGroup } from '@core/types/ragSearch'

const EMPTY_SELECTED_IDS = new Set<string>()

interface NoteSearchResultsProps {
  noteGroups: RagNoteGroup[]
  onOpenInContext: (noteId: string, charOffset: number, chunkLength: number) => void
  query?: string
  onTagClick?: (tag: string) => void
  selectionMode?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (noteId: string) => void
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

export function NoteSearchResults({
  noteGroups,
  onOpenInContext,
  query = '',
  onTagClick,
  selectionMode = false,
  selectedIds = EMPTY_SELECTED_IDS,
  onToggleSelect,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: NoteSearchResultsProps) {
  if (noteGroups.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          No results. Lower Precision or use the <span className="font-medium">...</span> menu on a note to index it.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2" role="list" aria-label="Note search results">
      {noteGroups.map((group) => (
        <NoteSearchItem
          key={group.noteId}
          group={group}
          onOpenInContext={onOpenInContext}
          highlightQuery={query}
          onTagClick={onTagClick}
          selectionMode={selectionMode}
          isSelected={selectedIds.has(group.noteId)}
          onToggleSelect={onToggleSelect}
        />
      ))}
      {(loadingMore || (hasMore && !!onLoadMore)) && (
        <div className="flex justify-center py-2">
          {loadingMore ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMore}
              className="text-xs text-muted-foreground"
            >
              Load more...
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
