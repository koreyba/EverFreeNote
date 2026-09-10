"use client"

import * as React from "react"
import { CaretLeft as ChevronLeft, Copy, Check, Eye, FloppyDisk as SaveIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import RichTextEditor, { type RichTextEditorHandle } from "@/components/RichTextEditor"
import { NoteClipboardService } from "@core/services/noteClipboard"
import { useCopyNote } from "@ui/web/hooks/useCopyNote"
import { TagInput } from "@/components/TagInput"
import { MoreActionsMenu } from "@/components/features/notes/MoreActionsMenu"
import { buildTagString, normalizeTag, normalizeTagList, parseTagString } from "@ui/web/lib/tags"
import { useTagSuggestions } from "@ui/web/hooks/useTagSuggestions"
import { useNoteEditorAutoSave } from "@ui/web/hooks/useNoteEditorAutoSave"
import { useDebouncedSessionCallback } from "@ui/web/hooks/useDebouncedSessionCallback"
import type { NoteDraftSnapshot, NoteViewSession } from "@core/services/noteWorkspaceTabs"

const DEFAULT_AUTOSAVE_DELAY_MS = 500
// Below the autosave delay so a pending draft notification always lands before
// the autosave completion marks the tab as saved.
const SESSION_SYNC_DELAY_MS = 250
const NOOP_CANCEL = () => {}

export interface NoteEditorHandle {
  flushPendingSave: () => Promise<void>
  captureSession?: () => NoteEditorSession
  scrollToChunk: (charOffset: number, chunkLength: number) => void
}

export type NoteEditorSession = {
  draft: NoteDraftSnapshot
  view: NoteViewSession
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
  tagCounts?: Record<string, number>
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
  initialSession?: NoteEditorSession
  onDraftChange?: (draft: NoteDraftSnapshot) => void
  onViewSessionChange?: (view: Partial<NoteViewSession>) => void
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
  tagCounts = {},
  wordpressConfigured = false,
  onDelete,
  onBack,
  pendingChunkFocus = null,
  onPendingChunkFocusApplied,
  initialSession,
  onDraftChange,
  onViewSessionChange,
}: NoteEditorProps, ref) {
  const [showSaving, setShowSaving] = React.useState(false)
  const [selectedTags, setSelectedTags] = React.useState<string[]>(() => parseTagString(initialTags))
  const [tagQuery, setTagQuery] = React.useState("")
  const [readyChunkFocus, setReadyChunkFocus] = React.useState<PendingChunkFocus | null>(null)
  const [isBodyEmpty, setIsBodyEmpty] = React.useState(() => NoteClipboardService.isBodyEmpty(initialDescription))
  const titleInputRef = React.useRef<HTMLInputElement | null>(null)
  const editorRef = React.useRef<RichTextEditorHandle | null>(null)
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null)
  const editorRootRef = React.useRef<HTMLDivElement | null>(null)
  const headerRef = React.useRef<HTMLDivElement | null>(null)
  const initialSessionRef = React.useRef(initialSession)
  const previousNoteIdRef = React.useRef(noteId)

  const selectedTagsRef = React.useRef<string[]>(selectedTags)
  React.useEffect(() => {
    selectedTagsRef.current = selectedTags
  }, [selectedTags])

  const handleTagQueryChange = React.useCallback((value: string) => {
    setTagQuery(normalizeTag(value))
  }, [])

  const getFormData = React.useCallback(() => ({
    title: titleInputRef.current?.value ?? initialTitle,
    description: editorRef.current?.getHTML() ?? initialDescription,
    tags: buildTagString(selectedTagsRef.current),
  }), [initialTitle, initialDescription])

  React.useEffect(() => {
    initialSessionRef.current = initialSession
  }, [initialSession])

  // Typing fires per keystroke and scrolling per frame; debounce both before
  // they reach workspace-tab state. Draft updates are cancelled on unmount
  // because tab transitions capture the live editor synchronously, while the
  // latest scroll position is flushed so it is never lost.
  const debouncedDraftNotify = useDebouncedSessionCallback<NoteDraftSnapshot>(
    onDraftChange,
    SESSION_SYNC_DELAY_MS,
    'cancel',
  )
  const debouncedViewNotify = useDebouncedSessionCallback<Partial<NoteViewSession>>(
    onViewSessionChange,
    SESSION_SYNC_DELAY_MS,
    'flush',
  )

  const notifyDraftChange = React.useCallback(() => {
    debouncedDraftNotify.schedule(getFormData())
  }, [debouncedDraftNotify, getFormData])

  // Publish the action bar's height so the sticky formatting toolbar can park
  // flush beneath it. The bar is absolutely positioned over the scroll area,
  // so any mismatch shows as a strip of scrolling text between the two.
  React.useEffect(() => {
    const header = headerRef.current
    const root = editorRootRef.current
    if (!header || !root) return

    const publishHeight = () => {
      root.style.setProperty('--note-editor-header-h', `${Math.round(header.getBoundingClientRect().height)}px`)
    }

    publishHeight()
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(publishHeight)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])


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
      setTagQuery("")
    }
  }, [])

  const { editorSessionKey, handleContentChange, cancelAutoSave, flushPendingSave } =
    useNoteEditorAutoSave({
      noteId,
      initialTitle,
      initialDescription,
      initialTags,
      autosaveDelayMs,
      onAutoSave,
      getFormData,
      applyExternalSnapshot,
      cancelDebouncedTagQuery: NOOP_CANCEL,
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
    notifyDraftChange()
  }, [handleContentChange, notifyDraftChange])

  const handleCopy = React.useCallback(() => {
    void copyNote(editorRef.current?.getHTML() ?? initialDescription)
  }, [copyNote, initialDescription])

  const handleSave = () => {
    cancelAutoSave()
    // The manual save records the draft itself; a late debounced notification
    // would re-mark the saved tab as dirty.
    debouncedDraftNotify.cancel()
    onSave(getFormData())
  }

  const handleRead = () => {
    cancelAutoSave()
    debouncedDraftNotify.cancel()
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
    setTagQuery("")
    notifyDraftChange()
  }, [notifyDraftChange])

  const removeTag = React.useCallback((tagToRemove: string) => {
    const next = selectedTagsRef.current.filter((tag) => tag !== tagToRemove)
    selectedTagsRef.current = next
    setSelectedTags(next)
    setTagQuery("")
    notifyDraftChange()
  }, [notifyDraftChange])

  React.useImperativeHandle(ref, () => ({
    flushPendingSave,
    captureSession: () => {
      const titleInput = titleInputRef.current
      const titleSelection = titleInput && titleInput.selectionStart !== null && titleInput.selectionEnd !== null
        ? { start: titleInput.selectionStart, end: titleInput.selectionEnd }
        : undefined
      const editorSelection = editorRef.current?.getSelection?.()

      // The capture reads the live editor, so a pending debounced draft
      // notification is stale and must not fire after the transition.
      debouncedDraftNotify.cancel()
      debouncedViewNotify.cancel()

      return {
        draft: getFormData(),
        view: {
          scrollTop: scrollContainerRef.current?.scrollTop ?? 0,
          ...(titleSelection ? { titleSelection } : {}),
          ...(editorSelection ? { editorSelection } : {}),
        },
      }
    },
    scrollToChunk: (charOffset: number, chunkLength: number) => {
      editorRef.current?.scrollToChunk(charOffset, chunkLength)
    },
  }), [debouncedDraftNotify, debouncedViewNotify, flushPendingSave, getFormData])

  React.useEffect(() => {
    const session = initialSessionRef.current
    if (!session) return

    const frame = window.requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = session.view.scrollTop
      }
      if (titleInputRef.current && session.view.titleSelection) {
        titleInputRef.current.setSelectionRange(session.view.titleSelection.start, session.view.titleSelection.end)
      }
      if (session.view.editorSelection) {
        editorRef.current?.setSelection?.(session.view.editorSelection)
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [editorSessionKey])

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

  // min-w-0: without it this flex item cannot shrink below the intrinsic
  // width of the formatting toolbar, so the whole editor column — and the
  // header absolutely positioned across it — grows wider than a phone screen
  // and pushes the trailing action off the edge.
  return (
    <div ref={editorRootRef} className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-card">
      {/* Editor Header */}
      {/* gap-2 + a shrinkable mode label + a non-shrinking action group: the
          actions keep their full width and the label gives way, so the row
          can never push a control past the right edge. */}
      <div
        ref={headerRef}
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between gap-2 border-b border-border/40 bg-card/75 p-3 backdrop-blur-md md:p-4"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {onBack && (
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full shadow-sm md:hidden"
              onClick={onBack}
              data-cy="note-back-button"
              aria-label="Back"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {/* The tab bar directly above already names the note, and the eye +
              save actions say which mode this is, so the label is visual
              noise on a phone. It stays for screen readers. */}
          <h2 className="sr-only truncate text-xs font-bold uppercase tracking-wider text-muted-foreground md:not-sr-only">Editing</h2>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex gap-1.5 items-center">
            {/* Labels collapse to icons below md: the editing header carries
                four controls and the row overflowed its own width on a phone,
                clipping the "more actions" button off the screen edge. */}
            <Button
              onClick={handleRead}
              variant="outline"
              size="sm"
              data-cy="note-read-button"
              aria-label="Read"
              disabled={isSaving}
              className="rounded-full shadow-sm"
            >
              <Eye className="w-3.5 h-3.5 md:mr-1.5" />
              <span className="hidden md:inline">Read</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isSaving || isBodyEmpty}
              data-cy="note-copy-button"
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
            <Button
              onClick={handleSave}
              size="sm"
              data-cy="note-save-button"
              aria-label="Save"
              disabled={isSaving}
              className="rounded-full shadow-sm"
            >
              <SaveIcon className="w-3.5 h-3.5 md:hidden" />
              <span className="hidden md:inline">Save</span>
            </Button>
            {/* More actions menu -- RAG controls, delete note, WordPress export */}
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
            <div className="text-[10px] text-muted-foreground font-medium">Saving...</div>
          ) : lastSavedAt ? (
            <div className="text-[10px] text-muted-foreground font-medium">
              Saved at {new Date(lastSavedAt).toLocaleTimeString()}
            </div>
          ) : null}
        </div>
      </div>

      {/* Editor Form */}
      <div
        ref={scrollContainerRef}
        // scrollbar-none: kept in sync with NoteView so the reading and
        // editing surfaces scroll identically — see the note there.
        className="scrollbar-none flex-1 overflow-y-auto bg-card"
        onScroll={(event) => debouncedViewNotify.schedule({ scrollTop: event.currentTarget.scrollTop })}
      >
        <div className="max-w-4xl mx-auto px-6 pt-24 space-y-5">
          <div>
            <Input
              key={`title-${editorSessionKey}`}
              ref={titleInputRef}
              type="text"
              placeholder="Note title"
              defaultValue={initialTitle}
              onChange={() => {
                handleContentChange()
                notifyDraftChange()
              }}
              className="w-full h-auto border-0 bg-transparent px-0 py-1 text-4xl font-extrabold tracking-tight placeholder:text-muted-foreground/30 focus-visible:ring-0 shadow-none"
            />
          </div>
          <TagInput
            tags={selectedTags}
            onAddTags={addTags}
            onRemoveTag={removeTag}
            suggestions={suggestions}
            tagCounts={tagCounts}
            onQueryChange={handleTagQueryChange}
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

