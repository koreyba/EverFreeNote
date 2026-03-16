import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { toast } from 'sonner'
import type { NoteViewModel } from '@core/types/domain'

// ---------------------------------------------------------------------------
// Mutable per-test state (variables prefixed with `mock` are hoisted by
// babel-jest above jest.mock calls, so the mock factories can reference them).
// ---------------------------------------------------------------------------

let mockIsOffline = false
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockOfflineOverlay: any[] = []

// ---------------------------------------------------------------------------
// Shared mock function references
// ---------------------------------------------------------------------------

const mockGetNoteStatus = jest.fn()
const mockHandleSelectNote = jest.fn()
const mockHandleEditNoteRaw = jest.fn()
const mockDeleteNoteFromCache = jest.fn().mockResolvedValue(undefined)
const mockSetOfflineOverlay = jest.fn()

// ---------------------------------------------------------------------------
// Module mocks — organised by layer
// ---------------------------------------------------------------------------

jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }))

jest.mock('@core/services/notes', () => ({
  NoteService: jest.fn().mockImplementation(() => ({
    getNoteStatus: mockGetNoteStatus,
    getNote: jest.fn(),
  })),
}))

jest.mock('@ui/web/providers/SupabaseProvider', () => ({
  useSupabase: () => ({ supabase: {} }),
}))

// --- Sub-hooks ---

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
    selectedNote: null,
    setSelectedNote: jest.fn(),
    isEditing: false,
    setIsEditing: jest.fn(),
    deleteDialogOpen: false,
    setDeleteDialogOpen: jest.fn(),
    noteToDelete: null,
    setNoteToDelete: jest.fn(),
    selectedNoteIds: new Set(),
    selectionMode: false,
    bulkDeleting: false,
    setBulkDeleting: jest.fn(),
    handleSelectNote: mockHandleSelectNote,
    handleSearchResultClick: jest.fn(),
    handleEditNote: mockHandleEditNoteRaw,
    handleCreateNote: jest.fn(),
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
    setOfflineOverlay: mockSetOfflineOverlay,
    pendingCount: 0,
    setPendingCount: jest.fn(),
    failedCount: 0,
    setFailedCount: jest.fn(),
    isOffline: mockIsOffline,
    lastSavedAt: null,
    setLastSavedAt: jest.fn(),
    offlineCache: {
      deleteNote: mockDeleteNoteFromCache,
      loadNotes: jest.fn().mockResolvedValue([]),
      saveNote: jest.fn(),
    },
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
    notes: [],
    resolveSearchResult: jest.fn((r: unknown) => r),
    mergedFtsData: [],
    notesDisplayed: 0,
    notesTotal: 0,
    selectedCount: 0,
    notesRef: { current: [] },
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
    searchQuery: '',
    filterByTag: null,
    isSearchPanelOpen: false,
    setIsSearchPanelOpen: jest.fn(),
    handleSearch: jest.fn(),
    handleTagClick: jest.fn(),
    handleClearTagFilter: jest.fn(),
    showFTSResults: false,
    aggregatedFtsData: [],
    ftsObserverTarget: { current: null },
    ftsHasMore: false,
    ftsLoadingMore: false,
    ftsAccumulatedResults: [],
    loadMoreFts: jest.fn(),
    ftsSearchResult: null,
    resetFtsResults: jest.fn(),
    showTagOnlyResults: false,
    tagOnlyResults: [],
    tagOnlyTotal: 0,
    tagOnlyLoading: false,
    tagOnlyHasMore: false,
    tagOnlyLoadingMore: false,
    loadMoreTagOnly: jest.fn(),
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeNote = (overrides?: Partial<NoteViewModel>): NoteViewModel => ({
  id: 'note-1',
  title: 'Local Title',
  description: 'Local content',
  tags: ['tag1'],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  user_id: 'user-1',
  ...overrides,
})

let testQueryClient: QueryClient

function createWrapper() {
  testQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
    )
  }
}

// ---------------------------------------------------------------------------
// Tests — only resolveOpenableNote & wrappedHandleEditNote navigation.
// Save/sync upsert logic is tested in useNoteSaveHandlers and useNoteSync.
// ---------------------------------------------------------------------------

