/**
 * Hook tests for useDeleteNote
 * Tests online/offline modes, optimistic updates, error handling, and cache invalidation
 */
import { renderHook, waitFor, act } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import React from 'react'

// Mock NetInfo BEFORE other imports
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

// Mocks defined inline to avoid hoisting issues
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
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      })),
    },
    user: { id: 'test-user-id' },
  })),
}))

jest.mock('@core/services/notes')

// Import mocked modules to get access to mock functions
import { databaseService } from '@ui/mobile/services/database'
import { mobileNetworkStatusProvider } from '@ui/mobile/adapters/networkStatus'
import { mobileSyncService } from '@ui/mobile/services/sync'
import { useDeleteNote } from '@ui/mobile/hooks/useNotes'
import { NoteService } from '@core/services/notes'

const mockNoteService = NoteService as jest.MockedClass<typeof NoteService>
const TEST_USER_ID = 'test-user-id'

// Type the mocked functions
const mockMarkDeleted = databaseService.markDeleted as jest.Mock
const mockSaveNotes = databaseService.saveNotes as jest.Mock
const mockGetLocalNotes = databaseService.getLocalNotes as jest.Mock
const mockIsOnline = mobileNetworkStatusProvider.isOnline as jest.Mock
const mockGetManager = mobileSyncService.getManager as jest.Mock

// Helper to get the enqueue mock from the current getManager mock
const getMockEnqueue = () => {
  const manager = mockGetManager()
  return manager.enqueue as jest.Mock
}

type NotesPage = {
  notes: Array<{ id: string; title: string; description: string; tags: string[]; created_at: string; updated_at: string; user_id: string }>
  totalCount: number
  hasMore: boolean
  nextCursor?: number
}

