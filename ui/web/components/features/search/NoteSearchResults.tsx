import { NoteSearchItem } from './NoteSearchItem'
import type { RagNoteGroup } from '@core/types/ragSearch'

interface NoteSearchResultsProps {
  noteGroups: RagNoteGroup[]
  onOpenInContext: (noteId: string, charOffset: number, chunkLength: number) => void
}

export function NoteSearchResults({ noteGroups, onOpenInContext }: NoteSearchResultsProps) {
  if (noteGroups.length === 0) {
    return (
      <p className="text-xs text-muted-foreground px-1 py-3">
        No results. Try Broad mode or use the&nbsp;
        <span className="font-medium">…</span>&nbsp;menu on a note to index it.
      </p>
    )
  }

  return (
    <div className="flex flex-col" role="list" aria-label="Note search results">
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
