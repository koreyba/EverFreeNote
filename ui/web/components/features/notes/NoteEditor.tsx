"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import RichTextEditor, { type RichTextEditorHandle } from "@/components/RichTextEditor"
import { useDebouncedCallback } from "@ui/web/hooks/useDebouncedCallback"
import { TagInput } from "@/components/TagInput"
import { buildTagString, normalizeTag, normalizeTagList, parseTagString } from "@ui/web/lib/tags"
import { useTagSuggestions } from "@ui/web/hooks/useTagSuggestions"

const DEFAULT_AUTOSAVE_DELAY_MS = 500

export interface NoteEditorHandle {
  flushPendingSave: () => Promise<void>
}

interface NoteEditorProps {
  noteId?: string
  initialTitle?: string
  initialDescription?: string
  initialTags?: string
  availableTags?: string[]
  isSaving: boolean
  onSave: (data: { title: string; description: string; tags: string }) => void
  onRead: (data: { title: string; description: string; tags: string }) => void
  onAutoSave?: (data: { noteId?: string; title: string; description: string; tags: string }) => Promise<void> | void
  isAutoSaving?: boolean
  autosaveDelayMs?: number
  lastSavedAt?: string | null
}

export const NoteEditor = React.memo(React.forwardRef<NoteEditorHandle, NoteEditorProps>(function NoteEditor({
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
  availableTags = [],
}: NoteEditorProps, ref) {
  const [inputResetKey, setInputResetKey] = React.useState(0)
  const [showSaving, setShowSaving] = React.useState(false)
  const [selectedTags, setSelectedTags] = React.useState<string[]>(() => parseTagString(initialTags))
  const [tagQuery, setTagQuery] = React.useState("")
  const titleInputRef = React.useRef<HTMLInputElement | null>(null)
  const editorRef = React.useRef<RichTextEditorHandle | null>(null)

  // Helper to get current form data from refs (single source of truth)
  const getFormData = React.useCallback(() => ({
    title: titleInputRef.current?.value ?? initialTitle,
    description: editorRef.current?.getHTML() ?? initialDescription,
    tags: buildTagString(selectedTags),
  }), [initialTitle, initialDescription, selectedTags])

  const debouncedTagQuery = useDebouncedCallback((value: string) => {
    setTagQuery(normalizeTag(value))
  }, 320)


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
    setSelectedTags(parseTagString(initialTags))
    debouncedTagQuery.cancel()
    setTagQuery("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    debouncedAutoSave.call()
  }, [onAutoSave, debouncedAutoSave])

  const suggestions = useTagSuggestions({
    allTags: availableTags,
    selectedTags,
    query: tagQuery,
  })

  const addTags = React.useCallback((nextTags: string[]) => {
    const normalized = normalizeTagList(nextTags)
    if (normalized.length === 0) return
    setSelectedTags((prev) => {
      const existing = new Set(prev)
      const merged = [...prev]
      for (const tag of normalized) {
        if (existing.has(tag)) continue
        existing.add(tag)
        merged.push(tag)
      }
      return merged
    })
    debouncedTagQuery.cancel()
    setTagQuery("")
    // Trigger autosave when tags change
    debouncedAutoSave.call()
  }, [debouncedTagQuery, debouncedAutoSave])

  const removeTag = React.useCallback((tagToRemove: string) => {
    setSelectedTags((prev) => prev.filter((tag) => tag !== tagToRemove))
    // Trigger autosave when tags change
    debouncedAutoSave.call()
  }, [debouncedAutoSave])


  // Expose API for parent component to flush pending saves
  React.useImperativeHandle(ref, () => ({
    flushPendingSave: async () => {
      if (!onAutoSave) return
      debouncedAutoSave.flush()
    }
  }), [onAutoSave, debouncedAutoSave])

  return (
    <div className="flex-1 flex min-h-0 flex-col">
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
      <div className="flex-1 overflow-y-auto bg-card">
        <div className="max-w-4xl mx-auto px-6 pt-6 space-y-4">
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
          <TagInput
            tags={selectedTags}
            onAddTags={addTags}
            onRemoveTag={removeTag}
            suggestions={suggestions}
            onQueryChange={debouncedTagQuery.call}
            placeholder="work, personal, ideas"
          />
        </div>
        <div className="max-w-4xl mx-auto px-6 pb-6">
          <RichTextEditor
            key={`editor-${inputResetKey}`}
            ref={editorRef}
            initialContent={initialDescription}
            onContentChange={handleContentChange}
          />
        </div>
      </div>
    </div>
  )
}))