describe('useDeleteNote', () => {
  let queryClient: QueryClient

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
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0, gcTime: 0 },
        mutations: { retry: false },
      },
    })

    // Reset all mocks
    mockMarkDeleted.mockClear().mockResolvedValue(undefined)
    mockSaveNotes.mockClear().mockResolvedValue(undefined)
    mockGetLocalNotes.mockClear().mockResolvedValue([])
    mockIsOnline.mockReturnValue(true)
    mockGetManager.mockClear().mockReturnValue({
      enqueue: jest.fn().mockResolvedValue(undefined),
    })

    // Reset NoteService mock
    mockNoteService.prototype.deleteNote = jest.fn().mockImplementation((id: string) => Promise.resolve(id))

    // Reset Supabase mock
    const { useSupabase } = require('@ui/mobile/providers')
    useSupabase.mockReturnValue({
      client: {
        from: jest.fn(() => ({
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      },
      user: { id: TEST_USER_ID },
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Online deletion', () => {
    it('deletes note successfully when online', async () => {
      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockMarkDeleted).toHaveBeenCalledWith('note-1', TEST_USER_ID)
      expect(mockNoteService.prototype.deleteNote).toHaveBeenCalledWith('note-1')
      expect(result.current.data).toBe('note-1')
    })

    it('calls database service before API call', async () => {
      const callOrder: string[] = []

      mockMarkDeleted.mockImplementation(async () => {
        callOrder.push('markDeleted')
      })

      mockNoteService.prototype.deleteNote = jest.fn().mockImplementation(async (id: string) => {
        callOrder.push('deleteNote')
        return id
      })

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(callOrder).toEqual(['markDeleted', 'deleteNote'])
    })

    it('handles deletion error from API', async () => {
      const error = new Error('API deletion failed')
      mockNoteService.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBe(error)
    })
  })

  describe('Offline deletion', () => {
    beforeEach(() => {
      mockIsOnline.mockReturnValue(false)
    })

    it('queues deletion when offline', async () => {
      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockMarkDeleted).toHaveBeenCalledWith('note-1', TEST_USER_ID)
      expect(mockNoteService.prototype.deleteNote).not.toHaveBeenCalled()
      expect(getMockEnqueue()).toHaveBeenCalledWith(
        expect.objectContaining({
          noteId: 'note-1',
          operation: 'delete',
          payload: {},
        })
      )
      expect(result.current.data).toBe('note-1')
    })

    it('marks note as deleted in local database when offline', async () => {
      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockMarkDeleted).toHaveBeenCalledWith('note-1', TEST_USER_ID)
    })

    it('handles queue enqueue error when offline', async () => {
      const error = new Error('Queue full')
      mockGetManager.mockReturnValue({
        enqueue: jest.fn().mockRejectedValue(error),
      })

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBe(error)
    })
  })

  describe('Optimistic updates', () => {
    // Note: Optimistic update cache behavior is tested in integration tests
    // which use actual components with active query observers.
    // Here we test that the hook properly cancels queries and returns context.

    it('cancels in-flight queries on mutate', async () => {
      const cancelQueriesSpy = jest.spyOn(queryClient, 'cancelQueries')

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(cancelQueriesSpy).toHaveBeenCalledWith({ queryKey: ['notes'] })
    })

    it('succeeds even when no cache data exists', async () => {
      // No cache data set - mutation should still work

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockNoteService.prototype.deleteNote).toHaveBeenCalledWith('note-1')
      expect(result.current.data).toBe('note-1')
    })

    it('returns previous notes snapshot in onMutate context', async () => {
      const getQueriesDataSpy = jest.spyOn(queryClient, 'getQueriesData')

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Verify getQueriesData was called to snapshot previous state
      expect(getQueriesDataSpy).toHaveBeenCalledWith({ queryKey: ['notes'] })
    })
  })

  describe('Error recovery', () => {
    it('rolls back optimistic update on error', async () => {
      const error = new Error('Deletion failed')
      mockNoteService.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      const initialData: InfiniteData<NotesPage> = {
        pages: [
          {
            notes: [
              { id: 'note-1', title: 'Note 1', description: '', tags: [], created_at: '2025-01-01', updated_at: '2025-01-01', user_id: TEST_USER_ID },
              { id: 'note-2', title: 'Note 2', description: '', tags: [], created_at: '2025-01-01', updated_at: '2025-01-01', user_id: TEST_USER_ID },
            ],
            totalCount: 2,
            hasMore: false,
          },
        ],
        pageParams: [0],
      }

      queryClient.setQueryData(['notes', TEST_USER_ID, { pageSize: 50, tag: null, searchQuery: '' }], initialData)

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      // Cache should be rolled back to original state
      const cacheData = queryClient.getQueryData<InfiniteData<NotesPage>>([
        'notes',
        TEST_USER_ID,
        { pageSize: 50, tag: null, searchQuery: '' },
      ])

      expect(cacheData?.pages[0].notes).toHaveLength(2)
      expect(cacheData?.pages[0].totalCount).toBe(2)
      expect(cacheData?.pages[0].notes.find(n => n.id === 'note-1')).toBeDefined()
    })

    it('invalidates queries on error', async () => {
      const error = new Error('Deletion failed')
      mockNoteService.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notes'] })
    })

    it('does not invalidate queries on success', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).not.toHaveBeenCalled()
    })
  })

  describe('Authentication', () => {
    it('throws error when user is not authenticated', async () => {
      const { useSupabase } = require('@ui/mobile/providers')
      useSupabase.mockReturnValue({
        client: {},
        user: null,
      })

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('note-1')
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(new Error('User not authenticated'))
    })
  })

  describe('Multiple pages handling', () => {
    it('removes note from correct page in multi-page cache', async () => {
      const initialData: InfiniteData<NotesPage> = {
        pages: [
          {
            notes: [
              { id: 'note-1', title: 'Note 1', description: '', tags: [], created_at: '2025-01-01', updated_at: '2025-01-01', user_id: TEST_USER_ID },
              { id: 'note-2', title: 'Note 2', description: '', tags: [], created_at: '2025-01-01', updated_at: '2025-01-01', user_id: TEST_USER_ID },
            ],
            totalCount: 4,
            hasMore: true,
            nextCursor: 1,
          },
          {
            notes: [
              { id: 'note-3', title: 'Note 3', description: '', tags: [], created_at: '2025-01-01', updated_at: '2025-01-01', user_id: TEST_USER_ID },
              { id: 'note-4', title: 'Note 4', description: '', tags: [], created_at: '2025-01-01', updated_at: '2025-01-01', user_id: TEST_USER_ID },
            ],
            totalCount: 4,
            hasMore: false,
          },
        ],
        pageParams: [0, 1],
      }

      queryClient.setQueryData(['notes', TEST_USER_ID, { pageSize: 50, tag: null, searchQuery: '' }], initialData)

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('note-3') // Note in second page
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const cacheData = queryClient.getQueryData<InfiniteData<NotesPage>>([
        'notes',
        TEST_USER_ID,
        { pageSize: 50, tag: null, searchQuery: '' },
      ])

      expect(cacheData?.pages[0].notes).toHaveLength(2) // First page unchanged
      expect(cacheData?.pages[1].notes).toHaveLength(1) // Second page has one less
      expect(cacheData?.pages[1].notes.find(n => n.id === 'note-3')).toBeUndefined()
      expect(cacheData?.pages[0].totalCount).toBe(3) // totalCount decremented on all pages
      expect(cacheData?.pages[1].totalCount).toBe(3)
    })
  })

  describe('Callback handlers', () => {
    it('calls onSuccess callback when provided', async () => {
      const onSuccess = jest.fn()

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('note-1', { onSuccess })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(onSuccess).toHaveBeenCalledWith('note-1', 'note-1', expect.anything())
    })

    it('calls onError callback when provided', async () => {
      const error = new Error('Deletion failed')
      const onError = jest.fn()

      mockNoteService.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        result.current.mutate('note-1', { onError })
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError.mock.calls[0][0]).toBe(error)
      expect(onError.mock.calls[0][1]).toBe('note-1')
    })
  })
})
