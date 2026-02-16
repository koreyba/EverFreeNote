"use client"

import * as React from "react"
import { Edit2, Trash2, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import InteractiveTag from "@/components/InteractiveTag"
import { HorizontalTagScroll } from "@/components/HorizontalTagScroll"
import { ExportToWordPressButton } from "@/components/features/wordpress/ExportToWordPressButton"

import { SanitizationService } from "@core/services/sanitizer"
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
  // Мемоизация санитизированного контента для предотвращения повторной обработки
  const sanitizedContent = React.useMemo(
    () => SanitizationService.sanitize(note.description || note.content || ''),
    [note.description, note.content]
  )

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
    <div className="flex-1 flex min-h-0 flex-col">
      {/* Note View Header */}
      <div className="p-4 border-b bg-card flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden -ml-2"
              onClick={onBack}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <h2 className="text-lg font-semibold text-muted-foreground">Reading</h2>
        </div>
        <div className="flex gap-2">
          {wordpressConfigured ? (
            <ExportToWordPressButton getNote={getExportNote} />
          ) : null}
          <Button
            onClick={onEdit}
            variant="outline"
            size="sm"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            onClick={onDelete}
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Note Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-card">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">
            {note.title}
          </h1>
          
          {note.tags && note.tags.length > 0 && (
            <div className="mb-6 overflow-hidden">
              <HorizontalTagScroll className="pb-1">
                {note.tags.map((tag, index) => (
                  <InteractiveTag
                    key={index}
                    tag={tag}
                    onClick={onTagClick}
                    onRemove={onRemoveTag}
                    className="shrink-0"
                  />
                ))}
              </HorizontalTagScroll>
            </div>
          )}
          
          <div
            className={NOTE_CONTENT_CLASS}
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
          
          <div className="mt-8 pt-4 border-t text-sm text-muted-foreground">
            <p>Created: {formattedDates.created}</p>
            <p>Updated: {formattedDates.updated}</p>
          </div>
        </div>
      </div>
    </div>
  )
})
