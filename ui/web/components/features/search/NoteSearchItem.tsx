import { type KeyboardEvent, useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChunkSnippet } from './ChunkSnippet'
import { cn } from '@ui/web/lib/utils'
import type { RagNoteGroup } from '@core/types/ragSearch'

interface NoteSearchItemProps {
  group: RagNoteGroup
  onOpenInContext: (noteId: string, charOffset: number, chunkLength: number) => void
}

function getScoreTone(score: number) {
  if (score >= 0.8) return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
  if (score >= 0.65) return 'border-amber-500/40 bg-amber-500/10 text-amber-300'
  return 'border-border bg-muted/60 text-muted-foreground'
}

function ScoreBadge({ score, compact = false }: { score: number; compact?: boolean }) {
  const pct = Math.round(score * 100)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 font-medium tabular-nums',
        compact ? 'text-[10px]' : 'text-[11px]',
        getScoreTone(score)
      )}
    >
      {pct}%
    </span>
  )
}

export function NoteSearchItem({ group, onOpenInContext }: NoteSearchItemProps) {
  const [expanded, setExpanded] = useState(false)

  const topChunk = group.chunks[0]
  const extraChunks = group.chunks.slice(1)
  const hasMore = extraChunks.length > 0 || group.hiddenCount > 0

  const hasActiveSelection = () => {
    if (typeof window === 'undefined') return false
    const selection = window.getSelection()
    return Boolean(selection && selection.toString().trim().length > 0)
  }

  const openChunkInContext = (charOffset: number, chunkLength: number) => {
    onOpenInContext(group.noteId, charOffset, chunkLength)
  }

  const handleChunkActivate = (charOffset: number, chunkLength: number) => {
    // Allow selecting/copying snippet text without accidental navigation.
    if (hasActiveSelection()) return
    openChunkInContext(charOffset, chunkLength)
  }

  const handleChunkKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    charOffset: number,
    chunkLength: number
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    openChunkInContext(charOffset, chunkLength)
  }

  return (
    <article
      className="rounded-xl border border-border/70 bg-background/55 p-3 transition-colors hover:border-primary/35 hover:bg-background/75"
      role="listitem"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold leading-snug text-foreground flex-1 line-clamp-2">
          {group.noteTitle || 'Untitled'}
        </h3>
        <ScoreBadge score={group.topScore} />
      </div>

      {group.noteTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {group.noteTags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="h-5 gap-1 rounded-md border-border/60 bg-muted/35 px-1.5 text-[11px] font-medium text-muted-foreground"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {topChunk && (
        <div
          role="button"
          tabIndex={0}
          aria-label={`Open top fragment from "${group.noteTitle || 'Untitled'}" in context`}
          className="group mt-2 rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2 cursor-pointer transition-colors hover:border-primary/45 hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          onClick={() => handleChunkActivate(topChunk.charOffset, topChunk.content.length)}
          onKeyDown={(event) => handleChunkKeyDown(event, topChunk.charOffset, topChunk.content.length)}
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Best match
            </span>
            <ExternalLink className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>
          <ChunkSnippet
            content={topChunk.content}
            className="text-[13px] leading-6 text-foreground/85"
          />
        </div>
      )}

      {hasMore && (
        <div className="mt-2 flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <>
                <ChevronUp className="mr-1 h-3 w-3" />
                Hide fragments
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-3 w-3" />
                {extraChunks.length} more fragment{extraChunks.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      )}

      {expanded && (extraChunks.length > 0 || group.hiddenCount > 0) && (
        <div className="mt-2 border-t border-border/60 pt-2">
          <div className="space-y-2">
            {extraChunks.map((chunk, index) => (
              <div
                key={chunk.chunkIndex}
                role="button"
                tabIndex={0}
                aria-label={`Open fragment ${index + 2} from "${group.noteTitle || 'Untitled'}" in context`}
                className="group rounded-md border border-border/60 bg-muted/15 px-2.5 py-2 cursor-pointer transition-colors hover:border-primary/45 hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                onClick={() => handleChunkActivate(chunk.charOffset, chunk.content.length)}
                onKeyDown={(event) => handleChunkKeyDown(event, chunk.charOffset, chunk.content.length)}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Fragment {index + 2}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <ScoreBadge score={chunk.similarity} compact />
                    <ExternalLink className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                </div>

                <ChunkSnippet
                  content={chunk.content}
                  className="text-[12px] leading-5 text-foreground/80"
                />
              </div>
            ))}
          </div>

          {group.hiddenCount > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              +{group.hiddenCount} similar fragments hidden
            </p>
          )}
        </div>
      )}
    </article>
  )
}
