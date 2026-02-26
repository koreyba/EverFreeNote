"use client"

import * as React from "react"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import RichTextEditor, { type RichTextEditorHandle } from "@/components/RichTextEditor"
import { useDebouncedCallback } from "@ui/web/hooks/useDebouncedCallback"
import { TagInput } from "@/components/TagInput"
import {
  ExportToWordPressButton,
  type ExportableWordPressNote,
} from "@/components/features/wordpress/ExportToWordPressButton"
import { WordPressExportDialog } from "@/components/features/wordpress/WordPressExportDialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { buildTagString, normalizeTag, normalizeTagList, parseTagString } from "@ui/web/lib/tags"
import { useTagSuggestions } from "@ui/web/hooks/useTagSuggestions"
import { useNoteEditorAutoSave } from "@ui/web/hooks/useNoteEditorAutoSave"

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
  wordpressConfigured?: boolean
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
  wordpressConfigured = false,
}: NoteEditorProps, ref) {
  const [showSaving, setShowSaving] = React.useState(false)
  const [selectedTags, setSelectedTags] = React.useState<string[]>(() => parseTagString(initialTags))
  const [tagQuery, setTagQuery] = React.useState("")
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false)
  const [exportDialogNote, setExportDialogNote] = React.useState<ExportableWordPressNote | null>(null)
  const titleInputRef = React.useRef<HTMLInputElement | null>(null)
  const editorRef = React.useRef<RichTextEditorHandle | null>(null)

  const selectedTagsRef = React.useRef<string[]>(selectedTags)
  React.useEffect(() => {
    selectedTagsRef.current = selectedTags
  }, [selectedTags])

  const debouncedTagQuery = useDebouncedCallback((value: string) => {
    setTagQuery(normalizeTag(value))
  }, 320)

  const getFormData = React.useCallback(() => ({
    title: titleInputRef.current?.value ?? initialTitle,
    description: editorRef.current?.getHTML() ?? initialDescription,
    tags: buildTagString(selectedTagsRef.current),
  }), [initialTitle, initialDescription])

  const { editorSessionKey, handleContentChange, scheduleAutoSave, cancelAutoSave, flushPendingSave } =
    useNoteEditorAutoSave({
      noteId,
      initialTitle,
      initialDescription,
      initialTags,
      autosaveDelayMs,
      onAutoSave,
      getFormData,
      cancelDebouncedTagQuery: debouncedTagQuery.cancel,
      onNoteSwitch: () => {
        const parsed = parseTagString(initialTags)
        setSelectedTags(parsed)
        selectedTagsRef.current = parsed
        setTagQuery("")
      },
    })

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
    cancelAutoSave()
    onSave(getFormData())
  }

  const handleRead = () => {
    cancelAutoSave()
    onRead(getFormData())
  }

  const getExportNote = React.useCallback(() => {
    if (!noteId) return null
    const formData = getFormData()
    return {
      id: noteId,
      title: formData.title.trim() || "Untitled",
      description: formData.description,
      tags: [...selectedTagsRef.current],
    }
  }, [getFormData, noteId])

  const handleExportRequest = React.useCallback((exportNote: ExportableWordPressNote) => {
    setExportDialogNote(exportNote)
    setExportDialogOpen(true)
  }, [])

  const suggestions = useTagSuggestions({
    allTags: availableTags,
    selectedTags,
    query: tagQuery,
  })

  const addTags = React.useCallback((nextTags: string[]) => {
    const normalized = normalizeTagList(nextTags)
    if (normalized.length === 0) return
    const prev = selectedTagsRef.current
    const existing = new Set(prev)
    const merged = [...prev]
    for (const tag of normalized) {
      if (existing.has(tag)) continue
      existing.add(tag)
      merged.push(tag)
    }
    selectedTagsRef.current = merged
    setSelectedTags(merged)
    debouncedTagQuery.cancel()
    setTagQuery("")
    scheduleAutoSave({ tags: buildTagString(merged) })
  }, [debouncedTagQuery, scheduleAutoSave])

  const removeTag = React.useCallback((tagToRemove: string) => {
    const next = selectedTagsRef.current.filter((tag) => tag !== tagToRemove)
    selectedTagsRef.current = next
    setSelectedTags(next)
    scheduleAutoSave({ tags: buildTagString(next) })
  }, [scheduleAutoSave])

  React.useImperativeHandle(ref, () => ({ flushPendingSave }), [flushPendingSave])

  return (
    <div className="flex-1 flex min-h-0 flex-col">
      {/* Editor Header */}
      <div className="p-4 border-b bg-card flex items-start justify-between">
        <h2 className="text-lg font-semibold text-muted-foreground">Editing</h2>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            {wordpressConfigured && noteId ? (
              <ExportToWordPressButton
                getNote={getExportNote}
                onRequestExport={handleExportRequest}
                className="hidden md:inline-flex"
              />
            ) : null}
            <Button onClick={handleRead} variant="outline" disabled={isSaving}>
              Read
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              Save
            </Button>
            {wordpressConfigured && noteId ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden" aria-label="More actions">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <ExportToWordPressButton
                    getNote={getExportNote}
                    onRequestExport={handleExportRequest}
                    triggerVariant="menu-item"
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          {(showSaving || isSaving) ? (
            <div className="text-xs text-muted-foreground animate-pulse">Saving...</div>
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
              key={`title-${editorSessionKey}`}
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
            key={`editor-${editorSessionKey}`}
            ref={editorRef}
            initialContent={initialDescription}
            onContentChange={handleContentChange}
          />
        </div>
      </div>
      {exportDialogNote ? (
        <WordPressExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} note={exportDialogNote} />
      ) : null}
    </div>
  )
}))
