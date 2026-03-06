import { type KeyboardEvent, type MouseEvent, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, ArrowUpRight } from 'lucide-react'
import InteractiveTag from '@/components/InteractiveTag'
import { Checkbox } from '@/components/ui/checkbox'
import { ChunkSnippet } from './ChunkSnippet'
import { cn } from '@ui/web/lib/utils'
import { useLongPress } from '@ui/web/hooks/useLongPress'
import type { RagNoteGroup } from '@core/types/ragSearch'

interface NoteSearchItemProps {
  group: RagNoteGroup
  onOpenInContext: (noteId: string, charOffset: number, chunkLength: number) => void
  highlightQuery?: string
  onTagClick?: (tag: string) => void
  selectionMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (noteId: string) => void
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

export function NoteSearchItem({
  group,
  onOpenInContext,
  highlightQuery = '',
  onTagClick,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
}: NoteSearchItemProps) {
  const [expanded, setExpanded] = useState(false)
  const containerRef = useRef<HTMLElement>(null)

  const topChunk = group.chunks[0]
  const extraChunks = group.chunks.slice(1)
  const totalHidden = (extraChunks.length || 0) + (group.hiddenCount || 0)
  const hasMore = extraChunks.length > 0 || group.hiddenCount > 0

  const hasActiveSelection = () => {
    if (typeof window === 'undefined') return false
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return false
    if (selection.toString().trim().length === 0) return false
    const container = containerRef.current
    if (!container) return false
    const anchorNode = selection.anchorNode
    const focusNode = selection.focusNode
    return Boolean(
      (anchorNode && container.contains(anchorNode)) ||
        (focusNode && container.contains(focusNode))
    )
  }

  const openChunkInContext = (charOffset: number, chunkLength: number) => {
    onOpenInContext(group.noteId, charOffset, chunkLength)
  }

  const { longPressHandlers, consumeLongPress } = useLongPress(
    () => onToggleSelect?.(group.noteId),
    {
      enabled: !selectionMode && !!onToggleSelect,
    }
  )

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (consumeLongPress()) return
    if (!selectionMode) return
    event.preventDefault()
    onToggleSelect?.(group.noteId)
  }

  const handleChunkActivate = (
    event: MouseEvent<HTMLElement>,
    charOffset: number,
    chunkLength: number
  ) => {
    if (consumeLongPress()) return
    if (selectionMode) {
      event.stopPropagation()
      onToggleSelect?.(group.noteId)
      return
    }
    if (hasActiveSelection()) return
    openChunkInContext(charOffset, chunkLength)
  }

  const handleChunkKeyDown = (e: KeyboardEvent<HTMLElement>, charOffset: number, chunkLength: number) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    if (selectionMode) {
      onToggleSelect?.(group.noteId)
      return
    }
    if (hasActiveSelection()) return
    openChunkInContext(charOffset, chunkLength)
  }

  return (
    <article
      ref={containerRef}
      className={cn(
        'group relative rounded-lg border border-border/60 bg-card border-l-[3px] overflow-hidden transition-all hover:border-primary/30 hover:shadow-sm',
        getAccentClass(group.topScore)
      )}
      role="listitem"
      onClick={handleCardClick}
      {...longPressHandlers}
    >
      {onToggleSelect && (
        <Checkbox
          aria-label={`Select note ${group.noteTitle || 'Untitled'}`}
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(group.noteId)}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute left-2 top-2 z-10 bg-background/90 transition-opacity",
            selectionMode
              ? "opacity-100"
              : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
          )}
        />
      )}
      <div className="px-3 pt-3 pb-2.5">
        {/* Title + score */}
        <div className="flex items-start gap-2 justify-between">
          <h3
            className={cn(
              'text-[13.5px] font-semibold leading-snug text-foreground flex-1 line-clamp-2',
              onToggleSelect && 'pl-6'
            )}
          >
            {group.noteTitle || 'Untitled'}
          </h3>
          <span className={cn('text-[10px] font-medium tabular-nums shrink-0 mt-0.5', getScoreClass(group.topScore))}>
            {Math.round(group.topScore * 100)}%
          </span>
        </div>

        {/* Tags */}
        {group.noteTags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {group.noteTags.map((tag) => (
              <InteractiveTag
                key={tag}
                tag={tag}
                onClick={selectionMode ? (() => {}) : (onTagClick || (() => {}))}
                showIcon={false}
                className="text-[11px] px-1.5 py-0"
              />
            ))}
          </div>
        )}

        {/* Top chunk */}
        {topChunk && (
          <div
            role="button"
            tabIndex={0}
            aria-label={`Open top fragment from "${group.noteTitle || 'Untitled'}" in context`}
            className="group relative mt-2.5 rounded-md bg-muted/30 px-2.5 py-2 cursor-pointer border border-transparent transition-all hover:bg-muted/50 hover:border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            onClick={(e) => handleChunkActivate(e, topChunk.charOffset, topChunk.content.length)}
            onKeyDown={(e) => handleChunkKeyDown(e, topChunk.charOffset, topChunk.content.length)}
          >
            <ArrowUpRight className="absolute bottom-2 right-2 h-3 w-3 text-primary opacity-0 group-hover:opacity-60 transition-opacity" />
            <ChunkSnippet
              content={topChunk.content}
              className="text-[12.5px] leading-relaxed text-foreground/80"
              highlightQuery={highlightQuery}
            />
          </div>
        )}

        {/* More fragments toggle */}
        {hasMore && (
          <div className="mt-2 flex justify-end">
            <button
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              disabled={selectionMode}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded
                ? 'Hide fragments'
                : `${totalHidden} more fragment${totalHidden !== 1 ? 's' : ''}`}
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        )}
      </div>

      {/* Expanded fragments — visually separated section */}
      {expanded && (extraChunks.length > 0 || group.hiddenCount > 0) && (
        <div className="border-t border-border/40 bg-muted/10 px-3 py-2 space-y-1.5">
          {extraChunks.map((chunk, index) => (
            <div
              key={chunk.chunkIndex}
              role="button"
              tabIndex={0}
              aria-label={`Open fragment ${index + 2} from "${group.noteTitle || 'Untitled'}" in context`}
              className="group relative rounded-md bg-background/60 px-2.5 py-2 cursor-pointer border border-border/40 transition-all hover:bg-background hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              onClick={(e) => handleChunkActivate(e, chunk.charOffset, chunk.content.length)}
              onKeyDown={(e) => handleChunkKeyDown(e, chunk.charOffset, chunk.content.length)}
            >
              <ArrowUpRight className="absolute bottom-2 right-2 h-3 w-3 text-primary opacity-0 group-hover:opacity-60 transition-opacity" />
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Fragment {index + 2}</span>
                <span className={cn('text-[10px] tabular-nums', getScoreClass(chunk.similarity))}>
                  {Math.round(chunk.similarity * 100)}%
                </span>
              </div>
              <ChunkSnippet
                content={chunk.content}
                className="text-[12px] leading-relaxed text-foreground/75"
                highlightQuery={highlightQuery}
              />
            </div>
          ))}
          {group.hiddenCount > 0 && (
            <p className="pt-0.5 text-[11px] text-muted-foreground">
              +{group.hiddenCount} similar fragments hidden
            </p>
          )}
        </div>
      )}
    </article>
  )
}
