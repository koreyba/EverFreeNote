import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createDebouncedLatest } from '@core/utils/debouncedLatest'
import {
  reconcileExternalNoteSnapshot,
  type NoteAutosaveFieldDecision,
  resolveNoteAutosaveSessionChange,
} from '@core/utils/noteAutosaveSession'
import { buildTagString, parseTagString } from '@ui/web/lib/tags'

export type NoteAutoSavePayload = {
  noteId?: string
  title: string
  description: string
  tags: string
}

type NoteEditorSnapshot = Omit<NoteAutoSavePayload, 'noteId'>
const SNAPSHOT_FIELDS = ['title', 'description', 'tags'] as const

const areSnapshotsEqual = (left: NoteEditorSnapshot, right: NoteEditorSnapshot) => (
  left.title === right.title &&
  left.description === right.description &&
  left.tags === right.tags
)

type UseNoteEditorAutoSaveParams = {
  noteId?: string
  initialTitle: string
  initialDescription: string
  initialTags: string
  autosaveDelayMs: number
  onAutoSave?: (data: NoteAutoSavePayload) => Promise<void> | void
  /** Reads current title/description/tags from DOM refs in NoteEditor */
  getFormData: () => { title: string; description: string; tags: string }
  /** Applies accepted same-note refreshes to the platform-specific editor bindings. */
  applyExternalSnapshot?: (
    snapshot: NoteEditorSnapshot,
    fieldDecisions: Record<(typeof SNAPSHOT_FIELDS)[number], NoteAutosaveFieldDecision>
  ) => void
  /** Called by hook when user performs a real note switch (not autosave ID assignment) */
  onNoteSwitch?: () => void
  /** Cancels the debounced tag query (owned by NoteEditor) on note switch */
  cancelDebouncedTagQuery: () => void
}

export type UseNoteEditorAutoSaveResult = {
  /** Increments on real note switch; use as `key` prop to remount editor/title input */
  editorSessionKey: number
  /** Pass to title input onChange and editor onContentChange */
  handleContentChange: () => void
  /** Schedule an autosave, optionally overriding fields (e.g. after tag changes) */
  scheduleAutoSave: (overrides?: Partial<NoteAutoSavePayload>) => void
  /** Cancel pending autosave; call before manual Save or Read */
  cancelAutoSave: () => void
  /** Flush pending autosave immediately; for useImperativeHandle */
  flushPendingSave: () => Promise<void>
}

/**
 * Owns the autosave lifecycle and note-switch detection for NoteEditor.
 *
 * Key responsibility: distinguish between "autosave just created a note and
 * assigned a server ID" and "user navigated to a different note".
 */
export function useNoteEditorAutoSave({
  noteId,
  initialTitle,
  initialDescription,
  initialTags,
  autosaveDelayMs,
  onAutoSave,
  getFormData,
  applyExternalSnapshot,
  onNoteSwitch,
  cancelDebouncedTagQuery,
}: UseNoteEditorAutoSaveParams): UseNoteEditorAutoSaveResult {
  const [editorSessionKey, setEditorSessionKey] = useState(0)
  const getIncomingSnapshot = useCallback((): NoteEditorSnapshot => ({
    title: initialTitle,
    description: initialDescription,
    tags: buildTagString(parseTagString(initialTags)),
  }), [initialTitle, initialDescription, initialTags])

  const noteIdRef = useRef(noteId)
  useEffect(() => {
    noteIdRef.current = noteId
  }, [noteId])

  // Tracks the last noteId that caused a session reset (not autosave assignment)
  const lastResetNoteIdRef = useRef<string | undefined>(noteId)

  // Tracks whether an autosave-create (noteId=undefined) is in-flight.
  // Set to true before scheduling a create; cleared when ID is assigned or note switches.
  const pendingCreateRef = useRef(false)
  const lastAcceptedRef = useRef<NoteEditorSnapshot>(getIncomingSnapshot())

  const getDraftSnapshot = useCallback((overrides: Partial<NoteEditorSnapshot> = {}): NoteEditorSnapshot => ({
    ...getFormData(),
    ...overrides,
  }), [getFormData])

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
    const incomingSnapshot = getIncomingSnapshot()
    const sessionChange = resolveNoteAutosaveSessionChange({
      previousNoteId: prevNoteId,
      nextNoteId,
      hasPendingCreateAssignment: pendingCreateRef.current,
    })

    if (sessionChange === 'unchanged') {
      const reconcileResult = reconcileExternalNoteSnapshot({
        currentNoteId: prevNoteId,
        incomingNoteId: nextNoteId,
        currentDraft: getDraftSnapshot(),
        currentBaseline: lastAcceptedRef.current,
        incomingSnapshot,
        fields: SNAPSHOT_FIELDS,
      })

      lastAcceptedRef.current = reconcileResult.baseline
      applyExternalSnapshot?.(reconcileResult.draft, reconcileResult.fieldDecisions)

      const currentPending = debouncedAutoSave.getPending()
      debouncedAutoSave.rebase(
        { noteId: nextNoteId, ...reconcileResult.baseline },
        currentPending ? { noteId: noteIdRef.current, ...reconcileResult.draft } : null
      )
      return
    }

    lastResetNoteIdRef.current = nextNoteId
    lastAcceptedRef.current = incomingSnapshot

    if (sessionChange === 'assigned-id') {
      pendingCreateRef.current = false
      debouncedAutoSave.rebase(
        { noteId: nextNoteId, ...incomingSnapshot },
        debouncedAutoSave.getPending()
          ? { noteId: nextNoteId, ...getDraftSnapshot() }
          : null
      )
      return
    }

    // Real note switch: reset session key (remounts editor + title input) and notify caller.
    pendingCreateRef.current = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: signals a note switch, not a cascading render
    setEditorSessionKey((k) => k + 1)
    cancelDebouncedTagQuery()
    onNoteSwitch?.()
    debouncedAutoSave.reset({
      noteId: nextNoteId,
      ...incomingSnapshot,
    })
  }, [
    noteId,
    debouncedAutoSave,
    cancelDebouncedTagQuery,
    onNoteSwitch,
    getDraftSnapshot,
    getIncomingSnapshot,
    applyExternalSnapshot,
  ])

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
    const currentDraft = getDraftSnapshot()
    const debouncerBaseline = debouncedAutoSave.getBaseline()
    if (
      debouncedAutoSave.getPending() === null &&
      !areSnapshotsEqual(currentDraft, lastAcceptedRef.current) &&
      (!debouncerBaseline || currentDraft.title !== debouncerBaseline.title || currentDraft.description !== debouncerBaseline.description || currentDraft.tags !== debouncerBaseline.tags)
    ) {
      debouncedAutoSave.schedule({
        noteId: noteIdRef.current,
        ...currentDraft,
      })
    }
    await debouncedAutoSave.flush()
  }, [debouncedAutoSave, onAutoSave, getDraftSnapshot])

  return {
    editorSessionKey,
    handleContentChange,
    scheduleAutoSave,
    cancelAutoSave,
    flushPendingSave,
  }
}
