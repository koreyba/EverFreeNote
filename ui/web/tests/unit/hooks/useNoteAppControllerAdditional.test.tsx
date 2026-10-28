import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import type { NoteViewModel, SearchResult } from '@core/types/domain'
import {
  addWorkspaceTab,
  createNoteWorkspaceState,
  MAX_NOTE_WORKSPACE_TABS,
  serializeNoteWorkspaceState,
  updateWorkspaceTab,
} from '@core/services/noteWorkspaceTabs'
import { NOTE_WORKSPACE_STORAGE_KEY } from '@ui/web/lib/noteWorkspaceStorage'
import { toast } from 'sonner'

let mockSelectedNote: NoteViewModel | null = null
let mockIsEditing = true
let mockIsOffline = false
let mockOfflineOverlay: Array<{ id: string; status: string }> = []
let mockNotes: NoteViewModel[] = []
let mockTagServerCount: number | null = null
let mockTagQueue: Array<{ id: string }> = []
let mockResolvedSearchResult: NoteViewModel | null = null
let mockNoteToDelete: NoteViewModel | null = null
let mockAuthUser: { id: string } | null = { id: 'user-1' }
let mockProviderUser: { id: string } | null = { id: 'user-1' }

const mockGetNotes = jest.fn()
const mockGetExistingNoteIds = jest.fn()
const mockLoadCachedNotes = jest.fn()
const mockRemoveSyncedNotes = jest.fn()
const mockPatchSyncedTags = jest.fn()
const mockGetNoteStatus = jest.fn()
const mockGetNote = jest.fn()
const mockGetNotesByIds = jest.fn()
const mockHandleSelectNote = jest.fn()
const mockHandleSearchResultClick = jest.fn()
const mockHandleEditNoteRaw = jest.fn()
const mockHandleCreateNote = jest.fn()
const mockSetSelectedNote = jest.fn()
const mockSetIsEditing = jest.fn()
const mockSetLastSavedAt = jest.fn()
const mockOnTagClick = jest.fn()
const mockHandleSearch = jest.fn()
const mockClearTagFilter = jest.fn()
const mockResetFtsResults = jest.fn()
const mockHandleAutoSave = jest.fn()
const mockHandleSaveNote = jest.fn()
const mockHandleReadNote = jest.fn()
const mockClearActiveSettingsNoteReturnPath = jest.fn()
const mockResolveSearchResult = jest.fn(() => mockResolvedSearchResult)
const mockUpdateNoteMutation = jest.fn()
const mockPersistOfflineNoteUpdates = jest.fn().mockResolvedValue(undefined)
const mockConfirmDeleteNote = jest.fn()

jest.mock('sonner', () => ({ toast: { error: jest.fn(), info: jest.fn(), success: jest.fn() } }))
jest.mock('@ui/web/providers/SupabaseProvider', () => ({
  useSupabase: () => ({ supabase: {
    key: 'supabase',
    from: () => ({ select: () => ({ eq: async () => ({ count: mockTagServerCount ?? mockNotes.length, error: null }) }) }),
  }, user: mockProviderUser }),
}))
jest.mock('@core/services/notes', () => ({
  NoteService: jest.fn().mockImplementation(() => ({
    getNoteStatus: mockGetNoteStatus,
    getNotes: mockGetNotes,
    getExistingNoteIds: mockGetExistingNoteIds,
    getNote: mockGetNote,
    getNotesByIds: mockGetNotesByIds,
  })),
}))
jest.mock('@core/utils/noteSnapshot', () => ({
  mergeNoteFields: jest.fn((local: NoteViewModel, remote: NoteViewModel) => ({ ...local, ...remote })),
  pickLatestNote: jest.fn((notes: Array<NoteViewModel | undefined>) => notes
    .filter(Boolean)
    .sort((left, right) => Date.parse(left!.updated_at) - Date.parse(right!.updated_at))
    .at(-1) ?? null),
}))
jest.mock('@ui/web/lib/aiIndexNavigationState', () => ({
  clearActiveSettingsNoteReturnPath: (...args: never[]) => mockClearActiveSettingsNoteReturnPath(...args),
}))

