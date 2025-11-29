"use client"

import * as React from "react"
import { Loader2, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import RichTextEditor from "@/components/RichTextEditor"

interface NoteEditorProps {
  title: string
  description: string
  tags: string
  isSaving: boolean
  isNew: boolean
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onTagsChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export const NoteEditor = React.memo(function NoteEditor({
  title,
  description,
  tags,
  isSaving,
  isNew,
  onTitleChange,
  onDescriptionChange,
  onTagsChange,
  onSave,
  onCancel
}: NoteEditorProps) {
  // Обработчики событий для предотвращения пересоздания на каждом рендере
  const handleTitleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onTitleChange(e.target.value)
    },
    [onTitleChange]
  )

  const handleTagsChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onTagsChange(e.target.value)
    },
    [onTagsChange]
  )

  return (
    <div className="flex-1 flex flex-col">
      {/* Editor Header */}
      <div className="p-4 border-b bg-card flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isNew ? 'New Note' : 'Edit Note'}
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={onCancel}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>

      {/* Editor Form */}
      <div className="flex-1 overflow-y-auto p-6 bg-card">
        <div className="max-w-4xl mx-auto space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Note title"
              value={title}
              onChange={handleTitleChange}
              className="text-2xl font-bold border-none focus-visible:ring-0 px-0 bg-transparent"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Tag className="w-4 h-4" />
              <span>Tags (comma-separated)</span>
            </div>
            <Input
              type="text"
              placeholder="work, personal, ideas"
              value={tags}
              onChange={handleTagsChange}
            />
          </div>
          <div>
            <RichTextEditor
              content={description}
              onChange={onDescriptionChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
})
