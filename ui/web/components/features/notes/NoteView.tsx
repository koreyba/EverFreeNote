"use client"
/* eslint no-unused-vars: "off", "@typescript-eslint/no-unused-vars": "error" -- Use the TypeScript-aware rule for callback declarations. */

import * as React from "react"
import { PencilSimple as Edit2, Trash as Trash2, CaretLeft as ChevronLeft, Copy, Check, MagnifyingGlass } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { NoteTag } from "@/components/NoteTag"
import { PullToRefresh } from "@/components/PullToRefresh"
import { MoreActionsMenu } from "@/components/features/notes/MoreActionsMenu"
import { NoteFindBar } from "@/components/features/notes/NoteFindBar"
import { RenderedNoteContent } from "@/components/RenderedNoteContent"
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
  onRefresh?: (signal: AbortSignal) => Promise<void>
  onViewSessionChange?: (view: Partial<NoteViewSession>) => void
  onViewScrollCapture?: (scrollTop: number) => void
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
  onRefresh,
  onViewSessionChange,
  onViewScrollCapture,
}: NoteViewProps) {
  const bodyHtml = note.description || note.content || ''

  // Мемоизация санитаризованного контента для предотвращения повторной обработки
  const sanitizedContent = React.useMemo(
    () => SanitizationService.sanitizeForReading(bodyHtml),
    [bodyHtml]
  )

  const { copied, copyNote } = useCopyNote()
  const isBodyEmpty = React.useMemo(() => NoteClipboardService.isBodyEmpty(bodyHtml), [bodyHtml])
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const titleRef = React.useRef<HTMLHeadingElement | null>(null)
  const bodyRef = React.useRef<HTMLDivElement | null>(null)
  const [findOpen, setFindOpen] = React.useState(false)
  const [expandedTagsNoteId, setExpandedTagsNoteId] = React.useState<string | null>(null)
  const tagsExpanded = expandedTagsNoteId === note.id
  const tagsId = React.useId()
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
      <div className="relative shrink-0 md:absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-2 border-b border-border/40 bg-card/95 px-3 py-2 backdrop-blur-md md:px-5 md:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-xl shadow-none md:hidden"
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
          <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-xl shadow-none md:hidden"
            data-cy="note-find-button" aria-label="Find in note" aria-expanded={findOpen} onClick={() => setFindOpen((open) => !open)}>
            <MagnifyingGlass className="h-4 w-4" />
          </Button>
          {/* Icon-only below md, matching the editing header: the label row
              otherwise overflows the header on a phone. */}
          <Button
            onClick={onEdit}
            variant="default"
            size="sm"
            data-cy="note-edit-button"
            aria-label="Edit"
            className="h-11 min-w-11 rounded-xl px-0 shadow-none md:h-9 md:min-w-0 md:px-3"
          >
            <Edit2 className="w-3.5 h-3.5 md:mr-1.5" />
            <span className="hidden md:inline">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            data-cy="note-copy-button"
            aria-label="Copy note"
            disabled={isBodyEmpty}
            onClick={() => copyNote(bodyHtml)}
            className="h-11 min-w-11 rounded-xl px-0 shadow-none md:h-9 md:min-w-0 md:px-3"
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
            variant="ghost"
            size="sm"
            data-cy="note-delete-button"
            aria-label="Delete note"
            className="h-11 min-w-11 rounded-xl px-0 text-destructive dark:text-red-400 hover:text-destructive dark:hover:text-red-300 hover:bg-destructive/10 dark:hover:bg-red-950/30 border-destructive/25 dark:border-red-900/50 hover:border-destructive/30 shadow-none md:h-9 md:min-w-0 md:px-3"
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

      {findOpen && (
        <div className="relative shrink-0 md:absolute md:inset-x-0 md:top-[60px] z-20">
          <NoteFindBar key={note.id} scrollRef={contentRef} titleRef={titleRef} bodyRef={bodyRef} onClose={() => setFindOpen(false)} />
        </div>
      )}

      {/* Note Content */}
      <PullToRefresh onRefresh={onRefresh} indicatorClassName="top-16">
        <div
          ref={contentRef}
          // scrollbar-none: the note surface scrolls under a translucent action
          // bar, and a native scrollbar runs the full height of the pane, so it
          // shows up alongside that bar. Reading and editing hide it the same
          // way, otherwise only one of the two modes has a stray edge line.
          className={`scrollbar-none relative min-h-0 flex-1 overflow-y-auto pb-10 pt-6 bg-card ${findOpen ? "md:pt-36" : "md:pt-24"}`}
          onScroll={(event) => {
            const scrollTop = event.currentTarget.scrollTop
            onViewScrollCapture?.(scrollTop)
            debouncedViewNotify.schedule({ scrollTop })
          }}
        >
          <div className="note-document-width">
            <h1 ref={titleRef} className="note-document-title mb-3">
              {note.title}
            </h1>

            {note.tags && note.tags.length > 0 && (
              <div id={tagsId} className="mb-8 flex flex-wrap items-center gap-1.5">
                {(tagsExpanded ? note.tags : note.tags.slice(0, 3)).map((tag) => (
                  <NoteTag key={tag} tag={tag} onClick={onTagClick}
                    onRemove={tagsExpanded || note.tags!.length <= 3 ? onRemoveTag : undefined} />
                ))}
                {note.tags.length > 3 && (
                  <button type="button" className="min-h-11 min-w-11 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={tagsExpanded ? "Show fewer tags" : `Show all ${note.tags.length} tags`}
                    aria-expanded={tagsExpanded} aria-controls={tagsId}
                    onClick={() => setExpandedTagsNoteId(tagsExpanded ? null : note.id)}>
                    {tagsExpanded ? "Show less" : <>+{note.tags.length - 3}<span className="hidden min-[360px]:inline"> more</span></>}
                  </button>
                )}
              </div>
            )}

            <RenderedNoteContent
              ref={bodyRef}
              className={NOTE_CONTENT_CLASS}
              html={sanitizedContent}
            />

            <div className="mt-12 pt-6 border-t border-border/40 text-[11px] text-foreground/70 flex flex-wrap gap-x-6 gap-y-2">
              <span>Created: {formattedDates.created}</span>
              <span>Updated: {formattedDates.updated}</span>
            </div>
          </div>
        </div>
      </PullToRefresh>
    </div>
  )
})
