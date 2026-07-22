import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import type { NoteViewModel, SearchResult } from '@core/types/domain'

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
const mockClearActiveSettingsNoteReturnPath = jest.fn()
const mockResolveSearchResult = jest.fn(() => mockResolvedSearchResult)

jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }))
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
  useUpdateNote: () => ({ mutateAsync: jest.fn() }),
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
    handleAutoSave: jest.fn(),
    handleSaveNote: jest.fn(),
    handleReadNote: jest.fn(),
    confirmDeleteNote: jest.fn(),
    handleRemoveTagFromNote: jest.fn(),
  }),
}))
jest.mock('@ui/web/hooks/useNoteBulkActions', () => ({
  useNoteBulkActions: () => ({
    selectAllVisible: jest.fn(),
    deleteSelectedNotes: jest.fn(),
    deleteNotesByIds: jest.fn(),
  }),
}))
jest.mock('@ui/web/hooks/useNoteSearch', () => ({
  useNoteSearch: () => ({
    searchQuery: 'initial search',
    filterByTag: 'initial-tag',
    isSearchPanelOpen: true,
    setIsSearchPanelOpen: jest.fn(),
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
  }),
}))

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
    mockSelectedNote = null
    mockIsEditing = true
    mockIsOffline = false
    mockOfflineOverlay = []
    mockNotes = []
    mockResolvedSearchResult = null
  })

  it('flushes pending editor work before creating a note and captures the current UI state', async () => {
    const note = makeNote()
    mockSelectedNote = note
    mockNotes = [note]
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
      selectedNoteId: note.id,
      selectedNote: note,
      isEditing: true,
      isSearchPanelOpen: true,
      searchQuery: 'initial search',
      filterByTag: 'initial-tag',
    })
    expect(flushPendingSave).toHaveBeenCalledTimes(2)
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
      await result.current.handleSelectNote(current)
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
})
