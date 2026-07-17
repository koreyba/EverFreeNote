import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
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

type NoteAutoSaveResult = {
  noteId?: string
} | void

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
  onAutoSave?: (data: NoteAutoSavePayload) => Promise<NoteAutoSaveResult> | NoteAutoSaveResult
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
  const onAutoSaveRef = useRef(onAutoSave)
  useEffect(() => {
    onAutoSaveRef.current = onAutoSave
  }, [onAutoSave])

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

  // Stores the server-assigned note ID returned by a create autosave until the
  // parent updates `noteId`, so the next refresh can be reconciled as an
  // assigned-id bridge for this editing session instead of a real note switch.
  const [pendingCreateAssignedNoteId, setPendingCreateAssignedNoteId] = useState<string | null>(null)
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

  const flushAutoSave = useCallback(async (payload: NoteAutoSavePayload) => {
    if (!onAutoSaveRef.current) return
    try {
      const result = await onAutoSaveRef.current(payload)
      toast.dismiss('note-autosave-failed')
      if (!payload.noteId) {
        setPendingCreateAssignedNoteId(result?.noteId ?? null)
      }
    } catch (error) {
      toast.error('Auto-save failed. Your changes will retry.', { id: 'note-autosave-failed' })
      throw error
    }
  }, [])

  // eslint-disable-next-line react-hooks/refs -- the debouncer stores the callback for later flushes; the ref is read only when onFlush runs outside render
  const debouncedAutoSave = useMemo(() => createDebouncedLatest<NoteAutoSavePayload>({
    delayMs: autosaveDelayMs,
    isEqual: (a, b) =>
      a.noteId === b.noteId &&
      a.title === b.title &&
      a.description === b.description &&
      a.tags === b.tags,
    onFlush: flushAutoSave,
  }), [autosaveDelayMs, flushAutoSave])

  const previousDebouncedAutoSaveRef = useRef<typeof debouncedAutoSave | null>(null)
  useEffect(() => {
    const previousDebouncedAutoSave = previousDebouncedAutoSaveRef.current
    if (!previousDebouncedAutoSave || previousDebouncedAutoSave === debouncedAutoSave) {
      previousDebouncedAutoSaveRef.current = debouncedAutoSave
      return
    }

    const previousPending = previousDebouncedAutoSave.getPending()
    const previousBaseline = previousDebouncedAutoSave.getBaseline()

    previousDebouncedAutoSave.cancel()
    if (previousBaseline) {
      debouncedAutoSave.rebase(previousBaseline, previousPending)
    } else if (previousPending) {
      debouncedAutoSave.schedule(previousPending)
    }

    previousDebouncedAutoSaveRef.current = debouncedAutoSave
  }, [debouncedAutoSave])

  // Detect note switches vs autosave ID assignments.
  useEffect(() => {
    const prevNoteId = lastResetNoteIdRef.current
    const nextNoteId = noteId
    const incomingSnapshot = getIncomingSnapshot()
    const sessionChange = resolveNoteAutosaveSessionChange({
      previousNoteId: prevNoteId,
      nextNoteId,
      pendingCreateAssignedNoteId,
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
      debouncedAutoSave.rebase(
        { noteId: nextNoteId, ...incomingSnapshot },
        debouncedAutoSave.getPending()
          ? { noteId: nextNoteId, ...getDraftSnapshot() }
          : null
      )
      setPendingCreateAssignedNoteId(null)
      return
    }

    // Real note switch: reset session key (remounts editor + title input) and notify caller.
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
    pendingCreateAssignedNoteId,
  ])

  const handleContentChange = useCallback(() => {
    if (!onAutoSave) return
    debouncedAutoSave.schedule(getAutoSavePayload())
  }, [debouncedAutoSave, getAutoSavePayload, onAutoSave])

  const scheduleAutoSave = useCallback((overrides: Partial<NoteAutoSavePayload> = {}) => {
    if (!onAutoSave) return
    debouncedAutoSave.schedule(getAutoSavePayload(overrides))
  }, [debouncedAutoSave, getAutoSavePayload, onAutoSave])

  const cancelAutoSave = useCallback(() => {
    setPendingCreateAssignedNoteId(null)
    debouncedAutoSave.cancel()
  }, [debouncedAutoSave])

  const flushPendingSave = useCallback(async () => {
    if (!onAutoSave) return
    const currentDraft = getDraftSnapshot()
    const debouncerBaseline = debouncedAutoSave.getBaseline()
    if (
      debouncedAutoSave.getPending() === null &&
      !areSnapshotsEqual(currentDraft, lastAcceptedRef.current) &&
      // Edge case: same-note reconcile can leave the editor dirty without an active timer,
      // so blur/unmount must re-enqueue the latest draft before flushing.
      (!debouncerBaseline || currentDraft.title !== debouncerBaseline.title || currentDraft.description !== debouncerBaseline.description || currentDraft.tags !== debouncerBaseline.tags)
    ) {
      debouncedAutoSave.schedule({
        noteId: noteIdRef.current,
        ...currentDraft,
      })
    }
    await debouncedAutoSave.flush()
  }, [debouncedAutoSave, getDraftSnapshot, onAutoSave])

  return {
    editorSessionKey,
    handleContentChange,
    scheduleAutoSave,
    cancelAutoSave,
    flushPendingSave,
  }
}
