"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import InteractiveTag from "@/components/InteractiveTag"
import { Checkbox } from "@/components/ui/checkbox"
import DOMPurify from "isomorphic-dompurify"
import { SanitizationService } from "@/lib/services/sanitizer"
import type { Note, SearchResult } from "@/types/domain"

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
}

export function NoteCard({
  note,
  variant,
  isSelected,
  selectionMode,
  onClick,
  onToggleSelect,
  onTagClick,
}: NoteCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: variant === "search" ? "short" : "numeric",
      day: "numeric",
    })
  }

  // Compact variant - for regular note list
  if (variant === "compact") {
    return (
      <div
        onClick={onClick}
        className={`p-3 rounded-lg cursor-pointer transition-colors border ${
          isSelected ? "bg-accent border-primary/60" : "hover:bg-muted/50 border-transparent"
        }`}
      >
        <div className="flex items-start gap-3">
          {selectionMode && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect?.()}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{note.title}</h3>
            <p className="text-sm text-muted-foreground truncate mt-1">
              {note.description ? SanitizationService.stripHtml(note.description) : ""}
            </p>
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {note.tags.slice(0, 3).map((tag, index) => (
                  <InteractiveTag
                    key={index}
                    tag={tag}
                    onClick={onTagClick || (() => {})}
                    showIcon={false}
                    className="text-xs px-2 py-0.5"
                  />
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">{formatDate(note.updated_at)}</p>
          </div>
        </div>
      </div>
    )
  }

  // Search variant - for search results
  const searchNote = note as SearchResult
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {selectionMode && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect?.()}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-lg line-clamp-2">{note.title || "Untitled"}</CardTitle>
              <div className="flex gap-1 flex-shrink-0">
                {searchNote.rank !== undefined && searchNote.rank !== null && (
                  <Badge variant="secondary" className="text-xs">
                    {(searchNote.rank * 100).toFixed(1)}%
                  </Badge>
                )}
              </div>
            </div>
            <CardContent className="space-y-3 px-0 pt-3">
              {/* Highlighted content preview */}
              {searchNote.headline && (
                <div
                  className="text-sm text-muted-foreground line-clamp-3"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(searchNote.headline, { ALLOWED_TAGS: ["mark"] }),
                  }}
                />
              )}

              {/* Tags */}
              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {note.tags.slice(0, 5).map((tag, idx) => (
                    <InteractiveTag
                      key={idx}
                      tag={tag}
                      onClick={onTagClick || (() => {})}
                      showIcon={false}
                      className="text-xs px-2 py-0.5"
                    />
                  ))}
                  {note.tags.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{note.tags.length - 5}
                    </Badge>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div className="text-xs text-muted-foreground">{formatDate(note.updated_at)}</div>
            </CardContent>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
