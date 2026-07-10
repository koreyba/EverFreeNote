"use client"

import * as React from "react"
import { ChevronLeft, Copy, Check, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import RichTextEditor, { type RichTextEditorHandle } from "@/components/RichTextEditor"
import { NoteClipboardService } from "@core/services/noteClipboard"
import { useCopyNote } from "@ui/web/hooks/useCopyNote"
import { useDebouncedCallback } from "@ui/web/hooks/useDebouncedCallback"
import { TagInput } from "@/components/TagInput"
import { MoreActionsMenu } from "@/components/features/notes/MoreActionsMenu"
import { buildTagString, normalizeTag, normalizeTagList, parseTagString } from "@ui/web/lib/tags"
import { useTagSuggestions } from "@ui/web/hooks/useTagSuggestions"
import { useNoteEditorAutoSave } from "@ui/web/hooks/useNoteEditorAutoSave"

const DEFAULT_AUTOSAVE_DELAY_MS = 500

export interface NoteEditorHandle {
  flushPendingSave: () => Promise<void>
  scrollToChunk: (charOffset: number, chunkLength: number) => void
}

export type PendingChunkFocus = {
  requestId: string
  noteId: string
  charOffset: number
  chunkLength: number
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
  onAutoSave?: (data: { noteId?: string; title: string; description: string; tags: string }) => Promise<{ noteId?: string } | void> | { noteId?: string } | void
  isAutoSaving?: boolean
  autosaveDelayMs?: number
  lastSavedAt?: string | null
  wordpressConfigured?: boolean
  onDelete?: () => void
  onBack?: () => void
  pendingChunkFocus?: PendingChunkFocus | null
  onPendingChunkFocusApplied?: (requestId: string) => void
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
  onDelete,
  onBack,
  pendingChunkFocus = null,
  onPendingChunkFocusApplied,
}: NoteEditorProps, ref) {
  const [showSaving, setShowSaving] = React.useState(false)
  const [selectedTags, setSelectedTags] = React.useState<string[]>(() => parseTagString(initialTags))
  const [tagQuery, setTagQuery] = React.useState("")
  const [readyChunkFocus, setReadyChunkFocus] = React.useState<PendingChunkFocus | null>(null)
  const [isBodyEmpty, setIsBodyEmpty] = React.useState(() => NoteClipboardService.isBodyEmpty(initialDescription))
  const titleInputRef = React.useRef<HTMLInputElement | null>(null)
  const editorRef = React.useRef<RichTextEditorHandle | null>(null)
  const previousNoteIdRef = React.useRef(noteId)

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

  const applyExternalSnapshot = React.useCallback((
    snapshot: { title: string; description: string; tags: string },
    fieldDecisions: Record<'title' | 'description' | 'tags', 'accept-external' | 'acknowledge-local' | 'preserve-local'>
  ) => {
    if (fieldDecisions.title === 'accept-external' && titleInputRef.current && titleInputRef.current.value !== snapshot.title) {
      titleInputRef.current.value = snapshot.title
    }

    if (fieldDecisions.description === 'accept-external' && editorRef.current?.getHTML() !== snapshot.description) {
      editorRef.current?.setContent(snapshot.description)
      setIsBodyEmpty(NoteClipboardService.isBodyEmpty(snapshot.description))
    }

    if (fieldDecisions.tags === 'accept-external' && buildTagString(selectedTagsRef.current) !== snapshot.tags) {
      const parsed = parseTagString(snapshot.tags)
      selectedTagsRef.current = parsed
      setSelectedTags(parsed)
      debouncedTagQuery.cancel()
      setTagQuery("")
    }
  }, [debouncedTagQuery])

  const { editorSessionKey, handleContentChange, scheduleAutoSave, cancelAutoSave, flushPendingSave } =
    useNoteEditorAutoSave({
      noteId,
      initialTitle,
      initialDescription,
      initialTags,
      autosaveDelayMs,
      onAutoSave,
      getFormData,
      applyExternalSnapshot,
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

  const { copied, copyNote } = useCopyNote()

  React.useEffect(() => {
    setIsBodyEmpty(NoteClipboardService.isBodyEmpty(initialDescription))
  }, [initialDescription])

  const handleEditorContentChange = React.useCallback(() => {
    handleContentChange()
    setIsBodyEmpty(NoteClipboardService.isBodyEmpty(editorRef.current?.getHTML() ?? ""))
  }, [handleContentChange])

  const handleCopy = React.useCallback(() => {
    void copyNote(editorRef.current?.getHTML() ?? initialDescription)
  }, [copyNote, initialDescription])

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

  React.useImperativeHandle(ref, () => ({
    flushPendingSave,
    scrollToChunk: (charOffset: number, chunkLength: number) => {
      editorRef.current?.scrollToChunk(charOffset, chunkLength)
    },
  }), [flushPendingSave])

  const effectivePendingChunkFocus = React.useMemo(() => {
    if (!pendingChunkFocus || !noteId) return null
    return pendingChunkFocus.noteId === noteId ? pendingChunkFocus : null
  }, [pendingChunkFocus, noteId])

  React.useEffect(() => {
    const noteChanged = previousNoteIdRef.current !== noteId
    previousNoteIdRef.current = noteId

    if (!effectivePendingChunkFocus) {
      setReadyChunkFocus(null)
      return
    }

    // Real note switches remount the editor after noteId changes. Delay the focus request
    // until the post-switch editor session is active so scroll/highlight are applied once.
    if (noteChanged) {
      setReadyChunkFocus(null)
      return
    }

    setReadyChunkFocus(effectivePendingChunkFocus)
  }, [effectivePendingChunkFocus, noteId, editorSessionKey])

  // Show the "..." menu for existing notes (RAG + delete)
  const showMoreMenu = !!noteId

  return (
    <div className="flex-1 flex min-h-0 flex-col relative bg-card">
      {/* Editor Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 border-b border-border/40 bg-card/75 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden -ml-2 rounded-full h-9 w-9"
              onClick={onBack}
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Editing</h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-1.5 items-center">
            <Button onClick={handleRead} variant="outline" size="sm" disabled={isSaving} className="rounded-full shadow-sm">
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              Read
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isSaving || isBodyEmpty}
              aria-label="Copy note"
              onClick={handleCopy}
              className="rounded-full shadow-sm"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 md:mr-1.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 md:mr-1.5" />
              )}
              <span className="hidden md:inline">{copied ? "Copied" : "Copy"}</span>
            </Button>
            <Button onClick={handleSave} size="sm" disabled={isSaving} className="rounded-full shadow-sm">
              Save
            </Button>
            {/* More actions menu — RAG controls, delete note, WordPress export */}
            {showMoreMenu && (
              <MoreActionsMenu
                noteId={noteId!}
                wordpressConfigured={wordpressConfigured}
                getExportNote={getExportNote}
                onDelete={onDelete}
              />
            )}
          </div>
          {(showSaving || isSaving) ? (
            <div className="text-[10px] text-muted-foreground/70 animate-pulse font-medium">Saving...</div>
          ) : lastSavedAt ? (
            <div className="text-[10px] text-muted-foreground/70 font-medium">
              Saved at {new Date(lastSavedAt).toLocaleTimeString()}
            </div>
          ) : null}
        </div>
      </div>

      {/* Editor Form */}
      <div className="flex-1 overflow-y-auto bg-card">
        <div className="max-w-4xl mx-auto px-6 pt-24 space-y-5">
          <div>
            <Input
              key={`title-${editorSessionKey}`}
              ref={titleInputRef}
              type="text"
              placeholder="Note title"
              defaultValue={initialTitle}
              onChange={handleContentChange}
              className="w-full h-auto border-0 bg-transparent px-0 py-1 text-4xl md:text-4xl font-extrabold tracking-tight placeholder:text-muted-foreground/30 focus-visible:ring-0 focus-visible:outline-none focus:outline-none focus:ring-0 border-none shadow-none"
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
        <div className="max-w-4xl mx-auto px-6 pb-6 mt-4">
          <RichTextEditor
            key={`editor-${editorSessionKey}`}
            ref={editorRef}
            initialContent={initialDescription}
            onContentChange={handleEditorContentChange}
            chunkFocusRequest={
              readyChunkFocus
                ? {
                    requestId: readyChunkFocus.requestId,
                    charOffset: readyChunkFocus.charOffset,
                    chunkLength: readyChunkFocus.chunkLength,
                  }
                : null
            }
            onChunkFocusApplied={onPendingChunkFocusApplied}
          />
        </div>
      </div>
    </div>
  )
}))
