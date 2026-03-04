import { ChunkSearchItem } from './ChunkSearchItem'
import type { RagNoteGroup } from '@core/types/ragSearch'

const MAX_CHUNKS_PER_NOTE = 2

interface ChunkSearchResultsProps {
  noteGroups: RagNoteGroup[]
  onOpenInContext: (noteId: string, charOffset: number, chunkLength: number) => void
}

export function ChunkSearchResults({ noteGroups, onOpenInContext }: ChunkSearchResultsProps) {
  if (noteGroups.length === 0) {
    return (
      <p className="text-xs text-muted-foreground px-1 py-3">
        No results. Try Broad mode or use the&nbsp;
        <span className="font-medium">…</span>&nbsp;menu on a note to index it.
      </p>
    )
  }

  // Flatten to at most 2 chunks per note
  const flatChunks = noteGroups.flatMap((group) =>
    group.chunks.slice(0, MAX_CHUNKS_PER_NOTE)
  )

  return (
    <div className="flex flex-col" role="list" aria-label="Chunk search results">
      {flatChunks.map((chunk) => (
        <ChunkSearchItem
          key={`${chunk.noteId}-${chunk.chunkIndex}`}
          chunk={chunk}
          onOpenInContext={onOpenInContext}
        />
      ))}
    </div>
  )
}
