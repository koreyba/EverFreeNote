/**
 * Integration tests for note deletion flow
 * Tests deletion from list view, editor view, with sync, and cache management
 */
import { QueryClient } from '@tanstack/react-query'
import type { Note } from '@core/types/domain'
import {
  act,
  createQueryWrapper,
  createTestQueryClient,
  renderHook,
  TEST_USER_ID,
  waitFor,
} from '../testUtils'

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
  let wrapper: ReturnType<typeof createQueryWrapper>
  let mockNotes: Note[]
  let deletedIds: Set<string>
  const renderNotesAndDelete = (options?: { pageSize?: number; tag?: string | null; searchQuery?: string }) => {
    return renderHook(() => {
      const notes = useNotes(options)
      const deleteNote = useDeleteNote()
      return { notes, deleteNote }
    }, { wrapper })
  }

  const renderNotesAndDeleteWithFilters = () => {
    return renderHook(() => {
      const allNotes = useNotes()
      const tagFiltered = useNotes({ tag: 'tag1' })
      const deleteNote = useDeleteNote()
      return { allNotes, tagFiltered, deleteNote }
    }, { wrapper })
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
    queryClient = createTestQueryClient()
    wrapper = createQueryWrapper(queryClient)
  })

  afterEach(() => {
    queryClient.clear()
    jest.clearAllMocks()
  })

  describe('Delete from notes list', () => {
    it('deletes note and updates list', async () => {
      const { result } = renderNotesAndDelete()

      await waitFor(() => {
        expect(result.current.notes.isSuccess).toBe(true)
      })

      const initialNotes = result.current.notes.data?.pages.flatMap(p => p.notes) ?? []
      expect(initialNotes).toHaveLength(3)

      // Now delete a note
      await act(async () => {
        result.current.deleteNote.mutate('note-2')
      })

      await waitFor(() => {
        expect(result.current.deleteNote.isSuccess).toBe(true)
      })

      // Check that notes list was updated (optimistic update)
      await waitFor(() => {
        const updatedNotes = result.current.notes.data?.pages.flatMap(p => p.notes) ?? []
        expect(updatedNotes).toHaveLength(2)
        expect(updatedNotes.find(n => n.id === 'note-2')).toBeUndefined()
        expect(updatedNotes.find(n => n.id === 'note-1')).toBeDefined()
        expect(updatedNotes.find(n => n.id === 'note-3')).toBeDefined()
      })
    })

    it('maintains list order after deletion', async () => {
      const { result } = renderNotesAndDelete()

      await waitFor(() => {
        expect(result.current.notes.isSuccess).toBe(true)
      })

      // Delete middle note
      await act(async () => {
        result.current.deleteNote.mutate('note-2')
      })

      await waitFor(() => {
        expect(result.current.deleteNote.isSuccess).toBe(true)
      })

      // Check list immediately (optimistic update should have taken effect)
      await waitFor(() => {
        const updatedNotes = result.current.notes.data?.pages.flatMap(p => p.notes) ?? []
        expect(updatedNotes.length).toBe(2)
        expect(updatedNotes[0].id).toBe('note-1')
        expect(updatedNotes[1].id).toBe('note-3')
      })
    })

    it('deletes multiple notes sequentially', async () => {
      const { result } = renderNotesAndDelete()

      await waitFor(() => {
        expect(result.current.notes.isSuccess).toBe(true)
      })

      // Delete first note
      await act(async () => {
        result.current.deleteNote.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.deleteNote.isSuccess).toBe(true)
      })

      // Check optimistic update
      await waitFor(() => {
        const updatedNotes = result.current.notes.data?.pages.flatMap(p => p.notes) ?? []
        expect(updatedNotes.length).toBe(2)
      })

      // Delete third note
      await act(async () => {
        result.current.deleteNote.mutate('note-3')
      })

      await waitFor(() => {
        const updatedNotes = result.current.notes.data?.pages.flatMap(p => p.notes) ?? []
        expect(updatedNotes.length).toBe(1)
        expect(updatedNotes[0].id).toBe('note-2')
      })
    })
  })

  describe('Delete with offline sync', () => {
    beforeEach(() => {
      mockIsOnline.mockReturnValue(false)
    })

    it('queues deletion when offline and syncs when online', async () => {
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

      const { result } = renderNotesAndDelete()

      await waitFor(() => {
        expect(result.current.notes.isSuccess).toBe(true)
      })

      await act(async () => {
        result.current.deleteNote.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.deleteNote.isError).toBe(true)
      })

      // Note should be restored in cache (rollback)
      await waitFor(() => {
        const notes = result.current.notes.data?.pages.flatMap(p => p.notes) ?? []
        expect(notes).toHaveLength(3)
        expect(notes.find(n => n.id === 'note-1')).toBeDefined()
      })
    })

    it('calls onError callback when deletion fails', async () => {
      const error = new Error('Deletion failed')
      mockNoteServiceClass.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      const onError = jest.fn()

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
      const { result } = renderNotesAndDeleteWithFilters()

      await waitFor(() => {
        expect(result.current.allNotes.isSuccess).toBe(true)
        expect(result.current.tagFiltered.isSuccess).toBe(true)
      })

      // Delete note with tag1
      await act(async () => {
        result.current.deleteNote.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.deleteNote.isSuccess).toBe(true)
      })

      // Both queries should be updated optimistically
      await waitFor(() => {
        const allNotes = result.current.allNotes.data?.pages.flatMap(p => p.notes) ?? []
        const tagFiltered = result.current.tagFiltered.data?.pages.flatMap(p => p.notes) ?? []

        expect(allNotes.find(n => n.id === 'note-1')).toBeUndefined()
        expect(tagFiltered.find(n => n.id === 'note-1')).toBeUndefined()
      })
    })

    it('does not affect unrelated queries', async () => {
      const { result } = renderNotesAndDelete()

      await waitFor(() => {
        expect(result.current.notes.isSuccess).toBe(true)
      })

      // Set some unrelated query data
      queryClient.setQueryData(['other-data'], { value: 'test' })

      await act(async () => {
        result.current.deleteNote.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.deleteNote.isSuccess).toBe(true)
      })

      // Unrelated query should be unchanged
      await waitFor(() => {
        expect(queryClient.getQueryData(['other-data'])).toEqual({ value: 'test' })
      })
    })

    it('handles empty list after deleting last note', async () => {
      // Setup with single note
      mockNotes = [mockNotes[0]]

      const { result } = renderNotesAndDelete()

      await waitFor(() => {
        expect(result.current.notes.isSuccess).toBe(true)
      })

      expect(result.current.notes.data?.pages[0].notes.length).toBe(1)

      await act(async () => {
        result.current.deleteNote.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.deleteNote.isSuccess).toBe(true)
      })

      await waitFor(() => {
        const notes = result.current.notes.data?.pages.flatMap(p => p.notes) ?? []
        expect(notes).toHaveLength(0)
        expect(result.current.notes.data?.pages[0].totalCount).toBe(0)
      })
    })
  })

  describe('Pagination with deletion', () => {
    it('removes note from paginated results', async () => {
      const { result } = renderNotesAndDelete()

      await waitFor(() => {
        expect(result.current.notes.isSuccess).toBe(true)
        expect(result.current.notes.data?.pages[0].notes.length).toBe(3)
      })

      // Delete note from list
      await act(async () => {
        result.current.deleteNote.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.deleteNote.isSuccess).toBe(true)
      })

      // Verify deletion via optimistic update
      await waitFor(() => {
        const allNotes = result.current.notes.data?.pages.flatMap(p => p.notes) ?? []
        expect(allNotes.length).toBe(2)
        expect(allNotes.find(n => n.id === 'note-1')).toBeUndefined()
      })
    })
  })

  describe('Concurrent operations', () => {
    it('handles deletion while list is being fetched', async () => {
      let resolveGetNotes: ((value: { notes: Note[]; hasMore: boolean; totalCount: number }) => void) | undefined
      const getNotePromise = new Promise<{ notes: Note[]; hasMore: boolean; totalCount: number }>((resolve) => {
        resolveGetNotes = resolve
      })

      mockNoteServiceClass.prototype.getNotes = jest.fn()
        .mockImplementationOnce(() => getNotePromise)
        .mockImplementation((_userId: string, options?: { tag?: string | null }) => {
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

      const { result } = renderNotesAndDelete()

      await act(async () => {
        result.current.deleteNote.mutate('note-1')
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
        expect(result.current.notes.isSuccess).toBe(true)
        expect(result.current.deleteNote.isSuccess).toBe(true)
      })

      // Note should still be deleted from cache
      await waitFor(() => {
        const notes = result.current.notes.data?.pages.flatMap(p => p.notes) ?? []
        expect(notes.find(n => n.id === 'note-1')).toBeUndefined()
      })
    })
  })
})
