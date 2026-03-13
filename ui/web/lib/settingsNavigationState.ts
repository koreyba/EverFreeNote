import type { NoteViewModel } from '@core/types/domain'

const SETTINGS_RETURN_STATE_KEY = 'everfreenote:settings-return-state'

// Temporary contract for returning from /settings back to the notes workspace.
// This is intentionally narrow: selected note + search context only.
// If the app later needs richer back/forward behavior, prefer moving the
// workspace state into route-driven history instead of growing this object.
export type RestorableSelectedNoteSnapshot = Pick<
  NoteViewModel,
  'id' | 'title' | 'description' | 'content' | 'tags' | 'created_at' | 'updated_at' | 'user_id' | 'headline' | 'rank'
>

export type NotesUiStateSnapshot = {
  selectedNote: RestorableSelectedNoteSnapshot | null
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

export function createSettingsSelectedNoteSnapshot(note: NoteViewModel): RestorableSelectedNoteSnapshot {
  return {
    id: note.id,
    title: note.title,
    description: note.description,
    content: note.content,
    tags: note.tags,
    created_at: note.created_at,
    updated_at: note.updated_at,
    user_id: note.user_id,
    headline: note.headline,
    rank: note.rank,
  }
}

export function saveSettingsReturnState(state: SettingsReturnState): boolean {
  if (!isBrowserReady()) return false

  try {
    window.sessionStorage.setItem(SETTINGS_RETURN_STATE_KEY, JSON.stringify(state))
    return true
  } catch {
    window.sessionStorage.removeItem(SETTINGS_RETURN_STATE_KEY)
    return false
  }
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
