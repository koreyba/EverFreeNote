import {
  hydrateNoteWorkspaceState,
  serializeNoteWorkspaceState,
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

export function readNoteWorkspaceState(
  storage: Storage | null = getSessionStorage(),
  idFactory?: NoteWorkspaceIdFactory,
): NoteWorkspaceState {
  if (!storage) return hydrateNoteWorkspaceState(null, idFactory)

  try {
    return hydrateNoteWorkspaceState(storage.getItem(NOTE_WORKSPACE_STORAGE_KEY), idFactory)
  } catch {
    return hydrateNoteWorkspaceState(null, idFactory)
  }
}

export function writeNoteWorkspaceState(
  state: NoteWorkspaceState,
  storage: Storage | null = getSessionStorage(),
): boolean {
  if (!storage) return false

  try {
    storage.setItem(NOTE_WORKSPACE_STORAGE_KEY, serializeNoteWorkspaceState(state))
    return true
  } catch {
    // Quota/private-mode failures must not block the in-memory workspace.
    return false
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
