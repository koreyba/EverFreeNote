"use client"

import * as React from "react"
import { Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import RichTextEditor, { type RichTextEditorHandle } from "@/components/RichTextEditor"
import { useDebouncedCallback } from "@ui/web/hooks/useDebouncedCallback"
import InteractiveTag from "@/components/InteractiveTag"
import { buildTagString, normalizeTag, normalizeTagList, parseTagString } from "@ui/web/lib/tags"
import { useTagSuggestions } from "@ui/web/hooks/useTagSuggestions"

const DEFAULT_AUTOSAVE_DELAY_MS = 500

export interface NoteEditorHandle {
  flushPendingSave: (options?: { includePendingTag?: boolean }) => Promise<void>
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
  const tagInputRef = React.useRef<HTMLInputElement | null>(null)
  const editorRef = React.useRef<RichTextEditorHandle | null>(null)
  const firstRenderRef = React.useRef(true)
  const backspaceArmedRef = React.useRef(false)

  // Helper to get current form data from refs (single source of truth)
  const getFormData = React.useCallback(() => ({
    title: titleInputRef.current?.value ?? initialTitle,
    description: editorRef.current?.getHTML() ?? initialDescription,
    tags: buildTagString(selectedTags),
  }), [initialTitle, initialDescription, selectedTags])

  const debouncedTagQuery = useDebouncedCallback((value: string) => {
    setTagQuery(normalizeTag(value))
  }, 320)

  const commitPendingTag = React.useCallback(() => {
    const pendingValue = tagInputRef.current?.value ?? ""
    const pendingParts = normalizeTagList(pendingValue.split(","))
    if (!pendingParts.length) {
      backspaceArmedRef.current = false
      return buildTagString(selectedTags)
    }

    const merged = normalizeTagList([...selectedTags, ...pendingParts])
    setSelectedTags(merged)
    if (tagInputRef.current) {
      tagInputRef.current.value = ""
    }
    debouncedTagQuery.cancel()
    setTagQuery("")
    backspaceArmedRef.current = false
    return buildTagString(merged)
  }, [selectedTags, debouncedTagQuery])

  const debouncedAutoSave = useDebouncedCallback(
    async () => {
      if (!onAutoSave) return
      try {
        const tags = commitPendingTag()
        await onAutoSave({ noteId, ...getFormData(), tags })
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
    if (tagInputRef.current) {
      tagInputRef.current.value = ""
    }
    debouncedTagQuery.cancel()
    setTagQuery("")
    backspaceArmedRef.current = false
    firstRenderRef.current = true
  }, [initialTitle, initialDescription, initialTags, debouncedTagQuery])

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
    const tags = commitPendingTag()
    onSave({ ...getFormData(), tags })
  }

  const handleRead = () => {
    debouncedAutoSave.cancel()
    const tags = commitPendingTag()
    onRead({ ...getFormData(), tags })
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
    if (tagInputRef.current) {
      tagInputRef.current.value = ""
    }
    debouncedTagQuery.cancel()
    setTagQuery("")
    backspaceArmedRef.current = false
    tagInputRef.current?.focus()
  }, [debouncedTagQuery])

  const removeTag = React.useCallback((tagToRemove: string) => {
    setSelectedTags((prev) => prev.filter((tag) => tag !== tagToRemove))
    backspaceArmedRef.current = false
  }, [])

  const handleTagInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value
    backspaceArmedRef.current = false
    if (!nextValue) {
      debouncedTagQuery.cancel()
      setTagQuery("")
      return
    }
    debouncedTagQuery.call(nextValue)
  }

  const handleTagInputBlur = () => {
    commitPendingTag()
  }

  const handleTagInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const currentValue = tagInputRef.current?.value ?? ""
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      const parts = currentValue.split(",")
      addTags(parts)
      return
    }

    if (event.key === "Backspace" && currentValue.length === 0 && selectedTags.length > 0) {
      event.preventDefault()
      const lastTag = selectedTags[selectedTags.length - 1]
      if (backspaceArmedRef.current) {
        backspaceArmedRef.current = false
        if (lastTag) removeTag(lastTag)
      } else {
        backspaceArmedRef.current = true
      }
      return
    }

    if (event.key !== "Backspace") {
      backspaceArmedRef.current = false
    }
  }

  // Expose API for parent component to flush pending saves
  React.useImperativeHandle(ref, () => ({
    flushPendingSave: async (options) => {
      if (!onAutoSave) return
      if (options?.includePendingTag) {
        const tags = commitPendingTag()
        await onAutoSave({ noteId, ...getFormData(), tags })
        return
      }
      debouncedAutoSave.flush()
    }
  }), [commitPendingTag, getFormData, noteId, onAutoSave, debouncedAutoSave])

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
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Tag className="w-4 h-4" />
              <span>Tags:</span>
            </div>
            <div className="relative">
              <div className="min-h-[44px] w-full rounded-md border border-input bg-transparent px-2 py-2 flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <InteractiveTag
                    key={tag}
                    tag={tag}
                    onRemove={removeTag}
                  />
                ))}
                <input
                  key={`tags-${inputResetKey}`}
                  ref={tagInputRef}
                  type="text"
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagInputKeyDown}
                  onBlur={handleTagInputBlur}
                  placeholder="work, personal, ideas"
                  className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              {suggestions.length > 0 && (
                <div className="mt-2 w-full rounded-md border border-input bg-popover text-popover-foreground shadow">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => addTags([suggestion])}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
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
