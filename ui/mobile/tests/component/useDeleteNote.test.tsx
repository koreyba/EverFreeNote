// Mock dependencies BEFORE imports
jest.mock('@ui/mobile/services/database')
jest.mock('@core/services/notes')
jest.mock('@ui/mobile/services/sync')
jest.mock('@ui/mobile/adapters/networkStatus', () => ({
  networkStatusAdapter: {
    isOnline: jest.fn(() => true),
    subscribe: jest.fn(() => jest.fn()),
  },
}))
jest.mock('@ui/mobile/providers', () => ({
  useSupabase: jest.fn(() => ({
    client: {},
    user: { id: 'test-user-id' },
  })),
}))

// Types for cache data
type Note = { id: string; title: string; content: string }
type NotesPage = { notes: Note[]; hasMore: boolean; totalCount: number }
type NotesCacheData = { pages: NotesPage[]; pageParams: unknown[] }

// Mock the dynamic import of netinfo
const mockNetInfo = {
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
    })
  ),
  addEventListener: jest.fn(() => jest.fn()),
}

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: mockNetInfo,
}))

// Override dynamic import
jest.mock('../../hooks/useNotes', () => {
  const originalModule = jest.requireActual('../../hooks/useNotes')
  return {
    ...originalModule,
  }
})

import { renderHook, act } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useDeleteNote } from '@ui/mobile/hooks/useNotes'
import { databaseService } from '@ui/mobile/services/database'
import { NoteService } from '@core/services/notes'
import { mobileSyncService } from '@ui/mobile/services/sync'

const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>
const mockNoteService = NoteService as jest.MockedClass<typeof NoteService>
const mockSyncService = mobileSyncService as jest.Mocked<typeof mobileSyncService>

