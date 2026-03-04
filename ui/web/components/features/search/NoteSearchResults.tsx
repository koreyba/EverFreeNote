import { NoteSearchItem } from './NoteSearchItem'
import type { RagNoteGroup } from '@core/types/ragSearch'

interface NoteSearchResultsProps {
  noteGroups: RagNoteGroup[]
  onOpenInContext: (noteId: string, charOffset: number, chunkLength: number) => void
}

export function NoteSearchResults({ noteGroups, onOpenInContext }: NoteSearchResultsProps) {
  if (noteGroups.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          No results. Try Broad mode or use the <span className="font-medium">...</span> menu on a note to index it.
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
        />
      ))}
    </div>
  )
}
