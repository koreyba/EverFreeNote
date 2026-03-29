import type { AIIndexFilter } from '@core/types/aiIndex'
import { sanitizeSettingsReturnPath } from '@ui/web/lib/settingsNavigationState'

const AI_INDEX_VIEW_STATE_KEY = 'everfreenote:ai-index-view-state'
const AI_INDEX_PENDING_NOTE_KEY = 'everfreenote:ai-index-pending-note'
const ACTIVE_SETTINGS_NOTE_RETURN_PATH_KEY = 'everfreenote:active-settings-note-return-path'

export type AIIndexViewStateSnapshot = {
  filter: AIIndexFilter
  searchDraft: string
  searchQuery: string
  scrollOffset: number
}

export type AIIndexPendingNoteState = {
  noteId: string
  returnPath: string
}

function getSessionStorage(): Storage | null {
  if (typeof globalThis.window === 'undefined') return null

  try {
    return globalThis.window.sessionStorage
  } catch {
    return null
  }
}

function clearStorageKey(key: string, storage: Storage | null = getSessionStorage()): void {
  if (!storage) return

  try {
    storage.removeItem(key)
  } catch {
    // Ignore storage-access failures. This state is a best-effort navigation bridge.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAIIndexFilter(value: unknown): value is AIIndexFilter {
  return value === 'all' || value === 'indexed' || value === 'not_indexed' || value === 'outdated'
}

function isAIIndexViewStateSnapshot(value: unknown): value is AIIndexViewStateSnapshot {
  return (
    isRecord(value) &&
    isAIIndexFilter(value.filter) &&
    typeof value.searchDraft === 'string' &&
    typeof value.searchQuery === 'string' &&
    typeof value.scrollOffset === 'number' &&
    Number.isFinite(value.scrollOffset) &&
    value.scrollOffset >= 0
  )
}

function isAIIndexPendingNoteState(value: unknown): value is AIIndexPendingNoteState {
  return (
    isRecord(value) &&
    typeof value.noteId === 'string' &&
    value.noteId.trim().length > 0 &&
    typeof value.returnPath === 'string'
  )
}

function readJson<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  const storage = getSessionStorage()
  if (!storage) return null

  let rawValue: string | null = null
  try {
    rawValue = storage.getItem(key)
  } catch {
    return null
  }

  if (!rawValue) return null

  try {
    const parsedValue: unknown = JSON.parse(rawValue)
    if (!isValid(parsedValue)) {
      clearStorageKey(key, storage)
      return null
    }

    return parsedValue
  } catch {
    clearStorageKey(key, storage)
    return null
  }
}

function saveJson<T>(key: string, value: T): boolean {
  const storage = getSessionStorage()
  if (!storage) return false

  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    clearStorageKey(key, storage)
    return false
  }
}

export function saveAIIndexViewState(state: AIIndexViewStateSnapshot): boolean {
  if (!isAIIndexViewStateSnapshot(state)) return false

  return saveJson(AI_INDEX_VIEW_STATE_KEY, {
    ...state,
    scrollOffset: Math.max(0, state.scrollOffset),
  })
}

export function readAIIndexViewState(): AIIndexViewStateSnapshot | null {
  return readJson(AI_INDEX_VIEW_STATE_KEY, isAIIndexViewStateSnapshot)
}

export function consumeAIIndexViewState(): AIIndexViewStateSnapshot | null {
  const state = readAIIndexViewState()
  clearStorageKey(AI_INDEX_VIEW_STATE_KEY)
  return state
}

export function clearAIIndexViewState(): void {
  clearStorageKey(AI_INDEX_VIEW_STATE_KEY)
}

export function saveAIIndexPendingNoteState(state: AIIndexPendingNoteState): boolean {
  if (!isAIIndexPendingNoteState(state)) return false

  const safeReturnPath = sanitizeSettingsReturnPath(state.returnPath)
  if (!safeReturnPath) return false

  return saveJson(AI_INDEX_PENDING_NOTE_KEY, {
    noteId: state.noteId.trim(),
    returnPath: safeReturnPath,
  })
}

export function readAIIndexPendingNoteState(): AIIndexPendingNoteState | null {
  const state = readJson(AI_INDEX_PENDING_NOTE_KEY, isAIIndexPendingNoteState)
  if (!state) return null

  const safeReturnPath = sanitizeSettingsReturnPath(state.returnPath)
  if (!safeReturnPath) {
    clearStorageKey(AI_INDEX_PENDING_NOTE_KEY)
    return null
  }

  return {
    noteId: state.noteId,
    returnPath: safeReturnPath,
  }
}

export function consumeAIIndexPendingNoteState(): AIIndexPendingNoteState | null {
  const state = readAIIndexPendingNoteState()
  clearStorageKey(AI_INDEX_PENDING_NOTE_KEY)
  return state
}

export function clearAIIndexPendingNoteState(): void {
  clearStorageKey(AI_INDEX_PENDING_NOTE_KEY)
}

export function saveActiveSettingsNoteReturnPath(path: string): boolean {
  const storage = getSessionStorage()
  if (!storage) return false

  const safePath = sanitizeSettingsReturnPath(path)
  if (!safePath) return false

  try {
    storage.setItem(ACTIVE_SETTINGS_NOTE_RETURN_PATH_KEY, safePath)
    return true
  } catch {
    clearStorageKey(ACTIVE_SETTINGS_NOTE_RETURN_PATH_KEY, storage)
    return false
  }
}

export function readActiveSettingsNoteReturnPath(): string | null {
  const storage = getSessionStorage()
  if (!storage) return null

  let rawValue: string | null = null
  try {
    rawValue = storage.getItem(ACTIVE_SETTINGS_NOTE_RETURN_PATH_KEY)
  } catch {
    return null
  }

  return sanitizeSettingsReturnPath(rawValue)
}

export function consumeActiveSettingsNoteReturnPath(): string | null {
  const path = readActiveSettingsNoteReturnPath()
  clearStorageKey(ACTIVE_SETTINGS_NOTE_RETURN_PATH_KEY)
  return path
}

export function clearActiveSettingsNoteReturnPath(): void {
  clearStorageKey(ACTIVE_SETTINGS_NOTE_RETURN_PATH_KEY)
}