describe('hooks/useDeleteNote', () => {
  let queryClient: QueryClient

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    })

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    // Reset to online mode
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('Online deletion', () => {
    it('deletes note successfully when online', async () => {
      const noteId = 'note-123'
      mockDatabaseService.markDeleted.mockResolvedValue()
      mockNoteService.prototype.deleteNote = jest.fn().mockResolvedValue(noteId)

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(noteId)
      })

      expect(mockDatabaseService.markDeleted).toHaveBeenCalledWith(noteId, 'test-user-id')
      expect(mockNoteService.prototype.deleteNote).toHaveBeenCalledWith(noteId)
      expect(result.current.isSuccess).toBe(true)
      expect(result.current.data).toBe(noteId)
    })

    it('marks note as deleted locally before server deletion', async () => {
      const noteId = 'note-456'
      const callOrder: string[] = []

      mockDatabaseService.markDeleted.mockImplementation(async () => {
        callOrder.push('markDeleted')
      })
      mockNoteService.prototype.deleteNote = jest.fn().mockImplementation(async () => {
        callOrder.push('deleteNote')
        return noteId
      })

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(noteId)
      })

      expect(callOrder).toEqual(['markDeleted', 'deleteNote'])
    })

    it('handles deletion error and throws', async () => {
      const noteId = 'note-error'
      const error = new Error('Deletion failed')

      mockDatabaseService.markDeleted.mockResolvedValue()
      mockNoteService.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        try {
          await result.current.mutateAsync(noteId)
        } catch (err) {
          expect(err).toEqual(error)
        }
      })

      expect(result.current.isError).toBe(true)
      expect(result.current.error).toEqual(error)
    })
  })

  describe('Offline deletion', () => {
    beforeEach(() => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      })
    })

    it('queues deletion when offline', async () => {
      const noteId = 'note-offline'
      const mockManager = {
        enqueue: jest.fn().mockResolvedValue(undefined),
      }
      mockSyncService.getManager.mockReturnValue(mockManager as unknown as ReturnType<typeof mockSyncService.getManager>)
      mockDatabaseService.markDeleted.mockResolvedValue()

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(noteId)
      })

      expect(mockDatabaseService.markDeleted).toHaveBeenCalledWith(noteId, 'test-user-id')
      expect(mockManager.enqueue).toHaveBeenCalledWith({
        noteId,
        operation: 'delete',
        payload: {},
        clientUpdatedAt: expect.any(String),
      })
      expect(result.current.isSuccess).toBe(true)
      expect(result.current.data).toBe(noteId)
    })

    it('does not call server when offline', async () => {
      const noteId = 'note-offline-2'
      const mockManager = {
        enqueue: jest.fn().mockResolvedValue(undefined),
      }
      mockSyncService.getManager.mockReturnValue(mockManager as unknown as ReturnType<typeof mockSyncService.getManager>)
      mockDatabaseService.markDeleted.mockResolvedValue()
      mockNoteService.prototype.deleteNote = jest.fn()

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(noteId)
      })

      expect(mockNoteService.prototype.deleteNote).not.toHaveBeenCalled()
      expect(mockManager.enqueue).toHaveBeenCalled()
    })
  })

  describe('Optimistic updates', () => {
    it('optimistically removes note from cache', async () => {
      const noteId = 'note-optimistic'
      mockDatabaseService.markDeleted.mockResolvedValue()
      mockNoteService.prototype.deleteNote = jest.fn().mockResolvedValue(noteId)

      // Set up initial query data
      queryClient.setQueryData(['notes', 'test-user-id'], {
        pages: [
          {
            notes: [
              { id: 'note-1', title: 'Note 1' },
              { id: noteId, title: 'To Delete' },
              { id: 'note-3', title: 'Note 3' },
            ],
            totalCount: 3,
            hasMore: false,
          },
        ],
        pageParams: [0],
      })

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(noteId)
      })

      // Check that note was removed from cache
      const cacheData = queryClient.getQueryData(['notes', 'test-user-id']) as NotesCacheData
      expect(cacheData.pages[0].notes).toHaveLength(2)
      expect(cacheData.pages[0].notes.find((n) => n.id === noteId)).toBeUndefined()
    })

    it('decrements totalCount after deletion', async () => {
      const noteId = 'note-count-test'
      mockDatabaseService.markDeleted.mockResolvedValue()
      mockNoteService.prototype.deleteNote = jest.fn().mockResolvedValue(noteId)

      queryClient.setQueryData(['notes', 'test-user-id'], {
        pages: [
          {
            notes: [
              { id: noteId, title: 'To Delete' },
              { id: 'note-2', title: 'Note 2' },
            ],
            totalCount: 2,
            hasMore: false,
          },
        ],
        pageParams: [0],
      })

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(noteId)
      })

      const cacheData = queryClient.getQueryData(['notes', 'test-user-id']) as NotesCacheData
      expect(cacheData.pages[0].totalCount).toBe(1)
    })

    it('handles totalCount not going below zero', async () => {
      const noteId = 'note-zero-count'
      mockDatabaseService.markDeleted.mockResolvedValue()
      mockNoteService.prototype.deleteNote = jest.fn().mockResolvedValue(noteId)

      queryClient.setQueryData(['notes', 'test-user-id'], {
        pages: [
          {
            notes: [{ id: noteId, title: 'Last Note' }],
            totalCount: 1,
            hasMore: false,
          },
        ],
        pageParams: [0],
      })

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(noteId)
      })

      const cacheData = queryClient.getQueryData(['notes', 'test-user-id']) as NotesCacheData
      expect(cacheData.pages[0].totalCount).toBe(0)
      expect(cacheData.pages[0].totalCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Error handling and rollback', () => {
    it('rolls back optimistic update on error', async () => {
      const noteId = 'note-rollback'
      const error = new Error('Server error')
      mockDatabaseService.markDeleted.mockResolvedValue()
      mockNoteService.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      const initialData = {
        pages: [
          {
            notes: [
              { id: 'note-1', title: 'Note 1' },
              { id: noteId, title: 'To Delete' },
            ],
            totalCount: 2,
            hasMore: false,
          },
        ],
        pageParams: [0],
      }

      queryClient.setQueryData(['notes', 'test-user-id'], initialData)

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        try {
          await result.current.mutateAsync(noteId)
        } catch {
          // Expected to throw
        }
      })

      // Should roll back to original state
      const cacheData = queryClient.getQueryData(['notes', 'test-user-id']) as NotesCacheData
      expect(cacheData.pages[0].notes).toHaveLength(2)
      expect(cacheData.pages[0].notes.find((n) => n.id === noteId)).toBeDefined()
    })

    it('refetches queries after error', async () => {
      const noteId = 'note-refetch'
      const error = new Error('Network error')
      mockDatabaseService.markDeleted.mockResolvedValue()
      mockNoteService.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      queryClient.setQueryData(['notes', 'test-user-id'], {
        pages: [{ notes: [{ id: noteId, title: 'Note' }], totalCount: 1, hasMore: false }],
        pageParams: [0],
      })

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        try {
          await result.current.mutateAsync(noteId)
        } catch {
          // Expected
        }
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notes'] })
    })

    it('does not refetch on success', async () => {
      const noteId = 'note-no-refetch'
      mockDatabaseService.markDeleted.mockResolvedValue()
      mockNoteService.prototype.deleteNote = jest.fn().mockResolvedValue(noteId)

      queryClient.setQueryData(['notes', 'test-user-id'], {
        pages: [{ notes: [{ id: noteId, title: 'Note' }], totalCount: 1, hasMore: false }],
        pageParams: [0],
      })

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(noteId)
      })

      // Should not invalidate on success (optimistic update handles it)
      expect(invalidateSpy).not.toHaveBeenCalled()
    })
  })

  describe('Authentication', () => {
    it('throws error when user not authenticated', async () => {
      const { useSupabase } = require('@ui/mobile/providers')
      useSupabase.mockReturnValueOnce({
        client: {},
        user: null,
      })

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        try {
          await result.current.mutateAsync('note-id')
          expect.hasAssertions()
        } catch (error) {
          expect((error as Error).message).toBe('User not authenticated')
        }
      })

      expect(result.current.isError).toBe(true)
    })
  })

  describe('Multiple pages handling', () => {
    it('removes note from correct page in multi-page cache', async () => {
      const noteId = 'note-page2'
      mockDatabaseService.markDeleted.mockResolvedValue()
      mockNoteService.prototype.deleteNote = jest.fn().mockResolvedValue(noteId)

      queryClient.setQueryData(['notes', 'test-user-id'], {
        pages: [
          {
            notes: [{ id: 'note-1', title: 'Note 1' }],
            totalCount: 3,
            hasMore: true,
          },
          {
            notes: [
              { id: noteId, title: 'To Delete' },
              { id: 'note-3', title: 'Note 3' },
            ],
            totalCount: 3,
            hasMore: false,
          },
        ],
        pageParams: [0, 1],
      })

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(noteId)
      })

      const cacheData = queryClient.getQueryData(['notes', 'test-user-id']) as NotesCacheData
      expect(cacheData.pages[0].notes).toHaveLength(1) // First page unchanged
      expect(cacheData.pages[1].notes).toHaveLength(1) // Second page has note removed
      expect(cacheData.pages[1].notes.find((n) => n.id === noteId)).toBeUndefined()
    })
  })
})


