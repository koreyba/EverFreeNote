"use client"

import { Edit2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import InteractiveTag from "@/components/InteractiveTag"
import { SanitizationService } from "@/lib/services/sanitizer"
import type { Note } from "@/types/domain"

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
}

export function NoteView({
  note,
  onEdit,
  onDelete,
  onTagClick,
  onRemoveTag
}: NoteViewProps) {
  // Sanitize content before rendering
  const sanitizedContent = SanitizationService.sanitize(note.description || note.content || '')

  return (
    <div className="flex-1 flex flex-col">
      {/* Note View Header */}
      <div className="p-4 border-b bg-card flex items-center justify-between">
        <h2 className="text-lg font-semibold">{note.title}</h2>
        <div className="flex gap-2">
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
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
            <div className="flex flex-wrap gap-2 mb-6">
              {note.tags.map((tag, index) => (
                <InteractiveTag
                  key={index}
                  tag={tag}
                  onClick={onTagClick}
                  onRemove={onRemoveTag}
                />
              ))}
            </div>
          )}
          
          <div className="prose prose-lg max-w-none">
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          </div>
          
          <div className="mt-8 pt-4 border-t text-sm text-muted-foreground">
            <p>Created: {new Date(note.created_at).toLocaleString()}</p>
            <p>Updated: {new Date(note.updated_at).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
