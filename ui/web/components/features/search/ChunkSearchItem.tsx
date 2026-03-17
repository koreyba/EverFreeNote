import { ArrowUpRight } from 'lucide-react'
import { ChunkSnippet } from './ChunkSnippet'
import { cn } from '@ui/web/lib/utils'
import { getRagChunkBodyLength } from '@core/rag/chunkTemplate'
import type { RagChunk } from '@core/types/ragSearch'

interface ChunkSearchItemProps {
  chunk: RagChunk
  onOpenInContext: (noteId: string, charOffset: number, chunkLength: number) => void
  highlightQuery?: string
}

function getAccentClass(score: number) {
  if (score >= 0.8) return 'border-l-emerald-500'
  if (score >= 0.65) return 'border-l-amber-500'
  return 'border-l-border'
}

function getScoreClass(score: number) {
  if (score >= 0.8) return 'text-emerald-400'
  if (score >= 0.65) return 'text-amber-400'
  return 'text-muted-foreground/60'
}

export function ChunkSearchItem({ chunk, onOpenInContext, highlightQuery = '' }: ChunkSearchItemProps) {
  const handleOpen = () => onOpenInContext(chunk.noteId, chunk.charOffset, getRagChunkBodyLength(chunk.content))

  return (
    <div
      role="listitem"
      className={cn(
        'group rounded-lg border border-border/60 bg-card border-l-[3px] overflow-hidden transition-all hover:border-primary/30 hover:shadow-sm',
        getAccentClass(chunk.similarity)
      )}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`Open fragment from "${chunk.noteTitle || 'Untitled'}" in context`}
        className="relative px-3 py-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          handleOpen()
        }}
      >
        <ArrowUpRight className="absolute bottom-2.5 right-2.5 h-3 w-3 text-primary opacity-0 group-hover:opacity-60 transition-opacity" />

        {/* Note title + score */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-[13.5px] font-semibold leading-snug text-foreground flex-1 line-clamp-2">
            {chunk.noteTitle || 'Untitled'}
          </h3>
          <span className={cn('text-[10px] font-medium tabular-nums shrink-0 mt-0.5', getScoreClass(chunk.similarity))}>
            {Math.round(chunk.similarity * 100)}%
          </span>
        </div>

        {/* Snippet — primary content */}
        <ChunkSnippet
          content={chunk.content}
          className="text-[12.5px] leading-relaxed text-foreground/80"
          highlightQuery={highlightQuery}
        />

      </div>
    </div>
  )
}
