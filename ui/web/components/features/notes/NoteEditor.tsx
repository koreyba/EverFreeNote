"use client"

import * as React from "react"
import { Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import RichTextEditor, { type RichTextEditorHandle } from "@/components/RichTextEditor"
import { useDebouncedCallback } from "@ui/web/hooks/useDebouncedCallback"

const DEFAULT_AUTOSAVE_DELAY_MS = 1500

interface NoteEditorProps {
  noteId?: string
  initialTitle?: string
  initialDescription?: string
  initialTags?: string
  isSaving: boolean
  onSave: (data: { title: string; description: string; tags: string }) => void
  onRead: (data: { title: string; description: string; tags: string }) => void
  onAutoSave?: (data: { noteId?: string; title: string; description: string; tags: string }) => Promise<void> | void
  isAutoSaving?: boolean
  autosaveDelayMs?: number
  lastSavedAt?: string | null
}

export const NoteEditor = React.memo(function NoteEditor({
  initialTitle = "",
  initialDescription = "",
  initialTags = "",
  isSaving,
  onSave,
  onRead,
  onAutoSave,
  isAutoSaving = false,
  autosaveDelayMs = DEFAULT_AUTOSAVE_DELAY_MS,
  noteId,
  lastSavedAt,
}: NoteEditorProps) {
  const [inputResetKey, setInputResetKey] = React.useState(0)
  const [showSaving, setShowSaving] = React.useState(false)
  const titleInputRef = React.useRef<HTMLInputElement | null>(null)
  const tagsInputRef = React.useRef<HTMLInputElement | null>(null)
  const editorRef = React.useRef<RichTextEditorHandle | null>(null)
  const firstRenderRef = React.useRef(true)

  // Helper to get current form data from refs (single source of truth)
  const getFormData = React.useCallback(() => ({
    title: titleInputRef.current?.value ?? initialTitle,
    description: editorRef.current?.getHTML() ?? initialDescription,
    tags: tagsInputRef.current?.value ?? initialTags,
  }), [initialTitle, initialDescription, initialTags])

  const debouncedAutoSave = useDebouncedCallback(
    async () => {
      if (!onAutoSave) return
      try {
        await onAutoSave({ noteId, ...getFormData() })
      } catch {
        // Errors handled upstream
      }
    },
    autosaveDelayMs
  )

  // Sync editor content when switching notes
  React.useEffect(() => {
    editorRef.current?.setContent(initialDescription)
    setInputResetKey((k) => k + 1)
    firstRenderRef.current = true
  }, [initialTitle, initialDescription, initialTags])

  // Sync external auto-saving flag into local display state
  React.useEffect(() => {
    if (isAutoSaving) {
      setShowSaving(true)
    } else {
      const timer = setTimeout(() => setShowSaving(false), 500)
      return () => clearTimeout(timer)
    }
  }, [isAutoSaving])

  const handleSave = () => {
    debouncedAutoSave.cancel()
    onSave(getFormData())
  }

  const handleRead = () => {
    debouncedAutoSave.cancel()
    onRead(getFormData())
  }

  // Trigger debounced autosave on any content change
  const handleContentChange = React.useCallback(() => {
    if (!onAutoSave) return
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    debouncedAutoSave.call()
  }, [onAutoSave, debouncedAutoSave])

  return (
    <div className="flex-1 flex flex-col">
      {/* Editor Header */}
      <div className="p-4 border-b bg-card flex items-start justify-between">
        <h2 className="text-lg font-semibold text-muted-foreground">Editing</h2>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            <Button
              onClick={handleRead}
              variant="outline"
              disabled={isSaving}
            >
              Read
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              Save
            </Button>
          </div>
          {(showSaving || isSaving) ? (
            <div className="text-xs text-muted-foreground animate-pulse">
              Saving...
            </div>
          ) : lastSavedAt ? (
            <div className="text-xs text-muted-foreground">
              Saved at {new Date(lastSavedAt).toLocaleTimeString()}
            </div>
          ) : null}
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
              onChange={handleContentChange}
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
              onChange={handleContentChange}
            />
          </div>
          <div>
            <RichTextEditor
              key={`editor-${inputResetKey}`}
              ref={editorRef}
              initialContent={initialDescription}
              onContentChange={handleContentChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
})
