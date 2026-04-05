export type NoteAutosaveSessionChange = 'unchanged' | 'assigned-id' | 'switched'

type ResolveNoteAutosaveSessionChangeParams = {
  previousNoteId?: string | null
  nextNoteId?: string | null
  pendingCreateAssignedNoteId?: string | null
}

export function resolveNoteAutosaveSessionChange({
  previousNoteId,
  nextNoteId,
  pendingCreateAssignedNoteId,
}: ResolveNoteAutosaveSessionChangeParams): NoteAutosaveSessionChange {
  if (previousNoteId === nextNoteId) return 'unchanged'
  if (!previousNoteId && !!nextNoteId && pendingCreateAssignedNoteId === nextNoteId) return 'assigned-id'
  return 'switched'
}

export type NoteAutosaveFieldDecision = 'accept-external' | 'acknowledge-local' | 'preserve-local'

type FieldComparator<TValue> = (left: TValue, right: TValue) => boolean
type FieldComparatorMap<TSnapshot extends Record<string, unknown>> = {
  [K in keyof TSnapshot]?: FieldComparator<TSnapshot[K]>
}

type ReconcileExternalNoteSnapshotParams<TSnapshot extends Record<string, unknown>, TField extends keyof TSnapshot> = {
  currentNoteId?: string | null
  incomingNoteId?: string | null
  currentDraft: TSnapshot
  currentBaseline: TSnapshot
  incomingSnapshot: TSnapshot
  fields: readonly TField[]
  comparators?: Pick<FieldComparatorMap<TSnapshot>, TField>
}

export type ReconcileExternalNoteSnapshotResult<
  TSnapshot extends Record<string, unknown>,
  TField extends keyof TSnapshot,
> = {
  mode: 'replace-draft' | 'merge-same-note'
  draft: TSnapshot
  baseline: TSnapshot
  dirtyFields: TField[]
  fieldDecisions: Record<TField, NoteAutosaveFieldDecision>
}

export function reconcileExternalNoteSnapshot<
  TSnapshot extends Record<string, unknown>,
  TField extends keyof TSnapshot,
>({
  currentNoteId,
  incomingNoteId,
  currentDraft,
  currentBaseline,
  incomingSnapshot,
  fields,
  comparators = {} as Pick<FieldComparatorMap<TSnapshot>, TField>,
}: ReconcileExternalNoteSnapshotParams<TSnapshot, TField>): ReconcileExternalNoteSnapshotResult<TSnapshot, TField> {
  const fieldDecisions = {} as Record<TField, NoteAutosaveFieldDecision>

  if (currentNoteId !== incomingNoteId) {
    for (const field of fields) {
      fieldDecisions[field] = 'accept-external'
    }
    return {
      mode: 'replace-draft',
      draft: incomingSnapshot,
      baseline: incomingSnapshot,
      dirtyFields: [],
      fieldDecisions,
    }
  }

  const nextDraft = { ...currentDraft }
  const nextBaseline = { ...currentBaseline }
  const dirtyFields: TField[] = []

  for (const field of fields) {
    const isEqual = (comparators[field] ??
      ((left: TSnapshot[TField], right: TSnapshot[TField]) => Object.is(left, right))) as FieldComparator<TSnapshot[TField]>

    const draftValue = currentDraft[field]
    const baselineValue = currentBaseline[field]
    const incomingValue = incomingSnapshot[field]
    const isDirty = !isEqual(draftValue, baselineValue)

    if (!isDirty) {
      nextDraft[field] = incomingValue
      fieldDecisions[field] = 'accept-external'
    } else if (isEqual(draftValue, incomingValue)) {
      fieldDecisions[field] = 'acknowledge-local'
    } else {
      fieldDecisions[field] = 'preserve-local'
    }

    nextBaseline[field] = incomingValue
    if (!isEqual(nextDraft[field], nextBaseline[field])) {
      dirtyFields.push(field)
    }
  }

  return {
    mode: 'merge-same-note',
    draft: nextDraft,
    baseline: nextBaseline,
    dirtyFields,
    fieldDecisions,
  }
}
