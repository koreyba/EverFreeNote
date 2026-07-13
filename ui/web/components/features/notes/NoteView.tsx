"use client"

import * as React from "react"
import { Edit2, Trash2, ChevronLeft, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import InteractiveTag from "@/components/InteractiveTag"
import { HorizontalTagScroll } from "@/components/HorizontalTagScroll"
import { MoreActionsMenu } from "@/components/features/notes/MoreActionsMenu"
import { SanitizationService } from "@core/services/sanitizer"
import { NoteClipboardService } from "@core/services/noteClipboard"
import { useCopyNote } from "@ui/web/hooks/useCopyNote"
import { NOTE_CONTENT_CLASS } from "@core/constants/typography"
import type { Note } from "@core/types/domain"

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
}

export const NoteView = React.memo(function NoteView({
  note,
  onEdit,
  onDelete,
  onTagClick,
  onRemoveTag,
  onBack,
  wordpressConfigured = false,
}: NoteViewProps) {
  const bodyHtml = note.description || note.content || ''

  // Мемоизация санитизированного контента для предотвращения повторной обработки
  const sanitizedContent = React.useMemo(
    () => SanitizationService.sanitize(bodyHtml),
    [bodyHtml]
  )

  const { copied, copyNote } = useCopyNote()
  const isBodyEmpty = React.useMemo(() => NoteClipboardService.isBodyEmpty(bodyHtml), [bodyHtml])

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
    <div className="flex-1 flex min-h-0 flex-col relative bg-card">
      {/* Note View Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 border-b border-border/40 bg-card/75 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden -ml-2 rounded-full h-9 w-9"
              onClick={onBack}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Reading</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            onClick={onEdit}
            variant="outline"
            size="sm"
            className="rounded-full shadow-sm"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
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
            className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 border-destructive/25 hover:border-destructive/30 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            <span className="hidden sm:inline" aria-hidden="true">Delete</span>
          </Button>
          {/* More actions menu — always visible, contains RAG index controls + optional WP export */}
          <MoreActionsMenu
            noteId={note.id}
            wordpressConfigured={wordpressConfigured}
            getExportNote={getExportNote}
          />
        </div>
      </div>

      {/* Note Content */}
      <div className="flex-1 overflow-y-auto px-6 pt-24 pb-10 bg-card">
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

          <div className="mt-12 pt-6 border-t border-border/40 text-[11px] text-muted-foreground/60 flex flex-wrap gap-x-6 gap-y-2">
            <span>Created: {formattedDates.created}</span>
            <span>Updated: {formattedDates.updated}</span>
          </div>
        </div>
      </div>
    </div>
  )
})
