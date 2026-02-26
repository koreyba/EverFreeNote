import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createDebouncedLatest } from '@core/utils/debouncedLatest'
import { buildTagString, parseTagString } from '@ui/web/lib/tags'

export type NoteAutoSavePayload = {
  noteId?: string
  title: string
  description: string
  tags: string
}

type UseNoteEditorAutoSaveParams = {
  noteId?: string
  initialTitle: string
  initialDescription: string
  initialTags: string
  autosaveDelayMs: number
  onAutoSave?: (data: NoteAutoSavePayload) => Promise<void> | void
  /** Reads current title/description/tags from DOM refs in NoteEditor */
  getFormData: () => { title: string; description: string; tags: string }
  /** Called by hook when user performs a real note switch (not autosave ID assignment) */
  onNoteSwitch?: () => void
  /** Cancels the debounced tag query (owned by NoteEditor) on note switch */
  cancelDebouncedTagQuery: () => void
}

export type UseNoteEditorAutoSaveResult = {
  /** Increments on real note switch — use as `key` prop to remount editor/title input */
  editorSessionKey: number
  /** Pass to title input onChange and editor onContentChange */
  handleContentChange: () => void
  /** Schedule an autosave, optionally overriding fields (e.g. after tag changes) */
  scheduleAutoSave: (overrides?: Partial<NoteAutoSavePayload>) => void
  /** Cancel pending autosave — call before manual Save or Read */
  cancelAutoSave: () => void
  /** Flush pending autosave immediately — for useImperativeHandle */
  flushPendingSave: () => Promise<void>
}

/**
 * Owns the autosave lifecycle and note-switch detection for NoteEditor.
 *
 * Key responsibility: distinguish between "autosave just created a note and
 * assigned a server ID" (undefined → id, pendingCreateRef=true) and "user
 * navigated to a different note" (both cause noteId to change but require
 * opposite responses: no remount vs remount).
 */
export function useNoteEditorAutoSave({
  noteId,
  initialTitle,
  initialDescription,
  initialTags,
  autosaveDelayMs,
  onAutoSave,
  getFormData,
  onNoteSwitch,
  cancelDebouncedTagQuery,
}: UseNoteEditorAutoSaveParams): UseNoteEditorAutoSaveResult {
  const [editorSessionKey, setEditorSessionKey] = useState(0)

  const noteIdRef = useRef(noteId)
  useEffect(() => {
    noteIdRef.current = noteId
  }, [noteId])

  // Tracks the last noteId that caused a session reset (not autosave assignment)
  const lastResetNoteIdRef = useRef<string | undefined>(noteId)

  // Tracks whether an autosave-create (noteId=undefined) is in-flight.
  // Set to true before scheduling a create; cleared when ID is assigned or note switches.
  const pendingCreateRef = useRef(false)

  const getAutoSavePayload = useCallback((overrides: Partial<NoteAutoSavePayload> = {}): NoteAutoSavePayload => ({
    noteId: noteIdRef.current,
    ...getFormData(),
    ...overrides,
  }), [getFormData])

  const debouncedAutoSave = useMemo(() => createDebouncedLatest<NoteAutoSavePayload>({
    delayMs: autosaveDelayMs,
    isEqual: (a, b) =>
      a.noteId === b.noteId &&
      a.title === b.title &&
      a.description === b.description &&
      a.tags === b.tags,
    onFlush: async (payload) => {
      if (!onAutoSave) return
      try {
        await onAutoSave(payload)
      } catch {
        // Errors handled upstream
      }
    },
  }), [autosaveDelayMs, onAutoSave])

  // Detect note switches vs autosave ID assignments.
  useEffect(() => {
    const prevNoteId = lastResetNoteIdRef.current
    const nextNoteId = noteId

    if (prevNoteId === nextNoteId) return
    lastResetNoteIdRef.current = nextNoteId

    // undefined → id during autosave: same editing session, just update the debounced payload.
    if (!prevNoteId && nextNoteId && pendingCreateRef.current) {
      pendingCreateRef.current = false
      debouncedAutoSave.reset(getAutoSavePayload({ noteId: nextNoteId }))
      return
    }

    // Real note switch: reset session key (remounts editor + title input) and notify caller.
    pendingCreateRef.current = false
    setEditorSessionKey((k) => k + 1)
    cancelDebouncedTagQuery()
    onNoteSwitch?.()
    const parsedTags = parseTagString(initialTags)
    debouncedAutoSave.reset({
      noteId,
      title: initialTitle,
      description: initialDescription,
      tags: buildTagString(parsedTags),
    })
  }, [noteId, initialTitle, initialDescription, initialTags, debouncedAutoSave, cancelDebouncedTagQuery, onNoteSwitch, getAutoSavePayload])

  const handleContentChange = useCallback(() => {
    if (!onAutoSave) return
    if (!noteIdRef.current) pendingCreateRef.current = true
    debouncedAutoSave.schedule(getAutoSavePayload())
  }, [debouncedAutoSave, getAutoSavePayload, onAutoSave])

  const scheduleAutoSave = useCallback((overrides: Partial<NoteAutoSavePayload> = {}) => {
    if (!onAutoSave) return
    if (!noteIdRef.current) pendingCreateRef.current = true
    debouncedAutoSave.schedule(getAutoSavePayload(overrides))
  }, [debouncedAutoSave, getAutoSavePayload, onAutoSave])

  const cancelAutoSave = useCallback(() => {
    debouncedAutoSave.cancel()
  }, [debouncedAutoSave])

  const flushPendingSave = useCallback(async () => {
    if (!onAutoSave) return
    await debouncedAutoSave.flush()
  }, [debouncedAutoSave, onAutoSave])

  return {
    editorSessionKey,
    handleContentChange,
    scheduleAutoSave,
    cancelAutoSave,
    flushPendingSave,
  }
}
