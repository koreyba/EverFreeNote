import {
  hydrateNoteWorkspaceState,
  serializeNoteWorkspaceStateWithinLimit,
  type NoteWorkspaceIdFactory,
  type NoteWorkspaceState,
} from '@core/services/noteWorkspaceTabs'

export const NOTE_WORKSPACE_STORAGE_KEY = 'everfreenote:notes-workspace:v1'

function getSessionStorage(): Storage | null {
  if (globalThis.window === undefined) return null

  try {
    return globalThis.window.sessionStorage
  } catch {
    return null
  }
}

export type ReadNoteWorkspaceStateOptions = {
  /**
   * Scopes the restore. State stamped with a different account — or with no
   * stamp at all — is discarded rather than adopted, so signing in as someone
   * else in the same browser tab never surfaces the previous account's notes.
   */
  userId?: string | null
  storage?: Storage | null
  idFactory?: NoteWorkspaceIdFactory
}

export function readNoteWorkspaceState({
  userId = null,
  storage = getSessionStorage(),
  idFactory,
}: ReadNoteWorkspaceStateOptions = {}): NoteWorkspaceState {
  if (!storage) return hydrateNoteWorkspaceState(null, idFactory, userId)

  try {
    return hydrateNoteWorkspaceState(storage.getItem(NOTE_WORKSPACE_STORAGE_KEY), idFactory, userId)
  } catch {
    return hydrateNoteWorkspaceState(null, idFactory, userId)
  }
}

export type WriteNoteWorkspaceStateResult = {
  persisted: boolean
  /** Tabs left out to fit the budget; empty when everything was stored. */
  droppedTabIds: string[]
}

const NOT_PERSISTED: WriteNoteWorkspaceStateResult = { persisted: false, droppedTabIds: [] }

export function writeNoteWorkspaceState(
  state: NoteWorkspaceState,
  storage: Storage | null = getSessionStorage(),
): WriteNoteWorkspaceStateResult {
  if (!storage) return NOT_PERSISTED

  // Store as much as fits rather than losing the whole workspace to one
  // oversized snapshot.
  const serialization = serializeNoteWorkspaceStateWithinLimit(state)
  if (!serialization) return NOT_PERSISTED

  try {
    storage.setItem(NOTE_WORKSPACE_STORAGE_KEY, serialization.serialized)
    return { persisted: true, droppedTabIds: serialization.droppedTabIds }
  } catch {
    // Quota/private-mode failures must not block the in-memory workspace.
    return NOT_PERSISTED
  }
}

export function clearNoteWorkspaceState(storage: Storage | null = getSessionStorage()): void {
  if (!storage) return

  try {
    storage.removeItem(NOTE_WORKSPACE_STORAGE_KEY)
  } catch {
    // Best effort only.
  }
}
