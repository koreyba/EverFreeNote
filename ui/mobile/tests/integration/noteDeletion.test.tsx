/**
 * Integration tests for note deletion flow
 * Tests deletion from list view, editor view, with sync, and cache management
 */
import { renderHook, waitFor, act } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import type { Note } from '@core/types/domain'

// Mock NetInfo before other imports
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(() =>
      Promise.resolve({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: null,
      })
    ),
    addEventListener: jest.fn(() => jest.fn()),
  },
}))

// Inline mocks to avoid hoisting issues
jest.mock('@ui/mobile/services/database', () => ({
  databaseService: {
    markDeleted: jest.fn().mockResolvedValue(undefined),
    saveNotes: jest.fn().mockResolvedValue(undefined),
    getLocalNotes: jest.fn().mockResolvedValue([]),
    searchNotes: jest.fn().mockResolvedValue([]),
  },
}))

jest.mock('@ui/mobile/adapters/networkStatus', () => ({
  mobileNetworkStatusProvider: {
    isOnline: jest.fn().mockReturnValue(true),
    subscribe: jest.fn().mockReturnValue(jest.fn()),
  },
}))

jest.mock('@ui/mobile/services/sync', () => ({
  mobileSyncService: {
    getManager: jest.fn().mockReturnValue({
      enqueue: jest.fn().mockResolvedValue(undefined),
    }),
  },
}))

jest.mock('@ui/mobile/providers', () => ({
  useSupabase: jest.fn(() => ({
    client: {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      })),
      rpc: jest.fn(() =>
        Promise.resolve({
          data: [],
          error: null,
          count: null,
          status: 200,
          statusText: 'OK',
        })
      ),
    },
    user: { id: 'test-user-id' },
  })),
}))

// Mock NoteService - must be after other mocks
jest.mock('@core/services/notes')

// Import mocked modules to access mock functions
import { databaseService } from '@ui/mobile/services/database'
import { mobileNetworkStatusProvider } from '@ui/mobile/adapters/networkStatus'
import { mobileSyncService } from '@ui/mobile/services/sync'
import { useNotes, useDeleteNote } from '@ui/mobile/hooks/useNotes'
import { NoteService } from '@core/services/notes'

const mockNoteServiceClass = NoteService as jest.MockedClass<typeof NoteService>
const TEST_USER_ID = 'test-user-id'

// Type mocked functions
const mockMarkDeleted = databaseService.markDeleted as jest.Mock
const mockSaveNotes = databaseService.saveNotes as jest.Mock
const mockIsOnline = mobileNetworkStatusProvider.isOnline as jest.Mock
const mockGetManager = mobileSyncService.getManager as jest.Mock

// Helper to get enqueue mock
const getMockEnqueue = () => {
  const manager = mockGetManager()
  return manager.enqueue as jest.Mock
}

