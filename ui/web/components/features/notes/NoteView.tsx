"use client"

import * as React from "react"
import { PencilSimple as Edit2, Trash as Trash2, CaretLeft as ChevronLeft, Copy, Check } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import InteractiveTag from "@/components/InteractiveTag"
import { HorizontalTagScroll } from "@/components/HorizontalTagScroll"
import { MoreActionsMenu } from "@/components/features/notes/MoreActionsMenu"
import { SanitizationService } from "@core/services/sanitizer"
import { NoteClipboardService } from "@core/services/noteClipboard"
import { useCopyNote } from "@ui/web/hooks/useCopyNote"
import { useDebouncedSessionCallback } from "@ui/web/hooks/useDebouncedSessionCallback"
import { NOTE_CONTENT_CLASS } from "@core/constants/typography"
import type { Note } from "@core/types/domain"
import type { NoteViewSession } from "@core/services/noteWorkspaceTabs"

// Reading scroll fires per frame; batch updates before they hit workspace state.
const SCROLL_SYNC_DELAY_MS = 250

// Define NoteRecord locally to match what's used in page.tsx
type NoteRecord = Note & {
  content?: string | null
  headline?: string | null
  rank?: number | null
}

interface NoteViewProps {
  note: NoteRecord
  onEdit: () => void
  onDelete: () => void
  onTagClick: (tag: string) => void
  onRemoveTag: (tag: string) => void
  onBack?: () => void
  wordpressConfigured?: boolean
  initialScrollTop?: number
  onViewSessionChange?: (view: Partial<NoteViewSession>) => void
}

export const NoteView = React.memo(function NoteView({
  note,
  onEdit,
  onDelete,
  onTagClick,
  onRemoveTag,
  onBack,
  wordpressConfigured = false,
  initialScrollTop = 0,
  onViewSessionChange,
}: NoteViewProps) {
  const bodyHtml = note.description || note.content || ''

  // Мемоизация санитаризованного контента для предотвращения повторной обработки
  const sanitizedContent = React.useMemo(
    () => SanitizationService.sanitize(bodyHtml),
    [bodyHtml]
  )

  const { copied, copyNote } = useCopyNote()
  const isBodyEmpty = React.useMemo(() => NoteClipboardService.isBodyEmpty(bodyHtml), [bodyHtml])
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const initialScrollTopRef = React.useRef(initialScrollTop)
  // Reading mode has no synchronous capture path, so the latest scroll position
  // is flushed when this view unmounts (tab switch, edit, close).
  const debouncedViewNotify = useDebouncedSessionCallback<Partial<NoteViewSession>>(
    onViewSessionChange,
    SCROLL_SYNC_DELAY_MS,
    'flush',
  )

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (contentRef.current) contentRef.current.scrollTop = initialScrollTopRef.current
    })
    return () => window.cancelAnimationFrame(frame)
  }, [note.id])

  // Форматирование дат для предотвращения повторных вычислений
  const formattedDates = React.useMemo(() => ({
    created: new Date(note.created_at).toLocaleString(),
    updated: new Date(note.updated_at).toLocaleString()
  }), [note.created_at, note.updated_at])

  const getExportNote = React.useCallback(() => ({
    id: note.id,
    title: note.title,
    description: note.description || note.content || '',
    tags: note.tags ?? [],
  }), [note.content, note.description, note.id, note.tags, note.title])

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-card">
      {/* Note View Header */}
      {/* gap-2 + a shrinkable mode label + a non-shrinking action group: the
          actions keep their full width and the label gives way, so the row
          can never push a control past the right edge. */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-2 border-b border-border/40 bg-card/75 p-3 backdrop-blur-md md:p-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {onBack && (
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full shadow-sm md:hidden"
              onClick={onBack}
              data-cy="note-back-button"
              aria-label="Back"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {/* Hidden on phones for the same reason as the editing header: the
              tab bar names the note and the actions name the mode. */}
          <h2 className="sr-only truncate text-xs font-bold uppercase tracking-wider text-muted-foreground md:not-sr-only">Reading</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Icon-only below md, matching the editing header: the label row
              otherwise overflows the header on a phone. */}
          <Button
            onClick={onEdit}
            variant="outline"
            size="sm"
            data-cy="note-edit-button"
            aria-label="Edit"
            className="rounded-full shadow-sm"
          >
            <Edit2 className="w-3.5 h-3.5 md:mr-1.5" />
            <span className="hidden md:inline">Edit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-cy="note-copy-button"
            aria-label="Copy note"
            disabled={isBodyEmpty}
            onClick={() => copyNote(bodyHtml)}
            className="rounded-full shadow-sm"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 md:mr-1.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 md:mr-1.5" />
            )}
            <span className="hidden md:inline">{copied ? "Copied" : "Copy"}</span>
          </Button>
          <Button
            onClick={onDelete}
            variant="outline"
            size="sm"
            data-cy="note-delete-button"
            aria-label="Delete note"
            className="rounded-full text-destructive dark:text-red-400 hover:text-destructive dark:hover:text-red-300 hover:bg-destructive/10 dark:hover:bg-red-950/30 border-destructive/25 dark:border-red-900/50 hover:border-destructive/30 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5 md:mr-1.5" />
            <span className="hidden md:inline" aria-hidden="true">Delete</span>
          </Button>
          {/* More actions menu -- always visible, contains RAG index controls + optional WP export */}
          <MoreActionsMenu
            noteId={note.id}
            wordpressConfigured={wordpressConfigured}
            getExportNote={getExportNote}
          />
        </div>
      </div>

      {/* Note Content */}
      <div
        ref={contentRef}
        // scrollbar-none: the note surface scrolls under a translucent action
        // bar, and a native scrollbar runs the full height of the pane, so it
        // shows up alongside that bar. Reading and editing hide it the same
        // way, otherwise only one of the two modes has a stray edge line.
        className="scrollbar-none flex-1 overflow-y-auto px-6 pt-24 pb-10 bg-card"
        onScroll={(event) => debouncedViewNotify.schedule({ scrollTop: event.currentTarget.scrollTop })}
      >
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
            {note.title}
          </h1>

          {note.tags && note.tags.length > 0 && (
            <div className="mb-8 overflow-hidden">
              <HorizontalTagScroll className="pb-1">
                {note.tags.map((tag) => (
                  <InteractiveTag
                    key={tag}
                    tag={tag}
                    onClick={onTagClick}
                    onRemove={onRemoveTag}
                    className="shrink-0 rounded-full text-[11px] px-2 py-0.5"
                  />
                ))}
              </HorizontalTagScroll>
            </div>
          )}

          <div
            className={NOTE_CONTENT_CLASS}
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          <div className="mt-12 pt-6 border-t border-border/40 text-[11px] text-foreground/70 flex flex-wrap gap-x-6 gap-y-2">
            <span>Created: {formattedDates.created}</span>
            <span>Updated: {formattedDates.updated}</span>
          </div>
        </div>
      </div>
    </div>
  )
})

