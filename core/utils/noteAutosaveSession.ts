export type NoteAutosaveSessionChange = 'unchanged' | 'assigned-id' | 'switched'

type ResolveNoteAutosaveSessionChangeParams = {
  previousNoteId?: string | null
  nextNoteId?: string | null
  hasPendingCreateAssignment: boolean
}

export function resolveNoteAutosaveSessionChange({
  previousNoteId,
  nextNoteId,
  hasPendingCreateAssignment,
}: ResolveNoteAutosaveSessionChangeParams): NoteAutosaveSessionChange {
  if (previousNoteId === nextNoteId) return 'unchanged'
  if (!previousNoteId && !!nextNoteId && hasPendingCreateAssignment) return 'assigned-id'
  return 'switched'
}

export type ExternalDraftHydrationDecision = 'replace-draft' | 'acknowledge-external' | 'preserve-draft'

type ResolveExternalDraftHydrationParams<TSnapshot> = {
  currentNoteId?: string | null
  incomingNoteId?: string | null
  currentDraft: TSnapshot
  incomingSnapshot: TSnapshot
  isEqual: (left: TSnapshot, right: TSnapshot) => boolean
}

export function resolveExternalDraftHydration<TSnapshot>({
  currentNoteId,
  incomingNoteId,
  currentDraft,
  incomingSnapshot,
  isEqual,
}: ResolveExternalDraftHydrationParams<TSnapshot>): ExternalDraftHydrationDecision {
  if (currentNoteId !== incomingNoteId) return 'replace-draft'
  if (isEqual(currentDraft, incomingSnapshot)) return 'acknowledge-external'
  return 'preserve-draft'
}
