import { ChunkSearchItem } from './ChunkSearchItem'
import type { RagNoteGroup } from '@core/types/ragSearch'

export const MAX_CHUNKS_PER_NOTE = 2

export function getVisibleChunkCount(noteGroups: RagNoteGroup[]): number {
  return noteGroups.reduce(
    (total, group) => total + Math.min(group.chunks.length, MAX_CHUNKS_PER_NOTE),
    0
  )
}

interface ChunkSearchResultsProps {
  noteGroups: RagNoteGroup[]
  onOpenInContext: (noteId: string, charOffset: number, chunkLength: number) => void
  query?: string
}

export function ChunkSearchResults({ noteGroups, onOpenInContext, query = '' }: ChunkSearchResultsProps) {
  if (noteGroups.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          No results. Lower the precision slider or use the <span className="font-medium">...</span> menu on a note to index it.
        </p>
      </div>
    )
  }

  // Flatten to at most 2 chunks per note
  const flatChunks = noteGroups.flatMap((group) => group.chunks.slice(0, MAX_CHUNKS_PER_NOTE))

  return (
    <div className="flex flex-col gap-2" role="list" aria-label="Chunk search results">
      {flatChunks.map((chunk) => (
        <ChunkSearchItem
          key={`${chunk.noteId}-${chunk.chunkIndex}`}
          chunk={chunk}
          onOpenInContext={onOpenInContext}
          highlightQuery={query}
        />
      ))}
    </div>
  )
}
