import type { NoteViewModel } from '@core/types/domain'

export const NOTE_WORKSPACE_VERSION = 1
export const MAX_NOTE_WORKSPACE_SERIALIZED_LENGTH = 2 * 1024 * 1024

export type NoteWorkspaceMode = 'reading' | 'editing'
export type NoteWorkspaceSaveState = 'saved' | 'dirty' | 'saving' | 'error'

export type NoteDraftSnapshot = {
  title: string
  description: string
  tags: string
}

export type NoteViewSession = {
  scrollTop: number
  titleSelection?: { start: number; end: number }
  editorSelection?: { from: number; to: number }
}

export type NoteWorkspaceTab = {
  id: string
  noteId: string | null
  note: NoteViewModel | null
  mode: NoteWorkspaceMode
  draft: NoteDraftSnapshot
  view: NoteViewSession
  saveState: NoteWorkspaceSaveState
  saveError: string | null
}

export type NoteWorkspaceState = {
  version: typeof NOTE_WORKSPACE_VERSION
  tabs: NoteWorkspaceTab[]
  activeTabId: string
}

export type NoteWorkspaceTabPatch = {
  note?: NoteViewModel | null
  noteId?: string | null
  mode?: NoteWorkspaceMode
  draft?: Partial<NoteDraftSnapshot>
  view?: Partial<NoteViewSession>
  saveState?: NoteWorkspaceSaveState
  saveError?: string | null
}

export type NoteWorkspaceIdFactory = () => string

const DEFAULT_DRAFT: NoteDraftSnapshot = { title: '', description: '', tags: '' }
const DEFAULT_VIEW: NoteViewSession = { scrollTop: 0 }

let fallbackIdCounter = 0

const defaultIdFactory: NoteWorkspaceIdFactory = () => {
  const cryptoApi = globalThis.crypto ?? null
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }

  const counter = fallbackIdCounter++
  return `note-tab-${Date.now()}-${counter}`
}

const asString = (value: unknown, fallback: string): string => (
  typeof value === 'string' ? value : fallback
)

const asNonNegativeFiniteNumber = (value: unknown, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
)

const asRange = (value: unknown, key: 'from' | 'to' | 'start' | 'end'): number | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const candidate = (value as Record<string, unknown>)[key]
  return typeof candidate === 'number' && Number.isInteger(candidate) && candidate >= 0
    ? candidate
    : undefined
}

const normalizeRange = <T extends 'titleSelection' | 'editorSelection'>(
  value: unknown,
  kind: T,
): NoteViewSession[T] | undefined => {
  const from = asRange(value, kind === 'titleSelection' ? 'start' : 'from')
  const to = asRange(value, kind === 'titleSelection' ? 'end' : 'to')
  if (from === undefined || to === undefined || to < from) return undefined
  return (kind === 'titleSelection'
    ? { start: from, end: to }
    : { from, to }) as NoteViewSession[T]
}

const draftFromNote = (note: NoteViewModel | null): NoteDraftSnapshot => ({
  title: note?.title ?? '',
  description: note?.description ?? note?.content ?? '',
  tags: note?.tags?.join(', ') ?? '',
})

const createEmptyTab = (idFactory: NoteWorkspaceIdFactory): NoteWorkspaceTab => ({
  id: idFactory(),
  noteId: null,
  note: null,
  // An empty workspace tab is a landing slot. Creating a note explicitly
  // switches it to editing; opening a note switches it to reading.
  mode: 'reading',
  draft: { ...DEFAULT_DRAFT },
  view: { ...DEFAULT_VIEW },
  saveState: 'saved',
  saveError: null,
})

const createNoteTab = (id: string, note: NoteViewModel): NoteWorkspaceTab => ({
  id,
  noteId: note.id,
  note,
  mode: 'reading',
  draft: draftFromNote(note),
  view: { ...DEFAULT_VIEW },
  saveState: 'saved',
  saveError: null,
})

export function createNoteWorkspaceState(idFactory: NoteWorkspaceIdFactory = defaultIdFactory): NoteWorkspaceState {
  const tab = createEmptyTab(idFactory)
  return {
    version: NOTE_WORKSPACE_VERSION,
    tabs: [tab],
    activeTabId: tab.id,
  }
}

