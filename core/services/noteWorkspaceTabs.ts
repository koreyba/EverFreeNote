import type { NoteViewModel } from '@core/types/domain'

export const NOTE_WORKSPACE_VERSION = 1
export const MAX_NOTE_WORKSPACE_SERIALIZED_LENGTH = 2 * 1024 * 1024
export const MAX_NOTE_WORKSPACE_TABS = 32

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
  /**
   * Account the persisted tabs belong to. Workspace state is kept in
   * per-browser-tab storage that outlives a sign-out, and every tab caches the
   * note it shows — body included. Without this stamp the next account to sign
   * in inside the same browser tab adopts the previous account's open notes.
   */
  userId: string | null
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

export function createNoteWorkspaceState(
  idFactory: NoteWorkspaceIdFactory = defaultIdFactory,
  userId: string | null = null,
): NoteWorkspaceState {
  const tab = createEmptyTab(idFactory)
  return {
    version: NOTE_WORKSPACE_VERSION,
    userId,
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

export function canAddWorkspaceTab(state: NoteWorkspaceState): boolean {
  return state.tabs.length < MAX_NOTE_WORKSPACE_TABS
}

export function addWorkspaceTab(
  state: NoteWorkspaceState,
  idFactory: NoteWorkspaceIdFactory = defaultIdFactory,
): NoteWorkspaceState {
  if (!canAddWorkspaceTab(state)) return state
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

/**
 * Turns every tab that shows one of the given notes back into a blank landing
 * slot. Used after a note is deleted so no tab keeps rendering (or can
 * resurrect through autosave) a note that no longer exists. Tab identity,
 * order, and the active tab are preserved.
 */
export function resetWorkspaceTabsForNotes(
  state: NoteWorkspaceState,
  noteIds: readonly string[],
): NoteWorkspaceState {
  const deletedNoteIds = new Set(noteIds.filter((noteId) => noteId.length > 0))
  if (deletedNoteIds.size === 0) return state

  let changed = false
  const tabs = state.tabs.map((tab) => {
    if (!tab.noteId || !deletedNoteIds.has(tab.noteId)) return tab
    changed = true
    return {
      ...createEmptyTab(() => tab.id),
    }
  })

  return changed ? { ...state, tabs } : state
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
  userId: string | null = null,
): NoteWorkspaceState {
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    if (raw.length > MAX_NOTE_WORKSPACE_SERIALIZED_LENGTH) {
      return createNoteWorkspaceState(idFactory, userId)
    }
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      return createNoteWorkspaceState(idFactory, userId)
    }
  }

  if (!parsed || typeof parsed !== 'object') return createNoteWorkspaceState(idFactory, userId)
  const source = parsed as Record<string, unknown>
  if (source.version !== NOTE_WORKSPACE_VERSION || !Array.isArray(source.tabs)) {
    return createNoteWorkspaceState(idFactory, userId)
  }

  // Never hand one account's cached notes to another. A stamp that is absent
  // (state written before this guard existed) is treated as foreign too.
  const storedUserId = typeof source.userId === 'string' ? source.userId : null
  if (storedUserId !== userId) return createNoteWorkspaceState(idFactory, userId)

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

  if (tabs.length === 0) return createNoteWorkspaceState(idFactory, userId)
  const requestedActive = typeof source.activeTabId === 'string' ? source.activeTabId : ''
  const activeTabId = tabs.some((tab) => tab.id === requestedActive) ? requestedActive : tabs[0].id
  return { version: NOTE_WORKSPACE_VERSION, userId, tabs, activeTabId }
}

/**
 * A clean tab's draft is a byte-for-byte copy of the note it shows, and each
 * tab holds a whole note body. Dropping the copy halves what the workspace
 * costs to store; hydration rebuilds it from the note (see normalizeTabDraft),
 * so the round trip is unchanged.
 */
type PersistedWorkspaceTab = Omit<NoteWorkspaceTab, 'draft'> & { draft?: NoteDraftSnapshot }

const toPersistedTab = (tab: NoteWorkspaceTab): PersistedWorkspaceTab => {
  if (!tab.note) return tab
  const derived = draftFromNote(tab.note)
  const isCopyOfNote = tab.draft.title === derived.title
    && tab.draft.description === derived.description
    && tab.draft.tags === derived.tags
  if (!isCopyOfNote) return tab

  const withoutDraft: PersistedWorkspaceTab = { ...tab }
  delete withoutDraft.draft
  return withoutDraft
}

const serializeTabs = (state: NoteWorkspaceState, tabs: NoteWorkspaceTab[]): string => (
  JSON.stringify({ ...state, tabs: tabs.map(toPersistedTab) })
)

export function serializeNoteWorkspaceState(state: NoteWorkspaceState): string {
  const serialized = serializeTabs(state, state.tabs)
  if (serialized.length > MAX_NOTE_WORKSPACE_SERIALIZED_LENGTH) {
    throw new RangeError('Note workspace state exceeds the storage limit')
  }
  return serialized
}

export type NoteWorkspaceSerialization = {
  serialized: string
  /** Tabs left out to stay inside the budget, in the order they were dropped. */
  droppedTabIds: string[]
}

/**
 * Serializes as much of the workspace as fits the budget instead of failing
 * outright. A single oversized write used to lose every tab silently; keeping
 * a subset means a reload restores fewer tabs rather than none.
 *
 * The active tab is never dropped, and tabs carrying unsaved work go last —
 * losing a saved note costs a re-open, losing a draft costs the user's typing.
 * Returns null only when even the active tab alone exceeds the budget.
 */
export function serializeNoteWorkspaceStateWithinLimit(
  state: NoteWorkspaceState,
  maxLength: number = MAX_NOTE_WORKSPACE_SERIALIZED_LENGTH,
): NoteWorkspaceSerialization | null {
  let tabs = state.tabs
  const droppedTabIds: string[] = []

  for (;;) {
    const serialized = serializeTabs(state, tabs)
    if (serialized.length <= maxLength) return { serialized, droppedTabIds }

    // Drop the least costly tab to lose: saved before unsaved, latest first.
    const droppable = tabs
      .map((tab, index) => ({ tab, index }))
      .filter(({ tab }) => tab.id !== state.activeTabId)
      .sort((left, right) => {
        const rank = (entry: { tab: NoteWorkspaceTab }) => (entry.tab.saveState === 'saved' ? 0 : 1)
        return rank(left) - rank(right) || right.index - left.index
      })

    const next = droppable[0]
    if (!next) return null

    droppedTabIds.push(next.tab.id)
    tabs = tabs.filter((tab) => tab.id !== next.tab.id)
  }
}
