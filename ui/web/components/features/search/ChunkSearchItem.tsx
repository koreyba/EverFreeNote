import { ArrowUpRight } from 'lucide-react'
import { ChunkSnippet } from './ChunkSnippet'
import { cn } from '@ui/web/lib/utils'
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
  const handleOpen = () => onOpenInContext(chunk.noteId, chunk.charOffset, chunk.content.length)

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
        className="px-3 py-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          handleOpen()
        }}
      >
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

        {/* Open hint */}
        <div className="mt-1.5 flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity text-[10px] text-primary">
          <ArrowUpRight className="h-2.5 w-2.5" />
          <span>Open in context</span>
        </div>
      </div>
    </div>
  )
}