jest.mock('@ui/web/hooks/useNoteAuth', () => ({
  useNoteAuth: () => ({
    user: mockAuthUser,
    loading: false,
    handleSignInWithGoogle: jest.fn(),
    handleTestLogin: jest.fn(),
    handleSkipAuth: jest.fn(),
    handleSignOut: jest.fn(),
    handleDeleteAccount: jest.fn(),
    deleteAccountLoading: false,
  }),
}))
jest.mock('@ui/web/hooks/useNoteSelection', () => ({
  useNoteSelection: () => ({
    selectedNote: mockSelectedNote,
    setSelectedNote: mockSetSelectedNote,
    isEditing: mockIsEditing,
    setIsEditing: mockSetIsEditing,
    deleteDialogOpen: false,
    setDeleteDialogOpen: jest.fn(),
    noteToDelete: mockNoteToDelete,
    setNoteToDelete: jest.fn(),
    selectedNoteIds: new Set<string>(),
    selectionMode: false,
    bulkDeleting: false,
    setBulkDeleting: jest.fn(),
    handleSelectNote: mockHandleSelectNote,
    handleSearchResultClick: mockHandleSearchResultClick,
    handleEditNote: mockHandleEditNoteRaw,
    handleCreateNote: mockHandleCreateNote,
    handleDeleteNote: jest.fn(),
    enterSelectionMode: jest.fn(),
    exitSelectionMode: jest.fn(),
    toggleNoteSelection: jest.fn(),
    selectAllVisible: jest.fn(),
    clearSelection: jest.fn(),
  }),
}))
jest.mock('@ui/web/hooks/useNoteSync', () => ({
  useNoteSync: () => ({
    offlineOverlay: mockOfflineOverlay,
    setOfflineOverlay: jest.fn(),
    pendingCount: 0,
    setPendingCount: jest.fn(),
    failedCount: 0,
    setFailedCount: jest.fn(),
    isOffline: mockIsOffline,
    lastSavedAt: null,
    setLastSavedAt: mockSetLastSavedAt,
    offlineCache: { deleteNote: jest.fn(), loadNotes: mockLoadCachedNotes, removeSyncedNotes: mockRemoveSyncedNotes, patchSyncedTags: mockPatchSyncedTags, saveNote: jest.fn() },
    enqueueMutation: jest.fn(),
    enqueueBatchAndDrainIfOnline: jest.fn(),
    offlineQueueRef: { current: { getQueue: async () => mockTagQueue } },
  }),
}))
jest.mock('@ui/web/hooks/useNotesMutations', () => ({
  useCreateNote: () => ({ mutateAsync: jest.fn() }),
  useUpdateNote: () => ({ mutateAsync: mockUpdateNoteMutation }),
  useDeleteNote: () => ({ mutateAsync: jest.fn() }),
  useRemoveTag: () => ({ mutateAsync: jest.fn() }),
}))
jest.mock('@ui/web/hooks/useNotesQuery', () => ({
  useNotesQuery: () => ({
    data: { pages: [{ notes: mockNotes, totalCount: mockTagServerCount ?? mockNotes.length }] },
    refetch: async () => ({ data: { pages: [{ notes: mockNotes, totalCount: mockTagServerCount ?? mockNotes.length }] } }),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
  }),
}))
jest.mock('@ui/web/hooks/useNoteData', () => ({
  useNoteData: () => ({
    notes: mockNotes,
    resolveSearchResult: mockResolveSearchResult,
    mergedFtsData: [],
    notesDisplayed: mockNotes.length,
    notesTotal: mockNotes.length,
    selectedCount: 0,
    notesRef: { current: mockNotes },
  }),
}))
jest.mock('@ui/web/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({ current: null }),
}))
jest.mock('@ui/web/hooks/useNoteSaveHandlers', () => ({
  useNoteSaveHandlers: () => ({
    saving: false,
    autoSaving: false,
    handleAutoSave: mockHandleAutoSave,
    handleSaveNote: mockHandleSaveNote,
    handleReadNote: mockHandleReadNote,
    confirmDeleteNote: mockConfirmDeleteNote,
    waitForPendingNoteWrites: jest.fn().mockResolvedValue(undefined),
    handleRemoveTagFromNote: jest.fn(),
    persistOfflineNoteUpdates: mockPersistOfflineNoteUpdates,
  }),
}))
jest.mock('@ui/web/hooks/useNoteBulkActions', () => ({
  useNoteBulkActions: () => ({
    selectAllVisible: jest.fn(),
    deleteSelectedNotes: jest.fn(),
    deleteNotesByIds: jest.fn(),
  }),
}))
jest.mock('@ui/web/hooks/useNoteSearch', () => {
  const ReactRuntime = jest.requireActual('react')

  return {
    useNoteSearch: () => {
      const [isSearchPanelOpen, setIsSearchPanelOpen] = ReactRuntime.useState(true)
      return {
        searchQuery: 'initial search',
        filterByTag: 'initial-tag',
        isSearchPanelOpen,
        setIsSearchPanelOpen,
        handleSearch: mockHandleSearch,
        handleTagClick: mockOnTagClick,
        handleClearTagFilter: mockClearTagFilter,
        showFTSResults: false,
        aggregatedFtsData: [],
        ftsObserverTarget: { current: null },
        ftsHasMore: false,
        ftsLoadingMore: false,
        ftsAccumulatedResults: [],
        loadMoreFts: jest.fn(),
        ftsSearchResult: null,
        resetFtsResults: mockResetFtsResults,
        showTagOnlyResults: false,
        tagOnlyResults: [],
        tagOnlyTotal: 0,
        tagOnlyLoading: false,
        tagOnlyHasMore: false,
        tagOnlyLoadingMore: false,
        loadMoreTagOnly: jest.fn(),
      }
    },
  }
})

const makeNote = (overrides: Partial<NoteViewModel> = {}): NoteViewModel => ({
  id: 'note-1',
  title: 'Local',
  description: 'Body',
  tags: ['tag'],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  user_id: 'user-1',
  ...overrides,
})

function createWrapper(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return {
    queryClient,
    ...renderHook(() => useNoteAppController(), { wrapper: createWrapper(queryClient) }),
  }
}

