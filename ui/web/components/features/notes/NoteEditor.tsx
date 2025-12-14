"use client"

import * as React from "react"
import { Loader2, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import RichTextEditor from "@/components/RichTextEditor"
import { useDebouncedCallback } from "@ui/web/hooks/useDebouncedCallback"

const INPUT_DEBOUNCE_MS = 250
const DEFAULT_AUTOSAVE_DELAY_MS = 1500

interface NoteEditorProps {
  noteId?: string
  initialTitle?: string
  initialDescription?: string
  initialTags?: string
  isSaving: boolean
  onSave: (data: { title: string; description: string; tags: string }) => void
  onAutoSave?: (data: { noteId?: string; title: string; description: string; tags: string }) => Promise<void> | void
  isAutoSaving?: boolean
  autosaveDelayMs?: number
  lastSavedAt?: string | null
  onCancel: () => void
}

export const NoteEditor = React.memo(function NoteEditor({
  initialTitle = "",
  initialDescription = "",
  initialTags = "",
  isSaving,
  onSave,
  onAutoSave,
  isAutoSaving = false,
  autosaveDelayMs = DEFAULT_AUTOSAVE_DELAY_MS,
  onCancel,
  noteId,
  lastSavedAt,
}: NoteEditorProps) {
  const [description, setDescription] = React.useState(initialDescription)
  const [titleState, setTitleState] = React.useState(initialTitle)
  const [tagsState, setTagsState] = React.useState(initialTags)
  const [inputResetKey, setInputResetKey] = React.useState(0)
  const [showSaving, setShowSaving] = React.useState(false)
  const titleInputRef = React.useRef<HTMLInputElement | null>(null)
  const tagsInputRef = React.useRef<HTMLInputElement | null>(null)
  const unmountedRef = React.useRef(false)
  const firstRenderRef = React.useRef(true)
  const debouncedTitle = useDebouncedCallback((value: string) => setTitleState(value), INPUT_DEBOUNCE_MS)
  const debouncedTags = useDebouncedCallback((value: string) => setTagsState(value), INPUT_DEBOUNCE_MS)
  const debouncedAutoSave = useDebouncedCallback(
    async (payload: { noteId?: string; title: string; description: string; tags: string }) => {
      if (!onAutoSave) return
      try {
        await onAutoSave(payload)
      } catch {
        // Errors handled upstream
      }
    },
    autosaveDelayMs
  )

  // Sync with props if they change (e.g. switching notes)
  React.useEffect(() => {
    setDescription(initialDescription)
    setTitleState(initialTitle)
    setTagsState(initialTags)
    setInputResetKey((k) => k + 1)
  }, [initialTitle, initialDescription, initialTags])

  React.useEffect(() => {
    return () => {
      unmountedRef.current = true
    }
  }, [])

  // Sync external auto-saving flag into local display state
  React.useEffect(() => {
    setShowSaving(isAutoSaving)
  }, [isAutoSaving])

  const handleSave = () => {
    const latestTitle = titleInputRef.current?.value ?? titleState
    const latestTags = tagsInputRef.current?.value ?? tagsState
    onSave({ title: latestTitle, description, tags: latestTags })
  }

  const handleTitleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedTitle(e.target.value)
  }, [debouncedTitle])

  const handleTagsChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedTags(e.target.value)
  }, [debouncedTags])

  // Trigger debounced autosave when any field changes (skip initial mount)
  React.useEffect(() => {
    if (!onAutoSave) return
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    debouncedAutoSave({
      noteId,
      title: titleState,
      description,
      tags: tagsState,
    })
  }, [titleState, tagsState, description, noteId, onAutoSave, debouncedAutoSave])

  return (
    <div className="flex-1 flex flex-col">
      {/* Editor Header */}
      <div className="p-4 border-b bg-card flex items-start justify-between">
        <h2 className="text-lg font-semibold text-muted-foreground">Editing</h2>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            <Button
              onClick={onCancel}
              variant="outline"
            >
              Read
            </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || showSaving}
          >
            {isSaving || showSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
                'Save'
              )}
            </Button>
          </div>
          {lastSavedAt && (
            <div className="text-xs text-muted-foreground">
              Saved at {new Date(lastSavedAt).toLocaleTimeString()}
            </div>
          )}
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