export function getActiveWorkspaceTab(state: NoteWorkspaceState): NoteWorkspaceTab {
  return state.tabs.find((tab) => tab.id === state.activeTabId) ?? state.tabs[0]
}

export function findWorkspaceTabByNoteId(
  state: NoteWorkspaceState,
  noteId: string | null | undefined,
): NoteWorkspaceTab | null {
  if (!noteId) return null
  return state.tabs.find((tab) => tab.noteId === noteId) ?? null
}

export function addWorkspaceTab(
  state: NoteWorkspaceState,
  idFactory: NoteWorkspaceIdFactory = defaultIdFactory,
): NoteWorkspaceState {
  const tab = createEmptyTab(idFactory)
  return {
    ...state,
    tabs: [...state.tabs, tab],
    activeTabId: tab.id,
  }
}

export function activateWorkspaceTab(state: NoteWorkspaceState, tabId: string): NoteWorkspaceState {
  if (!state.tabs.some((tab) => tab.id === tabId) || state.activeTabId === tabId) return state
  return { ...state, activeTabId: tabId }
}

export function openNoteInWorkspace(
  state: NoteWorkspaceState,
  note: NoteViewModel,
  tabId: string = state.activeTabId,
): NoteWorkspaceState {
  const existing = findWorkspaceTabByNoteId(state, note.id)
  if (existing) return activateWorkspaceTab(state, existing.id)

  const index = state.tabs.findIndex((tab) => tab.id === tabId)
  if (index < 0) return state

  const current = state.tabs[index]
  const nextTab = createNoteTab(current.id, note)
  const tabs = [...state.tabs]
  tabs[index] = nextTab
  return { ...state, tabs, activeTabId: nextTab.id }
}

export function updateWorkspaceTab(
  state: NoteWorkspaceState,
  tabId: string,
  patch: NoteWorkspaceTabPatch,
): NoteWorkspaceState {
  const index = state.tabs.findIndex((tab) => tab.id === tabId)
  if (index < 0) return state

  const current = state.tabs[index]
  const nextNote = patch.note === undefined ? current.note : patch.note
  const nextNoteId = patch.noteId === undefined ? (nextNote?.id ?? current.noteId) : patch.noteId
  const normalizedNoteId = nextNote ? nextNote.id : nextNoteId
  const nextTab: NoteWorkspaceTab = {
    ...current,
    ...patch,
    note: nextNote,
    noteId: normalizedNoteId ?? null,
    draft: patch.draft ? { ...current.draft, ...patch.draft } : current.draft,
    view: patch.view ? { ...current.view, ...patch.view } : current.view,
    saveError: patch.saveError === undefined ? current.saveError : patch.saveError,
  }

  if (!nextTab.noteId) nextTab.note = null
  if (nextTab.saveState !== 'error' && patch.saveError === undefined && patch.saveState !== 'error') {
    nextTab.saveError = null
  }

  const tabs = [...state.tabs]
  tabs[index] = nextTab
  return { ...state, tabs }
}

export function closeWorkspaceTab(
  state: NoteWorkspaceState,
  tabId: string,
  idFactory: NoteWorkspaceIdFactory = defaultIdFactory,
): NoteWorkspaceState {
  const index = state.tabs.findIndex((tab) => tab.id === tabId)
  if (index < 0) return state

  if (state.tabs.length === 1) {
    const replacement = createEmptyTab(idFactory)
    return { ...state, tabs: [replacement], activeTabId: replacement.id }
  }

  const wasActive = state.activeTabId === tabId
  const tabs = state.tabs.filter((tab) => tab.id !== tabId)
  if (!wasActive) return { ...state, tabs }

  const nextActive = state.tabs[index + 1] ?? state.tabs[index - 1]
  return { ...state, tabs, activeTabId: nextActive.id }
}

const normalizeNote = (value: unknown): NoteViewModel | null => {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  return typeof candidate.id === 'string' && candidate.id.length > 0
    ? value as NoteViewModel
    : null
}

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' ? value as Record<string, unknown> : null
)

