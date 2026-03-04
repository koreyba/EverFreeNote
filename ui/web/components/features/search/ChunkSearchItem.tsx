import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChunkSnippet } from './ChunkSnippet'
import type { RagChunk } from '@core/types/ragSearch'

interface ChunkSearchItemProps {
  chunk: RagChunk
  onOpenInContext: (noteId: string, charOffset: number, chunkLength: number) => void
}

export function ChunkSearchItem({ chunk, onOpenInContext }: ChunkSearchItemProps) {
  return (
    <div className="py-2 border-b last:border-b-0" role="listitem">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-muted-foreground leading-snug flex-1 truncate">
          {chunk.noteTitle || 'Untitled'}
        </span>
        <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0">
          {Math.round(chunk.similarity * 100)}%
        </span>
      </div>

      <ChunkSnippet content={chunk.content} />

      <Button
        variant="ghost"
        size="sm"
        className="h-5 text-xs px-0 mt-1 gap-1"
        aria-label={`Open "${chunk.noteTitle || 'Untitled'}" in context`}
        onClick={() => onOpenInContext(chunk.noteId, chunk.charOffset, chunk.content.length)}
      >
        <ExternalLink className="w-3 h-3" />
        Open in context
      </Button>
    </div>
  )
}
