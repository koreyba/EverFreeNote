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
  /** Reports an account session change; pending local work must then finish on unmount. */
  shouldFlushOnUnmount?: () => boolean
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
  /** Reads the live draft without canceling pending save or notification timers. */
  hasUnconfirmedChanges: () => boolean
  /** Capture a revision before a manual write, then acknowledge its exact payload after success. */
  getSaveRevision: (snapshot: NoteEditorSnapshot) => number
  finishManualCreate: (revision: number, assignedNoteId: string | null) => void
  acknowledgeManualSave: (snapshot: NoteEditorSnapshot, revision: number) => void
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
  shouldFlushOnUnmount,
}: UseNoteEditorAutoSaveParams): UseNoteEditorAutoSaveResult {
  const onAutoSaveRef = useRef(onAutoSave)
  useEffect(() => {
    onAutoSaveRef.current = onAutoSave
  }, [onAutoSave])
  const shouldFlushOnUnmountRef = useRef(shouldFlushOnUnmount)
  useEffect(() => { shouldFlushOnUnmountRef.current = shouldFlushOnUnmount }, [shouldFlushOnUnmount])

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
  const [createInFlight, setCreateInFlight] = useState(false)
  const [manualCreate, setManualCreate] = useState<{ revision: number; pending: boolean; assignedNoteId: string | null; snapshot: NoteEditorSnapshot } | null>(null)
  const assignedCreateNoteIdRef = useRef<string | null>(null)
  const lastAcceptedRef = useRef<NoteEditorSnapshot>(getIncomingSnapshot())
  const lastIncomingRef = useRef<NoteEditorSnapshot | null>(null)
  const saveSequenceRef = useRef(0)
  const lastSuccessfulSaveRef = useRef(0)
  const autoSaveInFlightRef = useRef<number | null>(null)

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
    const sequence = ++saveSequenceRef.current
    autoSaveInFlightRef.current = sequence
    // A pending edit can have been captured before a new note received its ID.
    // The first completed create establishes the identity for subsequent writes.
    const resolvedPayload = payload.noteId || !assignedCreateNoteIdRef.current
      ? payload
      : { ...payload, noteId: assignedCreateNoteIdRef.current }
    const creating = !resolvedPayload.noteId
    if (creating) setCreateInFlight(true)
    try {
      const result = await onAutoSaveRef.current(resolvedPayload)
      lastSuccessfulSaveRef.current = Math.max(lastSuccessfulSaveRef.current, sequence)
      // The account may have changed while this save was in flight. Its
      // feedback must not create or clear a notification in the new session.
      if (!shouldFlushOnUnmountRef.current?.()) toast.dismiss('note-autosave-failed')
      if (creating) {
        assignedCreateNoteIdRef.current = result?.noteId ?? null
        setPendingCreateAssignedNoteId(assignedCreateNoteIdRef.current)
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError') && !shouldFlushOnUnmountRef.current?.()) {
        toast.error('Auto-save failed. Your changes will retry.', { id: 'note-autosave-failed' })
      }
      throw error
    } finally {
      if (autoSaveInFlightRef.current === sequence) autoSaveInFlightRef.current = null
      if (creating) setCreateInFlight(false)
    }
  }, [])

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
    const finishOrCancel = () => {
      if (shouldFlushOnUnmountRef.current?.()) {
        void debouncedAutoSave.flush().catch(() => undefined)
      } else {
        debouncedAutoSave.cancel()
      }
    }
    const previousDebouncedAutoSave = previousDebouncedAutoSaveRef.current
    if (!previousDebouncedAutoSave || previousDebouncedAutoSave === debouncedAutoSave) {
      previousDebouncedAutoSaveRef.current = debouncedAutoSave
      return () => {
        finishOrCancel()
      }
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

    return () => {
      finishOrCancel()
    }
  }, [debouncedAutoSave])

  // Detect note switches vs autosave ID assignments.
  useEffect(() => {
    const prevNoteId = lastResetNoteIdRef.current
    const nextNoteId = noteId
    const incomingSnapshot = getIncomingSnapshot()
    const assignedNoteId = pendingCreateAssignedNoteId ?? manualCreate?.assignedNoteId
    const sessionChange = resolveNoteAutosaveSessionChange({
      previousNoteId: prevNoteId,
      nextNoteId,
      pendingCreateAssignedNoteId: assignedNoteId,
    })

    // The parent may publish the new note before the create promise returns
    // its ID. Wait for that result before deciding whether this is a switch.
    if (sessionChange === 'switched' && !prevNoteId && nextNoteId && (createInFlight || manualCreate?.pending) && !assignedNoteId) return

    if (sessionChange === 'unchanged') {
      // NotesShell freezes the session props. Re-rendering must not reinterpret
      // that same old snapshot as a new external update after a manual save.
      if (lastIncomingRef.current && areSnapshotsEqual(lastIncomingRef.current, incomingSnapshot)) return
      lastIncomingRef.current = incomingSnapshot
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
    const manualAssignment = sessionChange === 'assigned-id' && manualCreate?.assignedNoteId === nextNoteId ? manualCreate : null
    const baseline = manualAssignment?.snapshot ?? incomingSnapshot
    lastAcceptedRef.current = baseline
    lastIncomingRef.current = incomingSnapshot

    if (sessionChange === 'assigned-id') {
      debouncedAutoSave.rebase(
        { noteId: nextNoteId, ...baseline },
        debouncedAutoSave.getPending()
          ? { noteId: nextNoteId, ...getDraftSnapshot() }
          : null
      )
      setPendingCreateAssignedNoteId(null)
      if (manualAssignment) setManualCreate(null)
      return
    }

    // Real note switch: reset session key (remounts editor + title input) and notify caller.
    assignedCreateNoteIdRef.current = null
    if (manualCreate) setManualCreate(null)
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
    createInFlight,
    manualCreate,
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

  const hasUnconfirmedChanges = useCallback(() => {
    const baseline = debouncedAutoSave.getBaseline() ?? lastAcceptedRef.current
    return debouncedAutoSave.getPending() !== null || !areSnapshotsEqual(getDraftSnapshot(), baseline)
  }, [debouncedAutoSave, getDraftSnapshot])

  const getSaveRevision = useCallback((snapshot: NoteEditorSnapshot) => {
    const revision = ++saveSequenceRef.current
    if (!noteIdRef.current) setManualCreate({ revision, pending: true, assignedNoteId: null, snapshot })
    return revision
  }, [])

  const finishManualCreate = useCallback((revision: number, assignedNoteId: string | null) => {
    setManualCreate((current) => current?.revision === revision
      ? (assignedNoteId ? { ...current, pending: false, assignedNoteId } : null)
      : current)
  }, [])

  const acknowledgeManualSave = useCallback((snapshot: NoteEditorSnapshot, revision: number) => {
    // A newer autosave already succeeded; an older manual completion cannot
    // replace it. Keep any newer draft and its pending autosave intact.
    if (revision < lastSuccessfulSaveRef.current) return
    lastSuccessfulSaveRef.current = revision
    lastAcceptedRef.current = snapshot
    // Let a newer in-flight autosave advance its baseline on completion. An
    // older one must not overwrite this newer manual acknowledgement instead.
    const autoSaveSequence = autoSaveInFlightRef.current
    if (autoSaveSequence === null || autoSaveSequence < revision) {
      debouncedAutoSave.rebase({ noteId: noteIdRef.current, ...snapshot }, debouncedAutoSave.getPending())
    }
  }, [debouncedAutoSave])

  return {
    editorSessionKey,
    handleContentChange,
    scheduleAutoSave,
    cancelAutoSave,
    flushPendingSave,
    hasUnconfirmedChanges,
    getSaveRevision,
    finishManualCreate,
    acknowledgeManualSave,
  }
}