const normalizeTabId = (
  raw: Record<string, unknown>,
  idFactory: NoteWorkspaceIdFactory,
  usedTabIds: Set<string>,
): string => {
  let id = typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : idFactory()
  while (usedTabIds.has(id)) id = idFactory()
  usedTabIds.add(id)
  return id
}

const normalizeTabDraft = (
  rawDraft: Record<string, unknown>,
  note: NoteViewModel | null,
): NoteDraftSnapshot => ({
  title: asString(rawDraft.title, note?.title ?? ''),
  description: asString(rawDraft.description, note?.description ?? note?.content ?? ''),
  tags: asString(rawDraft.tags, note?.tags?.join(', ') ?? ''),
})

const normalizeTabView = (rawView: Record<string, unknown>): NoteViewSession => {
  const titleSelection = normalizeRange(rawView.titleSelection, 'titleSelection')
  const editorSelection = normalizeRange(rawView.editorSelection, 'editorSelection')
  return {
    scrollTop: asNonNegativeFiniteNumber(rawView.scrollTop, 0),
    ...(titleSelection ? { titleSelection } : {}),
    ...(editorSelection ? { editorSelection } : {}),
  }
}

const normalizeSaveState = (value: unknown): NoteWorkspaceSaveState => (
  value === 'dirty' || value === 'saving' || value === 'error' ? value : 'saved'
)

const normalizeTab = (
  value: unknown,
  idFactory: NoteWorkspaceIdFactory,
  usedTabIds: Set<string>,
): NoteWorkspaceTab | null => {
  const raw = asRecord(value)
  if (!raw) return null

  const id = normalizeTabId(raw, idFactory, usedTabIds)

  const note = normalizeNote(raw.note)
  const rawNoteId = typeof raw.noteId === 'string' && raw.noteId.length > 0 ? raw.noteId : null
  const noteId = note?.id ?? rawNoteId
  const rawDraft = asRecord(raw.draft) ?? {}
  const rawView = asRecord(raw.view) ?? {}

  return {
    id,
    noteId,
    note: noteId && note?.id === noteId ? note : null,
    mode: raw.mode === 'reading' ? 'reading' : 'editing',
    draft: normalizeTabDraft(rawDraft, note),
    view: normalizeTabView(rawView),
    saveState: normalizeSaveState(raw.saveState),
    saveError: typeof raw.saveError === 'string' ? raw.saveError : null,
  }
}

export function hydrateNoteWorkspaceState(
  raw: unknown,
  idFactory: NoteWorkspaceIdFactory = defaultIdFactory,
): NoteWorkspaceState {
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    if (raw.length > MAX_NOTE_WORKSPACE_SERIALIZED_LENGTH) {
      return createNoteWorkspaceState(idFactory)
    }
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      return createNoteWorkspaceState(idFactory)
    }
  }

  if (!parsed || typeof parsed !== 'object') return createNoteWorkspaceState(idFactory)
  const source = parsed as Record<string, unknown>
  if (source.version !== NOTE_WORKSPACE_VERSION || !Array.isArray(source.tabs)) {
    return createNoteWorkspaceState(idFactory)
  }

  const usedTabIds = new Set<string>()
  const usedNoteIds = new Set<string>()
  const tabs = source.tabs
    .map((tab) => normalizeTab(tab, idFactory, usedTabIds))
    .filter((tab): tab is NoteWorkspaceTab => tab !== null)
    .filter((tab) => {
      if (!tab.noteId) return true
      if (usedNoteIds.has(tab.noteId)) return false
      usedNoteIds.add(tab.noteId)
      return true
    })

  if (tabs.length === 0) return createNoteWorkspaceState(idFactory)
  const requestedActive = typeof source.activeTabId === 'string' ? source.activeTabId : ''
  const activeTabId = tabs.some((tab) => tab.id === requestedActive) ? requestedActive : tabs[0].id
  return { version: NOTE_WORKSPACE_VERSION, tabs, activeTabId }
}

export function serializeNoteWorkspaceState(state: NoteWorkspaceState): string {
  const serialized = JSON.stringify(state)
  if (serialized.length > MAX_NOTE_WORKSPACE_SERIALIZED_LENGTH) {
    throw new RangeError('Note workspace state exceeds the storage limit')
  }
  return serialized
}
