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
} from '@core/services/noteWorkspaceTabs'
import { NOTE_WORKSPACE_STORAGE_KEY } from '@ui/web/lib/noteWorkspaceStorage'
import { toast } from 'sonner'

let mockSelectedNote: NoteViewModel | null = null
let mockIsEditing = true
let mockIsOffline = false
let mockOfflineOverlay: Array<{ id: string; status: string }> = []
let mockNotes: NoteViewModel[] = []
let mockResolvedSearchResult: NoteViewModel | null = null

const mockGetNoteStatus = jest.fn()
const mockGetNote = jest.fn()
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

jest.mock('sonner', () => ({ toast: { error: jest.fn(), info: jest.fn(), success: jest.fn() } }))
jest.mock('@ui/web/providers/SupabaseProvider', () => ({
  useSupabase: () => ({ supabase: { key: 'supabase' } }),
}))
jest.mock('@core/services/notes', () => ({
  NoteService: jest.fn().mockImplementation(() => ({
    getNoteStatus: mockGetNoteStatus,
    getNote: mockGetNote,
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
    user: { id: 'user-1' },
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
    noteToDelete: null,
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
    offlineCache: { deleteNote: jest.fn(), loadNotes: jest.fn(), saveNote: jest.fn() },
    enqueueMutation: jest.fn(),
    enqueueBatchAndDrainIfOnline: jest.fn(),
    offlineQueueRef: { current: { getQueue: jest.fn().mockResolvedValue([]) } },
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
    data: { pages: [] },
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
    confirmDeleteNote: jest.fn(),
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
    mockResolvedSearchResult = null
    mockHandleAutoSave.mockReset().mockResolvedValue(undefined)
    mockHandleSaveNote.mockReset().mockResolvedValue(undefined)
    mockHandleReadNote.mockReset().mockResolvedValue(undefined)
    mockUpdateNoteMutation.mockReset()
    mockUpdateNoteMutation.mockResolvedValue(undefined)
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

    await act(async () => {
      await result.current.addTab()
    })

    expect(result.current.activeTab.note).toBeNull()
    expect(result.current.notePaneVisible).toBe(false)
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

  it('blocks controller Add tab before flushing when the shared workspace limit is reached', async () => {
    let nextId = 0
    let state = createNoteWorkspaceState(() => `tab-${nextId++}`)
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
    expect(toast.info).toHaveBeenCalledWith('No empty or duplicate tags found to clean')
    expect(mockUpdateNoteMutation).not.toHaveBeenCalled()
    unmount()

    const firstNote = makeNote({ id: 'first', tags: ['old'] })
    const secondNote = makeNote({ id: 'second', tags: ['old'] })
    mockNotes = [firstNote, secondNote]
    mockUpdateNoteMutation
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('write failed'))
      .mockResolvedValueOnce(undefined)

    const rerendered = setup()
    await act(async () => {
      await rerendered.result.current.handleRenameTag('old', 'new')
    })

    expect(toast.error).toHaveBeenCalledWith('Failed to rename tag: write failed')
    expect(mockUpdateNoteMutation).toHaveBeenCalledWith(expect.objectContaining({
      id: 'first',
      tags: ['old'],
    }))
  })

  it('routes tag changes through the offline queue when offline', async () => {
    mockIsOffline = true
    const firstNote = makeNote({ id: 'first', tags: ['old'] })
    mockNotes = [firstNote]
    const { result } = setup()

    await act(async () => {
      await result.current.handleRenameTag('old', 'new')
    })

    expect(mockPersistOfflineNoteUpdates).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'first', tags: ['new'] }),
    ])
    expect(mockUpdateNoteMutation).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Tag "old" renamed to "new"')
  })
})