describe('useNoteAppController — remote delete consistency', () => {
  beforeEach(() => {
    mockIsOffline = false
    mockOfflineOverlay = []
    mockGetNoteStatus.mockReset()
  })

  // -----------------------------------------------------------------------
  // resolveOpenableNote (tested through wrappedHandleSelectNote)
  // -----------------------------------------------------------------------
  describe('resolveOpenableNote via handleSelectNote', () => {
    it('online + note found on server → selects the merged note', async () => {
      const note = makeNote()
      const remoteNote = {
        ...note,
        title: 'Remote Title',
        updated_at: '2024-06-01T00:00:00Z',
      }
      mockGetNoteStatus.mockResolvedValue({ status: 'found', note: remoteNote })

      const { result } = renderHook(() => useNoteAppController(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.handleSelectNote(note)
      })

      expect(mockGetNoteStatus).toHaveBeenCalledWith('note-1')
      expect(mockHandleSelectNote).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Remote Title' }),
      )
    })

    it('online + note not_found → toast, cache cleanup, query invalidation, no selection', async () => {
      const note = makeNote()
      mockGetNoteStatus.mockResolvedValue({ status: 'not_found' })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useNoteAppController(), { wrapper })

      const invalidateSpy = jest
        .spyOn(testQueryClient, 'invalidateQueries')
        .mockResolvedValue(undefined)

      await act(async () => {
        await result.current.handleSelectNote(note)
      })

      expect(toast.error).toHaveBeenCalledWith(
        'This note was deleted on another device.',
      )
      expect(mockDeleteNoteFromCache).toHaveBeenCalledWith('note-1')
      expect(mockSetOfflineOverlay).toHaveBeenCalledWith(expect.any(Function))
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notes'] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['aiSearch'] })
      expect(mockHandleSelectNote).not.toHaveBeenCalled()
    })

    it('offline → bypasses server check and selects the note', async () => {
      mockIsOffline = true
      const note = makeNote()

      const { result } = renderHook(() => useNoteAppController(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.handleSelectNote(note)
      })

      expect(mockGetNoteStatus).not.toHaveBeenCalled()
      expect(mockHandleSelectNote).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'note-1' }),
      )
    })

    it('pending local writes → bypasses server check and selects the note', async () => {
      mockOfflineOverlay = [
        { id: 'note-1', status: 'pending', updatedAt: '2024-01-01T00:00:00Z' },
      ]
      const note = makeNote()

      const { result } = renderHook(() => useNoteAppController(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.handleSelectNote(note)
      })

      expect(mockGetNoteStatus).not.toHaveBeenCalled()
      expect(mockHandleSelectNote).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'note-1' }),
      )
    })
  })

  // -----------------------------------------------------------------------
  // wrappedHandleEditNote (the fix: handleSelectNote(null) on deleted note)
  // -----------------------------------------------------------------------
  describe('wrappedHandleEditNote', () => {
    it('note deleted remotely → clears selection via handleSelectNote(null)', async () => {
      const note = makeNote()
      mockGetNoteStatus.mockResolvedValue({ status: 'not_found' })

      const { result } = renderHook(() => useNoteAppController(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.handleEditNote(note)
      })

      expect(mockHandleSelectNote).toHaveBeenCalledWith(null)
      expect(mockHandleEditNoteRaw).not.toHaveBeenCalled()
    })

    it('note found on server → enters edit mode', async () => {
      const note = makeNote()
      const remoteNote = { ...note, updated_at: '2024-06-01T00:00:00Z' }
      mockGetNoteStatus.mockResolvedValue({ status: 'found', note: remoteNote })

      const { result } = renderHook(() => useNoteAppController(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.handleEditNote(note)
      })

      expect(mockHandleEditNoteRaw).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'note-1' }),
      )
      expect(mockHandleSelectNote).not.toHaveBeenCalled()
    })
    it('ignores stale edit resolution when a newer edit request finishes first', async () => {
      const first = makeNote({ id: 'note-a', title: 'Note A' })
      const second = makeNote({ id: 'note-b', title: 'Note B' })

      let resolveFirst: ((value: unknown) => void) | undefined
      let resolveSecond: ((value: unknown) => void) | undefined

      mockGetNoteStatus.mockImplementation((id: string) => new Promise((resolve) => {
        if (id === 'note-a') {
          resolveFirst = resolve
          return
        }

        resolveSecond = resolve
      }))

      const { result } = renderHook(() => useNoteAppController(), {
        wrapper: createWrapper(),
      })

      let firstPromise: Promise<void> | undefined
      let secondPromise: Promise<void> | undefined

      await act(async () => {
        firstPromise = result.current.handleEditNote(first)
        secondPromise = result.current.handleEditNote(second)
      })

      await act(async () => {
        resolveSecond?.({ status: 'found', note: second })
        await secondPromise
      })

      await act(async () => {
        resolveFirst?.({ status: 'found', note: first })
        await firstPromise
      })

      expect(mockHandleEditNoteRaw).toHaveBeenCalledTimes(1)
      expect(mockHandleEditNoteRaw).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'note-b' }),
      )
    })
  })
})
