"use client"

import { memo } from "react"
import type { MouseEvent } from "react"
import type { KeyboardEvent } from "react"
import InteractiveTag from "@ui/web/components/InteractiveTag"
import { Checkbox } from "@ui/web/components/ui/checkbox"
import DOMPurify from "isomorphic-dompurify"
import { SanitizationService } from "@core/services/sanitizer"
import type { Note, SearchResult } from "@core/types/domain"
import { cn } from "@ui/web/lib/utils"
import { useLongPress } from "@ui/web/hooks/useLongPress"
import { selectableSurfaceStateClasses } from "@ui/web/lib/selectableSurfaceStyles"

type NoteRecord = Note & {
  content?: string | null
  headline?: string | null
  rank?: number | null
}

type NoteCardProps = {
  note: NoteRecord | SearchResult
  variant: "compact" | "search"
  isSelected?: boolean
  selectionMode?: boolean
  onClick: () => void
  onToggleSelect?: () => void
  onTagClick?: (tag: string) => void
  highlightQuery?: string
}

function getAccentClass(rank: number) {
  if (rank >= 0.8) return 'border-l-emerald-500'
  if (rank >= 0.65) return 'border-l-amber-500'
  return 'border-l-border'
}

function getScoreClass(rank: number) {
  if (rank >= 0.8) return 'text-emerald-400'
  if (rank >= 0.65) return 'text-amber-400'
  return 'text-muted-foreground/60'
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildHighlightPattern(query: string): RegExp | null {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return null
  const unique = Array.from(new Set(terms)).sort((a, b) => b.length - a.length).map(escapeRegExp)
  return new RegExp(`(${unique.join('|')})`, 'gi')
}

export const NoteCard = memo(function NoteCard({
  note,
  variant,
  isSelected,
  selectionMode,
  onClick,
  onToggleSelect,
  onTagClick,
  highlightQuery = '',
}: NoteCardProps) {
  const checkboxChecked = Boolean(selectionMode && isSelected)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: variant === "search" ? "short" : "numeric",
      day: "numeric",
    })
  }

  const hasTextSelectionInside = (target: HTMLElement) => {
    if (typeof window === "undefined") return false
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return false
    const anchorNode = selection.anchorNode
    const focusNode = selection.focusNode
    return Boolean(
      (anchorNode && target.contains(anchorNode)) ||
      (focusNode && target.contains(focusNode))
    )
  }

  const { longPressHandlers, consumeLongPress } = useLongPress(
    () => onToggleSelect?.(),
    {
      enabled: !selectionMode && !!onToggleSelect,
    }
  )

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (consumeLongPress()) return
    if (hasTextSelectionInside(event.currentTarget)) return
    onClick()
  }

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === "Enter") {
      event.preventDefault()
      onClick()
      return
    }
    if (event.key === " ") {
      event.preventDefault()
      onClick()
    }
  }

  // Compact variant - for regular note list
  if (variant === "compact") {
    return (
      <div
        data-testid="note-card"
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        role="button"
        tabIndex={0}
        className={cn(
          "group p-3.5 rounded-xl cursor-pointer transition-all duration-200 border h-full select-none hover:shadow-sm active:scale-[0.98]",
          isSelected ? selectableSurfaceStateClasses.active : selectableSurfaceStateClasses.idleCard
        )}
        {...longPressHandlers}
      >
        <div className="flex items-start gap-3 h-full">
          {onToggleSelect && (
            <Checkbox
              checked={checkboxChecked}
              onCheckedChange={() => onToggleSelect?.()}
              onClick={(e) => e.stopPropagation()}
              tabIndex={selectionMode ? 0 : -1}
              aria-hidden={!selectionMode}
              className={cn(
                "mt-1 shrink-0 transition-opacity",
                selectionMode
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
              )}
            />
          )}
          <div className="flex-1 min-w-0 flex flex-col h-full">
            <h3 className="font-semibold text-sm leading-snug text-foreground truncate">{note.title || "Untitled"}</h3>
            <p className="text-[13px] text-muted-foreground leading-normal line-clamp-2 mt-1.5">
              {note.description ? SanitizationService.stripHtml(note.description) : ""}
            </p>
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {note.tags.slice(0, 3).map((tag, index) => (
                  <InteractiveTag
                    key={index}
                    tag={tag}
                    onClick={onTagClick || (() => { })}
                    showIcon={false}
                    className="text-[11px] px-2 py-0.5 rounded-full"
                  />
                ))}
              </div>
            )}
            <div className="flex-1" />
            <p className="text-[10px] text-muted-foreground mt-2.5 font-medium">{formatDate(note.updated_at)}</p>
          </div>
        </div>
      </div>
    )
  }

  // Search variant - styled to match AI search cards
  const searchNote = note as SearchResult
  const rank = searchNote.rank ?? 0

  // Strip HTML marks â†’ plain text â†’ truncate (same approach as ChunkSnippet)
  const plainHeadline = searchNote.headline
    ? DOMPurify.sanitize(searchNote.headline, { ALLOWED_TAGS: [] })
    : null
  const truncated = plainHeadline
    ? (plainHeadline.length > 200 ? plainHeadline.slice(0, 200).trimEnd() + 'â€¦' : plainHeadline)
    : null

  const pattern = highlightQuery ? buildHighlightPattern(highlightQuery) : null
  const parts = truncated ? (pattern ? truncated.split(pattern) : [truncated]) : null

  return (
    <article
      data-testid="note-card"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
      {...longPressHandlers}
      className={cn(
        'group relative rounded-xl border border-border/40 bg-card border-l-[3px] cursor-pointer transition-all hover:border-primary/20 hover:shadow-sm active:scale-[0.98]',
        getAccentClass(rank)
      )}
    >
      {onToggleSelect && (
        <Checkbox
          checked={checkboxChecked}
          onCheckedChange={() => onToggleSelect?.()}
          onClick={(e) => e.stopPropagation()}
          tabIndex={selectionMode ? 0 : -1}
          aria-hidden={!selectionMode}
          className={cn(
            "absolute left-2 top-2 z-10 bg-background/90 transition-opacity",
            selectionMode
              ? "opacity-100"
              : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
          )}
        />
      )}
      <div className="p-3.5">
        {/* Title + rank */}
        <div className="flex items-start gap-2 justify-between">
          <h3
            className={cn(
              "text-[14px] font-semibold leading-snug text-foreground flex-1 line-clamp-2",
              onToggleSelect && "pl-6"
            )}
          >
            {note.title || 'Untitled'}
          </h3>
          {searchNote.rank !== undefined && searchNote.rank !== null && (
            <span className={cn('text-[10px] font-medium tabular-nums shrink-0 mt-0.5', getScoreClass(rank))}>
              {(rank * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {note.tags.slice(0, 5).map((tag, idx) => (
              <InteractiveTag
                key={idx}
                tag={tag}
                onClick={onTagClick || (() => { })}
                showIcon={false}
                className="text-[11px] px-2 py-0.5 rounded-full"
              />
            ))}
            {note.tags.length > 5 && (
              <span className="text-[10px] text-muted-foreground/60 self-center">+{note.tags.length - 5}</span>
            )}
          </div>
        )}

        {/* Headline snippet with JS highlighting â€” height is deterministic, no CSS clamp needed */}
        {parts && (
          <div className="mt-2.5 rounded-lg bg-muted/40 px-3 py-2 border border-border/20">
            <p className="text-[12.5px] leading-relaxed text-foreground/80">
              {parts.map((part, i) => {
                if (pattern && i % 2 === 1) {
                  return <mark key={i} className="rounded-sm bg-primary/25 px-0.5 text-foreground">{part}</mark>
                }
                return <span key={i}>{part}</span>
              })}
            </p>
          </div>
        )}

        {/* Date */}
        <p className="mt-2.5 text-[10px] text-muted-foreground font-medium">{formatDate(note.updated_at)}</p>
      </div>
    </article>
  )
})

