import { ChunkSearchItem } from './ChunkSearchItem'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { RagChunk } from '@core/types/ragSearch'

interface ChunkSearchResultsProps {
  chunks: RagChunk[]
  onOpenInContext: (noteId: string, charOffset: number, chunkLength: number) => void
  query?: string
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

export function ChunkSearchResults({
  chunks,
  onOpenInContext,
  query = '',
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: ChunkSearchResultsProps) {
  if (chunks.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          No results. Lower the precision slider or use the <span className="font-medium">...</span> menu on a note to index it.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2" role="list" aria-label="Chunk search results">
      {chunks.map((chunk) => (
        <ChunkSearchItem
          key={`${chunk.noteId}-${chunk.chunkIndex}`}
          chunk={chunk}
          onOpenInContext={onOpenInContext}
          highlightQuery={query}
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
