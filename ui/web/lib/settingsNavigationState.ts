import type { NoteViewModel } from '@core/types/domain'

const SETTINGS_RETURN_STATE_KEY = 'everfreenote:settings-return-state'

export type NotesUiStateSnapshot = {
  selectedNote: NoteViewModel | null
  isEditing: boolean
  isSearchPanelOpen: boolean
  searchQuery: string
  filterByTag: string | null
}

export type SettingsReturnState = {
  returnPath: string
  notesUiState: NotesUiStateSnapshot
}

function isBrowserReady() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

export function saveSettingsReturnState(state: SettingsReturnState) {
  if (!isBrowserReady()) return
  window.sessionStorage.setItem(SETTINGS_RETURN_STATE_KEY, JSON.stringify(state))
}

export function readSettingsReturnState(): SettingsReturnState | null {
  if (!isBrowserReady()) return null

  const rawValue = window.sessionStorage.getItem(SETTINGS_RETURN_STATE_KEY)
  if (!rawValue) return null

  try {
    return JSON.parse(rawValue) as SettingsReturnState
  } catch {
    window.sessionStorage.removeItem(SETTINGS_RETURN_STATE_KEY)
    return null
  }
}

export function consumeSettingsReturnState(): SettingsReturnState | null {
  const state = readSettingsReturnState()
  if (!isBrowserReady()) return state

  window.sessionStorage.removeItem(SETTINGS_RETURN_STATE_KEY)
  return state
}