describe('useNoteAppController additional observable behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.sessionStorage.clear()
    mockSelectedNote = null
    mockIsEditing = true
    mockIsOffline = false
    mockOfflineOverlay = []
    mockNotes = []
    mockTagServerCount = null
    mockTagQueue = []
    mockLoadCachedNotes.mockResolvedValue([])
    mockGetExistingNoteIds.mockImplementation(async (ids) => ids)
    mockGetNotesByIds.mockImplementation(async (ids) => mockNotes.filter(note => ids.includes(note.id)))
    mockRemoveSyncedNotes.mockImplementation(async (cached) => cached.map((note: { id: string }) => note.id))
    mockPatchSyncedTags.mockImplementation(async (patches) => patches.map((patch: { expected: { id: string } }) => patch.expected.id))
    mockResolvedSearchResult = null
    mockNoteToDelete = null
    mockAuthUser = { id: 'user-1' }
    mockProviderUser = { id: 'user-1' }
    mockHandleAutoSave.mockReset().mockResolvedValue(undefined)
    mockHandleSaveNote.mockReset().mockResolvedValue(undefined)
    mockHandleReadNote.mockReset().mockResolvedValue(undefined)
    mockConfirmDeleteNote.mockReset().mockResolvedValue(true)
    mockUpdateNoteMutation.mockReset()
    mockUpdateNoteMutation.mockResolvedValue(undefined)
  })

  it('hides the old workspace immediately when the provider changes users before the auth hook catches up', async () => {
    const first = makeNote({ id: 'first', title: 'Private first note' })
    mockGetNoteStatus.mockResolvedValue({ status: 'found', note: first })
    const { result, rerender } = setup()
    await waitFor(() => expect(result.current.workspaceHydrated).toBe(true))
    await act(async () => { await result.current.handleSelectNote(first) })
    expect(result.current.activeTab.note?.title).toBe('Private first note')

    mockProviderUser = { id: 'user-2' }
    rerender()
    expect(result.current.workspaceHydrated).toBe(false)
    expect(result.current.activeTab.note).toBeNull()

    mockAuthUser = { id: 'user-2' }
    rerender()
    await waitFor(() => expect(result.current.workspaceHydrated).toBe(true))
    expect(result.current.activeTab.note).toBeNull()
  })

  it('flushes pending editor work before creating a note and captures the current UI state', async () => {
    const note = makeNote()
    mockSelectedNote = note
    mockNotes = [note]
    window.history.pushState({}, '', '/?search=open')
    const flushPendingSave = jest.fn().mockResolvedValue(undefined)
    const editorRef = { current: { flushPendingSave } }
    const { result } = setup()

    act(() => result.current.registerNoteEditorRef(editorRef as never))
    await act(async () => {
      await result.current.handleCreateNote()
    })

    expect(flushPendingSave).toHaveBeenCalledTimes(1)
    expect(mockHandleCreateNote).toHaveBeenCalledTimes(1)
    expect(mockClearActiveSettingsNoteReturnPath).toHaveBeenCalled()
    expect(mockSetLastSavedAt).toHaveBeenCalledWith(null)

    const snapshot = await act(async () => result.current.captureSettingsReturnState())
    expect(snapshot).toEqual({
      selectedNoteId: null,
      selectedNote: null,
      isEditing: true,
      isSearchPanelOpen: true,
      searchQuery: 'initial search',
      filterByTag: 'initial-tag',
    })
    expect(flushPendingSave).toHaveBeenCalledTimes(2)
    window.history.pushState({}, '', '/')
  })

  it('captures the editor selection before switching to a new workspace tab', async () => {
    const { result } = setup()

    const flushPendingSave = jest.fn().mockResolvedValue(undefined)
    const captureSession = jest.fn(() => ({
      draft: { title: 'Draft', description: '<p>Body</p>', tags: '' },
      view: { scrollTop: 12, editorSelection: { from: 4, to: 9 } },
    }))
    const editorRef = { current: { flushPendingSave, captureSession } }
    act(() => result.current.registerNoteEditorRef(editorRef as never))

    await act(async () => {
      await result.current.addTab()
    })

    expect(captureSession).toHaveBeenCalledTimes(1)
    expect(flushPendingSave).toHaveBeenCalledTimes(1)
    expect(result.current.tabs[0].view).toEqual({
      scrollTop: 12,
      editorSelection: { from: 4, to: 9 },
    })
  })

  it('returns to the note list after creating a blank tab so the active slot can receive a note', async () => {
    const { result } = setup()

    let createdId: string | null = null
    await act(async () => {
      createdId = await result.current.addTab()
    })

    expect(createdId).toBe(result.current.activeTabId)
    expect(result.current.activeTab.note).toBeNull()
    expect(result.current.notePaneVisible).toBe(false)
  })

  it('does not create or activate another tab when flushing the current editor fails', async () => {
    const first = makeNote({ id: 'first', title: 'First' })
    const second = makeNote({ id: 'second', title: 'Second' })
    mockGetNoteStatus.mockImplementation((id: string) => Promise.resolve({
      status: 'found', note: id === 'first' ? first : second,
    }))
    const { result } = setup()
    await waitFor(() => expect(result.current.workspaceHydrated).toBe(true))
    await act(async () => { await result.current.handleSelectNote(first) })
    const firstTabId = result.current.activeTabId
    await act(async () => { await result.current.addTab() })
    await act(async () => { await result.current.handleSelectNote(second) })
    await act(async () => { await result.current.handleEditNote(second) })
    const secondTabId = result.current.activeTabId
    const draft = { title: 'Unsaved second', description: '<p>Keep this</p>', tags: '' }
    const flushPendingSave = jest.fn().mockRejectedValue(new Error('Storage unavailable'))
    const captureSession = jest.fn(() => ({ draft, view: { scrollTop: 15 } }))
    act(() => result.current.registerNoteEditorRef({ current: { flushPendingSave, captureSession } } as never))

    let addedId: string | null = 'not attempted'
    await act(async () => { addedId = await result.current.addTab() })
    expect(addedId).toBeNull()
    let activated = true
    await act(async () => { activated = await result.current.activateTab(firstTabId) })
    expect(activated).toBe(false)
    await act(async () => { await result.current.closeTab(secondTabId) })
    const settingsSnapshot = await act(async () => result.current.captureSettingsReturnState())

    expect(settingsSnapshot).toBeNull()
    expect(result.current.activeTabId).toBe(secondTabId)
    expect(result.current.tabs).toHaveLength(2)
    expect(result.current.activeTab.draft).toEqual(draft)
    expect(result.current.activeTab.view.scrollTop).toBe(15)
    expect(flushPendingSave).toHaveBeenCalledTimes(4)
  })

  it('creates only one tab when add is requested twice during a pending save', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.workspaceHydrated).toBe(true))
    await act(async () => { await result.current.handleCreateNote() })
    let finishSave: () => void = () => undefined
    const pendingSave = new Promise<void>((resolve) => { finishSave = resolve })
    const flushPendingSave = jest.fn(() => pendingSave)
    act(() => result.current.registerNoteEditorRef({ current: { flushPendingSave } } as never))

    let firstId: string | null = null
    let secondId: string | null = 'not attempted'
    await act(async () => {
      const first = result.current.addTab()
      secondId = await result.current.addTab()
      finishSave()
      firstId = await first
    })

    expect(firstId).toBe(result.current.activeTabId)
    expect(secondId).toBeNull()
    expect(result.current.tabs).toHaveLength(2)
    expect(flushPendingSave).toHaveBeenCalledTimes(1)
  })

  it('returns to the note list when closing the final blank tab replacement', async () => {
    const { result } = setup()
    const activeTabId = result.current.activeTabId

    await act(async () => {
      await result.current.closeTab(activeTabId)
    })

    expect(result.current.activeTab.note).toBeNull()
    expect(result.current.notePaneVisible).toBe(false)
  })

  it('asks before discarding a tab whose save failed, and only closes on confirm', async () => {
    const { result } = setup()
    const tabId = result.current.activeTabId

    // Reach the error state the way the app does: an autosave that rejects.
    mockHandleAutoSave.mockRejectedValueOnce(new Error('Network unavailable'))
    await act(async () => {
      await expect(
        result.current.handleAutoSave({ title: '', description: '<p>x</p>', tags: '' }),
      ).rejects.toThrow('Network unavailable')
    })
    expect(result.current.activeTab.saveState).toBe('error')

    await act(async () => {
      await result.current.closeTab(tabId)
    })

    // Still open, and the shell now has something to render a dialog from.
    expect(result.current.tabPendingClose).toEqual({ tabId, label: 'this tab' })
    expect(result.current.tabs.map((tab) => tab.id)).toContain(tabId)

    act(() => {
      result.current.cancelCloseTab()
    })
    expect(result.current.tabPendingClose).toBeNull()
    expect(result.current.tabs.map((tab) => tab.id)).toContain(tabId)

    await act(async () => {
      await result.current.closeTab(tabId)
    })
    await act(async () => {
      await result.current.confirmCloseTab()
    })

    expect(result.current.tabPendingClose).toBeNull()
    expect(result.current.tabs.map((tab) => tab.id)).not.toContain(tabId)
  })

  it('names the failed tab from its draft when the note never reached the server', async () => {
    const { result } = setup()
    const tabId = result.current.activeTabId

    mockHandleAutoSave.mockRejectedValueOnce(new Error('Network unavailable'))
    await act(async () => {
      await expect(
        result.current.handleAutoSave({ title: 'Unsent note', description: '<p>x</p>', tags: '' }),
      ).rejects.toThrow('Network unavailable')
    })

    await act(async () => {
      await result.current.closeTab(tabId)
    })

    expect(result.current.tabPendingClose?.label).toBe('Unsent note')
  })

  it('blocks controller Add tab before flushing when the shared workspace limit is reached', async () => {
    let nextId = 0
    // Stamped with the signed-in account: workspace state from anyone else is
    // deliberately discarded on hydration.
    let state = createNoteWorkspaceState(() => `tab-${nextId++}`, 'user-1')
    while (state.tabs.length < MAX_NOTE_WORKSPACE_TABS) {
      state = addWorkspaceTab(state, () => `tab-${nextId++}`)
    }
    window.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, serializeNoteWorkspaceState(state))

    const { result } = setup()
    await waitFor(() => expect(result.current.tabs).toHaveLength(MAX_NOTE_WORKSPACE_TABS))
    expect(result.current.canAddTab).toBe(false)

    const flushPendingSave = jest.fn().mockResolvedValue(undefined)
    act(() => result.current.registerNoteEditorRef({ current: { flushPendingSave } } as never))
    await act(async () => {
      await result.current.addTab()
    })

    expect(flushPendingSave).not.toHaveBeenCalled()
    expect(result.current.tabs).toHaveLength(MAX_NOTE_WORKSPACE_TABS)
  })

  it.each(['/?view=notes', '/?search=open'])(
    'opens the requested mobile destination while preserving a restored draft: %s', async (url) => {
      const previousWidth = window.innerWidth
      const previousUrl = `${window.location.pathname}${window.location.search}`
      try {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
        window.history.replaceState({}, '', url)
        const note = makeNote()
        const state = createNoteWorkspaceState(() => 'draft-tab', 'user-1')
        const draft = updateWorkspaceTab(state, state.activeTabId, {
          note, noteId: note.id, mode: 'editing', saveState: 'dirty',
          draft: { title: 'Unfinished draft', description: '<p>Keep this text</p>', tags: '' },
        })
        window.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, serializeNoteWorkspaceState(draft))
        const { result } = setup()
        await waitFor(() => expect(result.current.workspaceHydrated).toBe(true))
        expect(result.current.notePaneVisible).toBe(false)
        expect(result.current.activeTab.draft.description).toBe('<p>Keep this text</p>')
      } finally {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
        window.history.replaceState({}, '', previousUrl)
      }
    },
  )

  it('selects the remote note after flushing, but exits editing when selecting the already selected note', async () => {
    const current = makeNote({ id: 'current' })
    const remote = makeNote({ id: 'remote', title: 'Remote' })
    mockSelectedNote = current
    mockGetNoteStatus.mockResolvedValue({ status: 'found', note: remote })
    const { result } = setup()

    await act(async () => {
      await result.current.handleSelectNote(remote)
    })
    expect(mockGetNoteStatus).toHaveBeenCalledWith('remote')
    expect(mockHandleSelectNote).toHaveBeenCalledWith(expect.objectContaining({ id: 'remote' }))
    expect(mockSetLastSavedAt).toHaveBeenCalledWith(null)

    jest.clearAllMocks()
    await act(async () => {
      await result.current.handleSelectNote(remote)
    })
    expect(mockGetNoteStatus).not.toHaveBeenCalled()
    expect(mockSetIsEditing).toHaveBeenCalledWith(false)
    expect(mockHandleSelectNote).not.toHaveBeenCalled()
  })

  it('applies tag navigation and search-result navigation after resolving the result', async () => {
    const resultNote = makeNote({ id: 'result', title: 'Result' })
    mockResolvedSearchResult = resultNote
    mockGetNoteStatus.mockResolvedValue({ status: 'found', note: resultNote })
    const { result } = setup()

    await act(async () => {
      await result.current.handleTagClick('work')
    })
    expect(mockOnTagClick).toHaveBeenCalledWith('work')
    expect(mockSetSelectedNote).toHaveBeenCalledWith(null)
    expect(mockSetIsEditing).toHaveBeenCalledWith(false)

    await act(async () => {
      await result.current.handleSearchResultClick({ id: 'result' } as SearchResult)
    })
    expect(mockResolveSearchResult).toHaveBeenCalledWith({ id: 'result' })
    expect(mockHandleSearchResultClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'result' }))
  })

  it('tracks manual save success and keeps save failures visible on the active tab', async () => {
    const data = { title: 'Saved title', description: 'Saved body', tags: 'one, two' }
    const { result } = setup()

    await act(async () => {
      await result.current.handleSaveNote(data)
    })
    expect(result.current.activeTab.draft).toEqual(data)
    expect(result.current.activeTab.saveState).toBe('saved')
    expect(result.current.activeTab.saveError).toBeNull()

    mockHandleSaveNote.mockRejectedValueOnce(new Error('network failure'))
    await act(async () => {
      await result.current.handleSaveNote(data)
    })
    expect(result.current.activeTab.saveState).toBe('error')
    expect(result.current.activeTab.saveError).toBe('network failure')
  })

  it('marks auto-save and Read failures on the active tab', async () => {
    const data = { title: 'Draft', description: 'Body', tags: '' }
    const { result } = setup()

    mockHandleAutoSave.mockRejectedValueOnce(new Error('auto-save failure'))
    await act(async () => {
      await expect(result.current.handleAutoSave({ ...data, noteId: 'note-1' })).rejects.toThrow('auto-save failure')
    })
    expect(result.current.activeTab.saveState).toBe('error')
    expect(result.current.activeTab.saveError).toBe('auto-save failure')

    mockHandleReadNote.mockRejectedValueOnce(new Error('read-save failure'))
    await act(async () => {
      await result.current.handleReadNote(data)
    })
    expect(result.current.activeTab.saveState).toBe('error')
    expect(result.current.activeTab.saveError).toBe('read-save failure')
  })

  it('ignores a stale select request when a newer request completes first', async () => {
    const first = makeNote({ id: 'first' })
    const second = makeNote({ id: 'second' })
    let resolveFirst: ((value: unknown) => void) | undefined
    let resolveSecond: ((value: unknown) => void) | undefined
    mockGetNoteStatus.mockImplementation((id: string) => new Promise((resolve) => {
      if (id === 'first') resolveFirst = resolve
      else resolveSecond = resolve
    }))
    const { result } = setup()

    let firstPromise: Promise<void> | undefined
    let secondPromise: Promise<void> | undefined
    act(() => {
      firstPromise = result.current.handleSelectNote(first)
    })
    await waitFor(() => expect(mockGetNoteStatus).toHaveBeenCalledTimes(1))

    act(() => {
      secondPromise = result.current.handleSelectNote(second)
    })
    await waitFor(() => expect(mockGetNoteStatus).toHaveBeenCalledTimes(2))
    expect(resolveFirst).toBeDefined()
    expect(resolveSecond).toBeDefined()

    await act(async () => {
      resolveSecond?.({ status: 'found', note: second })
      await secondPromise
    })
    await act(async () => {
      resolveFirst?.({ status: 'found', note: first })
      await firstPromise
    })

    expect(mockHandleSelectNote).toHaveBeenCalledTimes(1)
    expect(mockHandleSelectNote).toHaveBeenCalledWith(expect.objectContaining({ id: 'second' }))
  })

  it('aborts a note selection when flushing the outgoing editor fails', async () => {
    const target = makeNote({ id: 'target' })
    mockGetNoteStatus.mockResolvedValue({ status: 'found', note: target })
    const { result } = setup()
    await waitFor(() => expect(result.current.workspaceHydrated).toBe(true))

    const flushPendingSave = jest.fn().mockRejectedValue(new Error('autosave failed'))
    act(() => result.current.registerNoteEditorRef({ current: { flushPendingSave } } as never))

    await act(async () => {
      await result.current.handleSelectNote(target)
    })

    expect(flushPendingSave).toHaveBeenCalledTimes(1)
    expect(mockGetNoteStatus).not.toHaveBeenCalled()
    expect(mockHandleSelectNote).not.toHaveBeenCalled()
    expect(result.current.activeTab.noteId).toBeNull()
  })

  it('keeps the editor visible when saving fails during a mobile navigation', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.workspaceHydrated).toBe(true))
    await act(async () => result.current.handleCreateNote())
    const flushPendingSave = jest.fn().mockRejectedValue(new Error('autosave failed'))
    act(() => result.current.registerNoteEditorRef({ current: { flushPendingSave } } as never))

    let hidden = true
    await act(async () => { hidden = await result.current.hideNotePane() })

    expect(hidden).toBe(false)
    expect(result.current.notePaneVisible).toBe(true)
    expect(result.current.isEditing).toBe(true)
  })

  it('resets every workspace tab that shows a deleted note', async () => {
    const first = makeNote({ id: 'first', title: 'First' })
    const second = makeNote({ id: 'second', title: 'Second' })
    mockNoteToDelete = first
    mockGetNoteStatus.mockImplementation((id: string) => Promise.resolve({
      status: 'found',
      note: id === 'first' ? first : second,
    }))
    const { result } = setup()
    await waitFor(() => expect(result.current.workspaceHydrated).toBe(true))

    await act(async () => {
      await result.current.handleSelectNote(first)
    })
    await act(async () => {
      await result.current.addTab()
    })
    await act(async () => {
      await result.current.handleSelectNote(second)
    })
    expect(result.current.tabs.map((tab) => tab.noteId)).toEqual(['first', 'second'])

    await act(async () => {
      await result.current.confirmDeleteNote()
    })

    expect(mockConfirmDeleteNote).toHaveBeenCalledTimes(1)
    expect(result.current.tabs).toHaveLength(2)
    expect(result.current.tabs.map((tab) => tab.noteId)).toEqual([null, 'second'])
    expect(result.current.tabs[0].draft).toEqual({ title: '', description: '', tags: '' })
  })

  it('keeps workspace tabs untouched when the delete fails', async () => {
    const first = makeNote({ id: 'first', title: 'First' })
    mockNoteToDelete = first
    mockConfirmDeleteNote.mockResolvedValue(false)
    mockGetNoteStatus.mockResolvedValue({ status: 'found', note: first })
    const { result } = setup()
    await waitFor(() => expect(result.current.workspaceHydrated).toBe(true))

    await act(async () => {
      await result.current.handleSelectNote(first)
    })
    await act(async () => {
      await result.current.confirmDeleteNote()
    })

    expect(result.current.tabs.map((tab) => tab.noteId)).toEqual(['first'])
  })

  it('registers, resets, and loads AI pagination controls', () => {
    const { result } = setup()
    const resetAIResults = jest.fn()
    const loadMoreAI = jest.fn()

    act(() => result.current.registerAIPaginationControls({ resetAIResults, loadMoreAI }))
    act(() => result.current.resetAIResults())
    act(() => result.current.loadMoreAI())

    expect(resetAIResults).toHaveBeenCalledTimes(1)
    expect(loadMoreAI).toHaveBeenCalledTimes(1)
  })

  it('restores a saved UI snapshot and disables editing when its note cannot be loaded', async () => {
    mockGetNote.mockRejectedValue(new Error('gone'))
    const { result } = setup()

    await act(async () => {
      await result.current.restoreUiState({
        selectedNoteId: 'missing',
        selectedNote: null,
        isEditing: true,
        isSearchPanelOpen: false,
        searchQuery: '',
        filterByTag: null,
      })
    })

    expect(mockGetNote).toHaveBeenCalledWith('missing')
    expect(mockResetFtsResults).toHaveBeenCalled()
    expect(mockClearTagFilter).toHaveBeenCalled()
    expect(mockSetSelectedNote).toHaveBeenCalledWith(null)
    expect(mockSetIsEditing).toHaveBeenCalledWith(false)
  })

  it('synchronizes the active view and search panel with browser navigation', () => {
    window.history.pushState({}, '', '/?view=tags&search=open')
    const { result, unmount } = setup()

    expect(result.current.activeMainView).toBe('tags')
    expect(result.current.isSearchPanelOpen).toBe(true)

    act(() => {
      window.history.pushState({}, '', '/?view=notes')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(result.current.activeMainView).toBe('notes')
    expect(result.current.isSearchPanelOpen).toBe(false)
    unmount()
    window.history.pushState({}, '', '/')
  })

  it('applies the latest browser navigation after an in-flight tag update finishes', async () => {
    window.history.replaceState({}, '', '/?view=tags')
    mockNotes = [makeNote({ tags: ['old'] })]
    let resolveWrite!: () => void
    mockUpdateNoteMutation.mockImplementation(() => new Promise<void>((resolve) => { resolveWrite = resolve }))
    const { result, unmount } = setup()
    await waitFor(() => expect(result.current.workspaceHydrated).toBe(true))

    let operation!: Promise<boolean>
    act(() => { operation = result.current.handleRenameTag('old', 'new') })
    await waitFor(() => expect(mockUpdateNoteMutation).toHaveBeenCalled())
    act(() => {
      window.history.pushState({}, '', '/?view=notes&search=open')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current.activeMainView).toBe('tags')
    await act(async () => { resolveWrite(); await operation })
    expect(result.current.activeMainView).toBe('notes')
    expect(result.current.isSearchPanelOpen).toBe(true)
    unmount()
    window.history.replaceState({}, '', '/')
  })

  it('opens the tags view when the app mounts after navigating from settings', () => {
    window.history.pushState({}, '', '/settings')

    const { result, unmount } = renderHook(() => {
      const controller = useNoteAppController()

      // Model the route transition before passive effects run: the server-rendered
      // controller starts with the notes fallback, then the browser is on tags.
      React.useLayoutEffect(() => {
        window.history.replaceState({}, '', '/?view=tags')
      }, [])

      return controller
    }, { wrapper: createWrapper(new QueryClient({ defaultOptions: { queries: { retry: false } } })) })

    expect(result.current.activeMainView).toBe('tags')

    unmount()
    window.history.pushState({}, '', '/')
  })

  it('persists tag rename, deletion, and cleanup mutations', async () => {
    const firstNote = makeNote({ id: 'first', tags: ['Old', 'keep'] })
    const secondNote = makeNote({ id: 'second', tags: ['old', '  ', 'KEEP'] })
    mockNotes = [firstNote, secondNote]
    const { result } = setup()

    await act(async () => {
      await result.current.handleRenameTag('old', 'new')
    })
    expect(mockUpdateNoteMutation).toHaveBeenCalledWith(expect.objectContaining({
      id: 'first',
      tags: ['new', 'keep'],
    }))
    expect(mockUpdateNoteMutation.mock.calls[0][0]).not.toHaveProperty('title')
    expect(mockUpdateNoteMutation.mock.calls[0][0]).not.toHaveProperty('description')
    expect(mockUpdateNoteMutation).toHaveBeenCalledWith(expect.objectContaining({
      id: 'second',
      tags: ['new', '  ', 'KEEP'],
    }))
    expect(toast.success).toHaveBeenCalledWith('Tag "old" renamed to "new"')

    mockUpdateNoteMutation.mockClear()
    await act(async () => {
      await result.current.handleDeleteTag('keep')
    })
    expect(mockUpdateNoteMutation).toHaveBeenCalledWith(expect.objectContaining({
      id: 'first',
      tags: ['Old'],
    }))
    expect(toast.success).toHaveBeenCalledWith('Tag "keep" deleted')

    mockUpdateNoteMutation.mockClear()
    await act(async () => {
      await result.current.handleCleanTags()
    })
    expect(mockUpdateNoteMutation).toHaveBeenCalledWith(expect.objectContaining({
      id: 'second',
      tags: ['old', 'KEEP'],
    }))
    expect(toast.success).toHaveBeenCalledWith('Cleaned up empty and duplicate tags')
  })

  it('reports no-op cleanup and mutation failures without throwing', async () => {
    mockNotes = [makeNote({ tags: ['stable'] })]
    const { result, unmount } = setup()

    await act(async () => {
      await result.current.handleRenameTag('missing', 'new')
      await result.current.handleDeleteTag('missing')
      await result.current.handleCleanTags()
    })
    expect(toast.info).toHaveBeenCalledWith('No matching tags found in the loaded notes.')
    expect(mockUpdateNoteMutation).not.toHaveBeenCalled()
    unmount()

    const firstNote = makeNote({ id: 'first', tags: ['old'] })
    const secondNote = makeNote({ id: 'second', tags: ['old'] })
    mockNotes = [firstNote, secondNote]
    mockUpdateNoteMutation.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('write failed'))

    const rerendered = setup()
    await act(async () => {
      await rerendered.result.current.handleRenameTag('old', 'new')
    })

    expect(toast.error).toHaveBeenCalledWith('The tag change may be incomplete. Notes were refreshed; review them before retrying.')
    expect(mockUpdateNoteMutation).toHaveBeenCalledTimes(2)
    expect(toast.success).not.toHaveBeenCalledWith('Tag "old" renamed to "new"')
  })

  it('blocks global tag changes offline without adding anything to the queue', async () => {
    mockIsOffline = true
    const firstNote = makeNote({ id: 'first', tags: ['old'] })
    mockNotes = [firstNote]
    const { result } = setup()

    await act(async () => {
      await result.current.handleRenameTag('old', 'new')
    })

    expect(mockPersistOfflineNoteUpdates).not.toHaveBeenCalled()
    expect(mockUpdateNoteMutation).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Connect to the internet to manage tags across notes.')
  })

  it('blocks a global change when a fresh total exceeds the loaded collection', async () => {
    mockNotes = Array.from({ length: 50 }, (_, i) => makeNote({ id: `note-${i}`, tags: ['old'] }))
    mockTagServerCount = 51
    const { result } = setup()
    await act(async () => { await result.current.handleRenameTag('old', 'new') })
    expect(mockUpdateNoteMutation).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Loaded 50 of 51 notes. Load more notes and check again.')
  })

  it('rejects duplicate rows instead of treating them as complete coverage', async () => {
    mockNotes = [makeNote({ id: 'same', tags: ['old'] }), makeNote({ id: 'same', tags: ['old'] })]
    mockTagServerCount = 2
    const { result } = setup()
    await act(async () => { await result.current.handleDeleteTag('old') })
    expect(mockUpdateNoteMutation).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Some notes appeared more than once. Refresh and check again.')
  })

  it('blocks a global change while a note mutation remains queued', async () => {
    mockNotes = [makeNote({ tags: ['old'] })]
    mockTagQueue = [{ id: 'pending-change' }]
    const { result } = setup()
    await act(async () => { await result.current.handleDeleteTag('old') })
    expect(mockUpdateNoteMutation).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Finish syncing your notes before managing tags.')
  })

  it.each([0, 1, 50, 51, 101, 1001])('checks the complete loaded collection of %i notes', async (count) => {
    mockNotes = Array.from({ length: count }, (_, i) => makeNote({ id: `note-${i}` }))
    mockTagServerCount = count
    const { result } = setup()
    await act(async () => { await result.current.checkTagCoverage() })
    expect(mockGetExistingNoteIds).toHaveBeenCalledWith(mockNotes.map((note) => note.id), 'user-1')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('preserves a dirty open draft and refuses a global deletion', async () => {
    mockIsEditing = false
    const note = makeNote({ tags: ['old'] })
    mockNotes = [note]
    const state = createNoteWorkspaceState(() => 'dirty-tab', 'user-1')
    const dirty = updateWorkspaceTab(state, state.activeTabId, {
      note, noteId: note.id, mode: 'editing', saveState: 'dirty',
      draft: { title: 'Keep this draft', description: 'Unsaved body', tags: 'old' },
    })
    window.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, serializeNoteWorkspaceState(dirty))
    const { result } = setup()
    await waitFor(() => expect(result.current.workspaceHydrated).toBe(true))
    await act(async () => { await result.current.handleDeleteTag('old') })
    expect(mockUpdateNoteMutation).not.toHaveBeenCalled()
    expect(result.current.tabs[0].draft.description).toBe('Unsaved body')
    expect(toast.error).toHaveBeenCalledWith('Save changes in open notes before managing tags.')
  })

  it('keeps an uncertain result visible if the reread also fails after a timeout', async () => {
    mockNotes = [makeNote({ tags: ['old'] })]
    mockUpdateNoteMutation.mockRejectedValueOnce(new Error('request timed out'))
    mockGetNotesByIds.mockRejectedValue(new Error('offline'))
    const { result } = setup()
    await act(async () => { await result.current.handleRenameTag('old', 'new') })
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('The tag change could not be confirmed. Reconnect and refresh your notes before retrying.')
  })

  it('updates only tags in a synced cached note instead of discarding offline content', async () => {
    const note = makeNote({ id: 'cached', tags: ['old'], description: 'Keep this offline content' })
    mockNotes = [note]
    const cached = { ...note, status: 'synced', updatedAt: note.updated_at }
    mockLoadCachedNotes.mockResolvedValue([cached])
    mockGetNotesByIds.mockImplementation(async (ids) => ids.includes(note.id) ? [{ ...note, tags: ['new'] }] : [])
    const { result } = setup()
    await act(async () => { await result.current.handleRenameTag('old', 'new') })
    expect(mockPatchSyncedTags).toHaveBeenCalledWith([{ expected: cached, tags: ['new'] }])
    expect(mockRemoveSyncedNotes).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Tag "old" renamed to "new"')
  })

  it('removes an unchanged synced cache entry confirmed absent on the server', async () => {
    const note = makeNote({ id: 'present', tags: ['old'] })
    const cached = { ...makeNote({ id: 'deleted' }), status: 'synced' as const, updatedAt: '2024-01-01T00:00:00Z' }
    mockNotes = [note]
    mockLoadCachedNotes.mockResolvedValue([cached])
    mockGetExistingNoteIds.mockImplementation(async (ids) => ids.filter((id: string) => id === note.id))
    const { result } = setup()

    await act(async () => { await result.current.handleRenameTag('old', 'new') })

    expect(mockGetExistingNoteIds).toHaveBeenCalledWith([cached.id], 'user-1')
    expect(mockRemoveSyncedNotes).toHaveBeenCalledWith([cached])
    expect(toast.success).toHaveBeenCalledWith('Tag "old" renamed to "new"')
  })

  it('retains cached content and reports an unconfirmed change when absence cannot be verified', async () => {
    const note = makeNote({ id: 'present', tags: ['old'] })
    const cached = { ...makeNote({ id: 'deleted' }), status: 'synced' as const, updatedAt: '2024-01-01T00:00:00Z' }
    mockNotes = [note]
    mockLoadCachedNotes.mockResolvedValue([cached])
    mockGetExistingNoteIds.mockImplementation(async (ids) => {
      if (ids.includes(cached.id)) throw new Error('network failure')
      return ids
    })
    const { result } = setup()

    await act(async () => { await result.current.handleRenameTag('old', 'new') })

    expect(mockRemoveSyncedNotes).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('The tag change could not be confirmed. Reconnect and refresh your notes before retrying.')
  })

  it('requires a successful reread before retrying an uncertain tag change', async () => {
    mockNotes = [makeNote({ tags: ['old'] })]
    mockUpdateNoteMutation.mockRejectedValueOnce(new Error('request timed out'))
    mockGetNotesByIds.mockRejectedValue(new Error('offline'))
    const { result } = setup()
    await act(async () => { await result.current.handleRenameTag('old', 'new') })
    await act(async () => { await result.current.handleRenameTag('old', 'new') })
    expect(mockUpdateNoteMutation).toHaveBeenCalledTimes(1)
    expect(toast.success).not.toHaveBeenCalled()

    mockGetNotesByIds.mockResolvedValue([])
    await act(async () => { await result.current.handleRenameTag('old', 'new') })
    expect(mockUpdateNoteMutation).toHaveBeenCalledTimes(2)
    expect(toast.success).toHaveBeenCalledWith('Tag "old" renamed to "new"')
  })

  it('waits for the pending editor save before entering tag management', async () => {
    const note = makeNote({ tags: ['old'] })
    mockSelectedNote = note
    mockNotes = [note]
    mockIsEditing = true
    let resolveSave!: () => void
    const flush = jest.fn(() => new Promise<void>((resolve) => { resolveSave = resolve }))
    const { result } = setup()
    await waitFor(() => expect(result.current.workspaceHydrated).toBe(true))
    act(() => result.current.registerNoteEditorRef({ current: {
      flushPendingSave: flush,
      captureSession: () => ({
        draft: { title: 'Pending draft', description: 'Pending text', tags: 'old' },
        view: { scrollTop: 0 },
      }),
      scrollToChunk: jest.fn(),
    } }))
    let finished = false
    let transition!: Promise<boolean>
    act(() => { transition = result.current.prepareTagManagement().then((value) => { finished = true; return value }) })
    expect(flush).toHaveBeenCalledTimes(1)
    expect(finished).toBe(false)
    expect(result.current.tabs[0].draft.title).toBe('Pending draft')
    await act(async () => { resolveSave(); await transition })
    expect(finished).toBe(true)
  })
})

describe('Refresh preserves workspace drafts while removing saved hidden notes', () => {
  it.each(['dirty', 'saving', 'error', 'saved'] as const)(
    'reconciles a hidden tab with save state %s', async saveState => {
      window.sessionStorage.clear()
      mockSelectedNote = null
      mockIsEditing = false
      mockOfflineOverlay = []
      const note = makeNote()
      const state = createNoteWorkspaceState(() => 'editor-tab', 'user-1')
      const withNote = updateWorkspaceTab(state, state.activeTabId, {
        note, noteId: note.id, mode: 'editing', saveState,
        draft: { title: 'My local draft', description: '<p>Keep this text</p>', tags: '' },
      })
      const hiddenEditor = addWorkspaceTab(withNote, () => 'list-tab')
      window.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, serializeNoteWorkspaceState(hiddenEditor))
      mockGetNotes.mockResolvedValue({ notes: [], total: 0, hasMore: false })
      mockGetExistingNoteIds.mockResolvedValue([])
      mockLoadCachedNotes.mockResolvedValue([{ ...note, updatedAt: note.updated_at, status: 'synced' }])
      mockRemoveSyncedNotes.mockImplementation(async notes => notes.map((entry: { id: string }) => entry.id))
      const { result } = setup()
      await act(async () => result.current.refreshNotes(new AbortController().signal))
      const editor = result.current.tabs.find(tab => tab.id === 'editor-tab')
      if (saveState === 'saved') {
        expect(editor?.noteId).toBeNull()
        expect(editor?.draft.title).toBe('')
      } else {
        expect(editor?.noteId).toBe(note.id)
        expect(editor?.draft.description).toBe('<p>Keep this text</p>')
        expect(editor?.saveState).toBe(saveState)
      }
    },
  )
})
