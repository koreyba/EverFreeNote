const SETTINGS_RETURN_STATE_KEY = 'everfreenote:settings-return-state'
const FALLBACK_RETURN_PATH = '/'

// Temporary contract for returning from /settings back to the notes workspace.
// Keep this intentionally narrow: selected note id + search/sidebar context only.
// If the app needs richer back/forward restoration later, prefer moving the
// workspace view state into route/history instead of growing this snapshot.
export type NotesUiStateSnapshot = {
  selectedNoteId: string | null
  isEditing: boolean
  isSearchPanelOpen: boolean
  searchQuery: string
  filterByTag: string | null
}

export type SettingsReturnState = {
  returnPath: string
  notesUiState: NotesUiStateSnapshot
}

function getSessionStorage(): Storage | null {
  if (typeof globalThis.window === 'undefined') return null

  try {
    return globalThis.window.sessionStorage
  } catch {
    return null
  }
}

function clearStoredReturnState(storage: Storage | null = getSessionStorage()): void {
  if (!storage) return

  try {
    storage.removeItem(SETTINGS_RETURN_STATE_KEY)
  } catch {
    // Ignore storage-access failures. Settings return state is a best-effort bridge.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNotesUiStateSnapshot(value: unknown): value is NotesUiStateSnapshot {
  if (!isRecord(value)) return false

  return (
    (typeof value.selectedNoteId === 'string' || value.selectedNoteId === null) &&
    typeof value.isEditing === 'boolean' &&
    typeof value.isSearchPanelOpen === 'boolean' &&
    typeof value.searchQuery === 'string' &&
    (typeof value.filterByTag === 'string' || value.filterByTag === null)
  )
}

function isSettingsReturnState(value: unknown): value is SettingsReturnState {
  if (!isRecord(value)) return false

  return typeof value.returnPath === 'string' && isNotesUiStateSnapshot(value.notesUiState)
}

export function sanitizeSettingsReturnPath(path: string | null | undefined): string | null {
  if (typeof path !== 'string') return null

  const trimmedPath = path.trim()
  if (!trimmedPath || !trimmedPath.startsWith('/') || trimmedPath.startsWith('//')) {
    return null
  }

  try {
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://everfreenote.local'
    const parsedPath = new URL(trimmedPath, baseOrigin)

    if (parsedPath.origin !== baseOrigin) {
      return null
    }

    return `${parsedPath.pathname}${parsedPath.search}${parsedPath.hash}`
  } catch {
    return null
  }
}

export function saveSettingsReturnState(state: SettingsReturnState): boolean {
  const storage = getSessionStorage()
  if (!storage) return false
  if (!isNotesUiStateSnapshot(state.notesUiState)) return false

  const safeState: SettingsReturnState = {
    returnPath: sanitizeSettingsReturnPath(state.returnPath) ?? FALLBACK_RETURN_PATH,
    notesUiState: state.notesUiState,
  }

  try {
    storage.setItem(SETTINGS_RETURN_STATE_KEY, JSON.stringify(safeState))
    return true
  } catch {
    clearStoredReturnState(storage)
    return false
  }
}

export function readSettingsReturnState(): SettingsReturnState | null {
  const storage = getSessionStorage()
  if (!storage) return null

  let rawValue: string | null = null
  try {
    rawValue = storage.getItem(SETTINGS_RETURN_STATE_KEY)
  } catch {
    return null
  }
  if (!rawValue) return null

  try {
    const parsedValue: unknown = JSON.parse(rawValue)
    if (!isSettingsReturnState(parsedValue)) {
      clearStoredReturnState(storage)
      return null
    }

    const safeReturnPath = sanitizeSettingsReturnPath(parsedValue.returnPath)
    if (!safeReturnPath) {
      clearStoredReturnState(storage)
      return null
    }

    return {
      returnPath: safeReturnPath,
      notesUiState: parsedValue.notesUiState,
    }
  } catch {
    clearStoredReturnState(storage)
    return null
  }
}

export function consumeSettingsReturnState(): SettingsReturnState | null {
  const state = readSettingsReturnState()
  clearStoredReturnState()
  return state
}

export function clearSettingsReturnState(): void {
  clearStoredReturnState()
}
