"use client"

import * as React from "react"
import { Loader2, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import RichTextEditor from "@/components/RichTextEditor"

const INPUT_DEBOUNCE_MS = 250

interface NoteEditorProps {
  initialTitle?: string
  initialDescription?: string
  initialTags?: string
  isSaving: boolean
  onSave: (data: { title: string; description: string; tags: string }) => void
  onCancel: () => void
}

export const NoteEditor = React.memo(function NoteEditor({
  initialTitle = "",
  initialDescription = "",
  initialTags = "",
  isSaving,
  onSave,
  onCancel
}: NoteEditorProps) {
  const [description, setDescription] = React.useState(initialDescription)
  const [titleCommitted, setTitleCommitted] = React.useState(initialTitle)
  const [tagsCommitted, setTagsCommitted] = React.useState(initialTags)
  const [inputResetKey, setInputResetKey] = React.useState(0)
  const titleInputRef = React.useRef<HTMLInputElement | null>(null)
  const tagsInputRef = React.useRef<HTMLInputElement | null>(null)
  const titleDebounceRef = React.useRef<number | null>(null)
  const tagsDebounceRef = React.useRef<number | null>(null)

  // Sync with props if they change (e.g. switching notes)
  React.useEffect(() => {
    setDescription(initialDescription)
    setTitleCommitted(initialTitle)
    setTagsCommitted(initialTags)
    setInputResetKey((k) => k + 1)
  }, [initialTitle, initialDescription, initialTags])

  const handleSave = () => {
    const latestTitle = titleInputRef.current?.value ?? titleCommitted
    const latestTags = tagsInputRef.current?.value ?? tagsCommitted
    onSave({ title: latestTitle, description, tags: latestTags })
  }

  const handleTitleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current)
    }
    titleDebounceRef.current = window.setTimeout(() => setTitleCommitted(value), INPUT_DEBOUNCE_MS)
  }, [])

  const handleTagsChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (tagsDebounceRef.current) {
      clearTimeout(tagsDebounceRef.current)
    }
    tagsDebounceRef.current = window.setTimeout(() => setTagsCommitted(value), INPUT_DEBOUNCE_MS)
  }, [])

  return (
    <div className="flex-1 flex flex-col">
      {/* Editor Header */}
      <div className="p-4 border-b bg-card flex items-center justify-between">
        <h2 className="text-lg font-semibold text-muted-foreground">
          Editing
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={onCancel}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
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
              key={`title-${inputResetKey}`}
              ref={titleInputRef}
              type="text"
              placeholder="Note title"
              defaultValue={initialTitle}
              onChange={handleTitleChange}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-2xl font-bold leading-snug shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Tag className="w-4 h-4" />
              <span>Tags (comma-separated):</span>
            </div>
            <Input
              key={`tags-${inputResetKey}`}
              ref={tagsInputRef}
              type="text"
              placeholder="work, personal, ideas"
              defaultValue={initialTags}
              onChange={handleTagsChange}
            />
          </div>
          <div>
            <RichTextEditor
              content={description}
              onChange={setDescription}
            />
          </div>
        </div>
      </div>
    </div>
  )
})