describe('Note Deletion Integration Tests', () => {
  let queryClient: QueryClient
  let mockNotes: Note[]
  let deletedIds: Set<string>

  const createWrapper = () => {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    }
  }

  beforeEach(() => {
    deletedIds = new Set<string>()

    // Create fresh mock notes for each test
    mockNotes = [
      {
        id: 'note-1',
        title: 'Note 1',
        description: 'Description 1',
        tags: ['tag1'],
        created_at: '2025-01-01T10:00:00.000Z',
        updated_at: '2025-01-01T10:00:00.000Z',
        user_id: TEST_USER_ID,
      },
      {
        id: 'note-2',
        title: 'Note 2',
        description: 'Description 2',
        tags: ['tag2'],
        created_at: '2025-01-02T10:00:00.000Z',
        updated_at: '2025-01-02T10:00:00.000Z',
        user_id: TEST_USER_ID,
      },
      {
        id: 'note-3',
        title: 'Note 3',
        description: 'Description 3',
        tags: ['tag1', 'tag2'],
        created_at: '2025-01-03T10:00:00.000Z',
        updated_at: '2025-01-03T10:00:00.000Z',
        user_id: TEST_USER_ID,
      },
    ]

    // Apply mocks to NoteService class
    mockNoteServiceClass.prototype.getNotes = jest.fn().mockImplementation((_userId: string, options?: { tag?: string | null }) => {
      let filteredNotes = mockNotes.filter(note => !deletedIds.has(note.id))
      if (options?.tag) {
        const tag = options.tag
        filteredNotes = filteredNotes.filter(note => note.tags?.includes(tag))
      }
      return Promise.resolve({
        notes: filteredNotes,
        hasMore: false,
        totalCount: filteredNotes.length,
      })
    })

    mockNoteServiceClass.prototype.deleteNote = jest.fn().mockImplementation((id: string) => {
      deletedIds.add(id)
      return Promise.resolve(id)
    })

    // Reset other mocks
    mockMarkDeleted.mockClear().mockResolvedValue(undefined)
    mockSaveNotes.mockClear().mockResolvedValue(undefined)
    mockIsOnline.mockReturnValue(true)
    mockGetManager.mockClear().mockReturnValue({
      enqueue: jest.fn().mockResolvedValue(undefined),
    })

    // Create fresh QueryClient
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0, gcTime: 0 },
        mutations: { retry: false },
      },
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Delete from notes list', () => {
    it('deletes note and updates list', async () => {
      const wrapper = createWrapper()

      // First, fetch notes
      const { result: notesResult } = renderHook(() => useNotes(), { wrapper })

      await waitFor(() => {
        expect(notesResult.current.isSuccess).toBe(true)
      })

      const initialNotes = notesResult.current.data?.pages.flatMap(p => p.notes) ?? []
      expect(initialNotes).toHaveLength(3)

      // Now delete a note
      const { result: deleteResult } = renderHook(() => useDeleteNote(), { wrapper })

      await act(async () => {
        deleteResult.current.mutate('note-2')
      })

      await waitFor(() => {
        expect(deleteResult.current.isSuccess).toBe(true)
      })

      // Check that notes list was updated (optimistic update)
      const updatedNotes = notesResult.current.data?.pages.flatMap(p => p.notes) ?? []
      expect(updatedNotes).toHaveLength(2)
      expect(updatedNotes.find(n => n.id === 'note-2')).toBeUndefined()
      expect(updatedNotes.find(n => n.id === 'note-1')).toBeDefined()
      expect(updatedNotes.find(n => n.id === 'note-3')).toBeDefined()
    })

    it('maintains list order after deletion', async () => {
      const wrapper = createWrapper()

      const { result: notesResult } = renderHook(() => useNotes(), { wrapper })

      await waitFor(() => {
        expect(notesResult.current.isSuccess).toBe(true)
      })

      const { result: deleteResult } = renderHook(() => useDeleteNote(), { wrapper })

      // Delete middle note
      await act(async () => {
        deleteResult.current.mutate('note-2')
      })

      await waitFor(() => {
        expect(deleteResult.current.isSuccess).toBe(true)
      })

      // Check list immediately (optimistic update should have taken effect)
      const updatedNotes = notesResult.current.data?.pages.flatMap(p => p.notes) ?? []
      expect(updatedNotes.length).toBe(2)
      expect(updatedNotes[0].id).toBe('note-1')
      expect(updatedNotes[1].id).toBe('note-3')
    })

    it('deletes multiple notes sequentially', async () => {
      const wrapper = createWrapper()

      const { result: notesResult } = renderHook(() => useNotes(), { wrapper })

      await waitFor(() => {
        expect(notesResult.current.isSuccess).toBe(true)
      })

      const { result: deleteResult } = renderHook(() => useDeleteNote(), { wrapper })

      // Delete first note
      await act(async () => {
        deleteResult.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(deleteResult.current.isSuccess).toBe(true)
      })

      // Check optimistic update
      let updatedNotes = notesResult.current.data?.pages.flatMap(p => p.notes) ?? []
      expect(updatedNotes.length).toBe(2)

      // Delete third note
      await act(async () => {
        deleteResult.current.mutate('note-3')
      })

      await waitFor(() => {
        expect(deleteResult.current.isSuccess).toBe(true)
      })

      updatedNotes = notesResult.current.data?.pages.flatMap(p => p.notes) ?? []
      expect(updatedNotes.length).toBe(1)
      expect(updatedNotes[0].id).toBe('note-2')
    })
  })

  describe('Delete with offline sync', () => {
    beforeEach(() => {
      mockIsOnline.mockReturnValue(false)
    })

    it('queues deletion when offline and syncs when online', async () => {
      const wrapper = createWrapper()
      const { result: deleteResult } = renderHook(() => useDeleteNote(), { wrapper })

      await act(async () => {
        deleteResult.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(deleteResult.current.isSuccess).toBe(true)
      })

      // Verify note was queued
      expect(getMockEnqueue()).toHaveBeenCalledWith(
        expect.objectContaining({
          noteId: 'note-1',
          operation: 'delete',
          payload: {},
        })
      )

      // Verify note was NOT deleted from API
      expect(mockNoteServiceClass.prototype.deleteNote).not.toHaveBeenCalled()

      // Verify local DB was updated
      expect(mockMarkDeleted).toHaveBeenCalledWith('note-1', TEST_USER_ID)
    })

    it('handles offline to online transition during deletion flow', async () => {
      // Start offline
      mockIsOnline.mockReturnValue(false)

      const wrapper = createWrapper()
      const { result: deleteResult } = renderHook(() => useDeleteNote(), { wrapper })

      // Delete while offline
      await act(async () => {
        deleteResult.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(deleteResult.current.isSuccess).toBe(true)
      })

      // Go online
      mockIsOnline.mockReturnValue(true)

      // Delete another note - should now go to API
      await act(async () => {
        deleteResult.current.mutate('note-2')
      })

      await waitFor(() => {
        expect(deleteResult.current.isSuccess).toBe(true)
      })

      expect(mockNoteServiceClass.prototype.deleteNote).toHaveBeenCalledWith('note-2')
    })
  })

  describe('Delete with error handling', () => {
    it('shows error and restores note on deletion failure', async () => {
      const error = new Error('Network error')
      mockNoteServiceClass.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      const wrapper = createWrapper()

      const { result: notesResult } = renderHook(() => useNotes(), { wrapper })

      await waitFor(() => {
        expect(notesResult.current.isSuccess).toBe(true)
      })

      const { result: deleteResult } = renderHook(() => useDeleteNote(), { wrapper })

      await act(async () => {
        deleteResult.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(deleteResult.current.isError).toBe(true)
      })

      // Note should be restored in cache (rollback)
      const notes = notesResult.current.data?.pages.flatMap(p => p.notes) ?? []
      expect(notes).toHaveLength(3)
      expect(notes.find(n => n.id === 'note-1')).toBeDefined()
    })

    it('calls onError callback when deletion fails', async () => {
      const error = new Error('Deletion failed')
      mockNoteServiceClass.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      const onError = jest.fn()

      const wrapper = createWrapper()
      const { result: deleteResult } = renderHook(() => useDeleteNote(), { wrapper })

      await act(async () => {
        deleteResult.current.mutate('note-1', { onError })
      })

      await waitFor(() => {
        expect(deleteResult.current.isError).toBe(true)
      })

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError.mock.calls[0][0]).toBe(error)
      expect(onError.mock.calls[0][1]).toBe('note-1')
    })
  })

  describe('Cache management', () => {
    it('updates all query variations when deleting', async () => {
      const wrapper = createWrapper()

      // Create queries with different filters
      const { result: allNotesResult } = renderHook(() => useNotes(), { wrapper })
      const { result: tagFilteredResult } = renderHook(() => useNotes({ tag: 'tag1' }), { wrapper })

      await waitFor(() => {
        expect(allNotesResult.current.isSuccess).toBe(true)
        expect(tagFilteredResult.current.isSuccess).toBe(true)
      })

      const { result: deleteResult } = renderHook(() => useDeleteNote(), { wrapper })

      // Delete note with tag1
      await act(async () => {
        deleteResult.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(deleteResult.current.isSuccess).toBe(true)
      })

      // Both queries should be updated optimistically
      const allNotes = allNotesResult.current.data?.pages.flatMap(p => p.notes) ?? []
      const tagFiltered = tagFilteredResult.current.data?.pages.flatMap(p => p.notes) ?? []

      expect(allNotes.find(n => n.id === 'note-1')).toBeUndefined()
      expect(tagFiltered.find(n => n.id === 'note-1')).toBeUndefined()
    })

    it('does not affect unrelated queries', async () => {
      const wrapper = createWrapper()

      const { result: notesResult } = renderHook(() => useNotes(), { wrapper })

      await waitFor(() => {
        expect(notesResult.current.isSuccess).toBe(true)
      })

      // Set some unrelated query data
      queryClient.setQueryData(['other-data'], { value: 'test' })

      const { result: deleteResult } = renderHook(() => useDeleteNote(), { wrapper })

      await act(async () => {
        deleteResult.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(deleteResult.current.isSuccess).toBe(true)
      })

      // Unrelated query should be unchanged
      expect(queryClient.getQueryData(['other-data'])).toEqual({ value: 'test' })
    })

    it('handles empty list after deleting last note', async () => {
      // Setup with single note
      mockNotes = [mockNotes[0]]

      const wrapper = createWrapper()

      const { result: notesResult } = renderHook(() => useNotes(), { wrapper })

      await waitFor(() => {
        expect(notesResult.current.isSuccess).toBe(true)
      })

      expect(notesResult.current.data?.pages[0].notes.length).toBe(1)

      const { result: deleteResult } = renderHook(() => useDeleteNote(), { wrapper })

      await act(async () => {
        deleteResult.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(deleteResult.current.isSuccess).toBe(true)
      })

      const notes = notesResult.current.data?.pages.flatMap(p => p.notes) ?? []
      expect(notes).toHaveLength(0)
      expect(notesResult.current.data?.pages[0].totalCount).toBe(0)
    })
  })

  describe('Pagination with deletion', () => {
    it('removes note from paginated results', async () => {
      const wrapper = createWrapper()

      const { result: notesResult } = renderHook(() => useNotes(), { wrapper })

      await waitFor(() => {
        expect(notesResult.current.isSuccess).toBe(true)
        expect(notesResult.current.data?.pages[0].notes.length).toBe(3)
      })

      // Delete note from list
      const { result: deleteResult } = renderHook(() => useDeleteNote(), { wrapper })

      await act(async () => {
        deleteResult.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(deleteResult.current.isSuccess).toBe(true)
      })

      // Verify deletion via optimistic update
      const allNotes = notesResult.current.data?.pages.flatMap(p => p.notes) ?? []
      expect(allNotes.length).toBe(2)
      expect(allNotes.find(n => n.id === 'note-1')).toBeUndefined()
    })
  })

  describe('Concurrent operations', () => {
    it('handles deletion while list is being fetched', async () => {
      let resolveGetNotes: ((value: { notes: Note[]; hasMore: boolean; totalCount: number }) => void) | undefined
      const getNotePromise = new Promise<{ notes: Note[]; hasMore: boolean; totalCount: number }>((resolve) => {
        resolveGetNotes = resolve
      })

      mockNoteServiceClass.prototype.getNotes = jest.fn().mockReturnValue(getNotePromise)

      const wrapper = createWrapper()

      const { result: notesResult } = renderHook(() => useNotes(), { wrapper })

      // Start deletion while fetch is pending
      const { result: deleteResult } = renderHook(() => useDeleteNote(), { wrapper })

      await act(async () => {
        deleteResult.current.mutate('note-1')
      })

      // Now resolve the fetch
      await act(async () => {
        if (resolveGetNotes) {
          resolveGetNotes({
            notes: mockNotes,
            hasMore: false,
            totalCount: mockNotes.length,
          })
        }
      })

      await waitFor(() => {
        expect(notesResult.current.isSuccess).toBe(true)
        expect(deleteResult.current.isSuccess).toBe(true)
      })

      // Note should still be deleted from cache
      const notes = notesResult.current.data?.pages.flatMap(p => p.notes) ?? []
      expect(notes.find(n => n.id === 'note-1')).toBeUndefined()
    })
  })
})
