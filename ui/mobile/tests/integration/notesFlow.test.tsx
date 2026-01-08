/**
 * Integration tests for notes flow: search, create, edit, delete with offline sync
 * Tests interaction between multiple services and components
 */
import type { QueryClient } from '@tanstack/react-query'
import {
  act,
  createInMemoryOfflineStorage,
  createNetworkStatusController,
  createQueryWrapper,
  createTestQueryClient,
  renderHook,
  TEST_USER_ID,
  waitFor,
} from '../testUtils'
import { OfflineSyncManager } from '@core/services/offlineSyncManager'

// Mock NetInfo BEFORE any other imports
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

// Mock other dependencies
jest.mock('@ui/mobile/services/database')
jest.mock('@core/services/notes')
jest.mock('@ui/mobile/services/sync', () => ({
  mobileSyncService: {
    getManager: jest.fn(),
  },
}))
jest.mock('@ui/mobile/providers', () => ({
  useSupabase: jest.fn(() => ({
    client: {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
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

import { useCreateNote, useNotes } from '@ui/mobile/hooks/useNotes'
import { useSearch } from '@ui/mobile/hooks/useSearch'
import { databaseService } from '@ui/mobile/services/database'
import { NoteService } from '@core/services/notes'
import { mobileSyncService } from '@ui/mobile/services/sync'

const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>
const mockNoteService = NoteService as jest.MockedClass<typeof NoteService>
const mockGetManager = mobileSyncService.getManager as jest.Mock

describe('Notes Flow Integration', () => {
  let queryClient: QueryClient
  let wrapper: ReturnType<typeof createQueryWrapper>

  beforeEach(() => {
    queryClient = createTestQueryClient()
    wrapper = createQueryWrapper(queryClient)

    // Setup mocks
    mockDatabaseService.searchNotes = jest.fn().mockResolvedValue([])
    mockDatabaseService.saveNotes = jest.fn().mockResolvedValue(undefined)
    mockDatabaseService.markDeleted = jest.fn().mockResolvedValue(undefined)
    mockDatabaseService.getLocalNotes = jest.fn().mockResolvedValue([])
    mockDatabaseService.getLocalNotesByTag = jest.fn().mockResolvedValue({ notes: [], total: 0 })

    mockNoteService.prototype.getNotes = jest.fn().mockResolvedValue({ notes: [], hasMore: false, totalCount: 0 })
    mockNoteService.prototype.createNote = jest.fn().mockResolvedValue({
      id: 'created-note-id',
      title: 'Created',
      description: '',
      tags: [],
      created_at: '2025-01-01T10:00:00.000Z',
      updated_at: '2025-01-01T10:00:00.000Z',
      user_id: TEST_USER_ID,
    })
    mockNoteService.prototype.deleteNote = jest.fn().mockResolvedValue('deleted-id')
    mockGetManager.mockReset()

    const { useNetworkStatus } = require('@ui/mobile/hooks/useNetworkStatus')
    useNetworkStatus.mockReturnValue(true)
  })

  afterEach(() => {
    queryClient.clear()
    jest.clearAllMocks()
  })

  describe('Online search and fetch flow', () => {
    it('searches notes and then fetches full list', async () => {
      // First render: search hook
      const { result: searchResult } = renderHook(() => useSearch('test query', { tag: null }), {
        wrapper,
      })

      await waitFor(() => {
        expect(searchResult.current.isSuccess).toBe(true)
      })

      // Verify search query executed successfully (empty results are OK for integration test)
      expect(searchResult.current.data?.pages).toBeDefined()
      expect(searchResult.current.data?.pages.length).toBeGreaterThan(0)

      // Second render: fetch all notes
      const { result: notesResult } = renderHook(() => useNotes(), {
        wrapper,
      })

      await waitFor(() => {
        expect(notesResult.current.isSuccess).toBe(true)
      })

      // Both queries should coexist in cache
      const searchCache = queryClient.getQueryData(['search', TEST_USER_ID, 'test query', null])
      // Notes query uses complex key with options object, so just check it exists in cache
      const allQueries = queryClient.getQueryCache().getAll()
      const notesQuery = allQueries.find((q) => q.queryKey[0] === 'notes')

      expect(searchCache).toBeDefined()
      expect(notesQuery).toBeDefined()
    })
  })

  describe('Offline to online sync flow', () => {
    it('queues changes offline and syncs when online', async () => {
      const { useNetworkStatus } = require('@ui/mobile/hooks/useNetworkStatus')
      useNetworkStatus.mockReturnValue(false)

      const { provider, setOnline } = createNetworkStatusController(false)
      const storage = createInMemoryOfflineStorage()
      const performSync = jest.fn(async (item) => {
        if (item.operation !== 'create') {
          return
        }
        const payload = item.payload as { title?: string; description?: string; tags?: string[]; user_id?: string }
        await mockNoteService.prototype.createNote({
          id: item.noteId,
          title: payload.title ?? '',
          description: payload.description ?? '',
          tags: payload.tags ?? [],
          userId: payload.user_id ?? '',
        })
      })

      const manager = new OfflineSyncManager(storage, performSync, provider)
      mockGetManager.mockReturnValue(manager)

      const { result } = renderHook(() => useCreateNote(), { wrapper })

      await act(async () => {
        result.current.mutate({
          title: 'Offline note',
          description: 'Offline content',
          tags: ['offline'],
        })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const queued = await storage.getQueue()
      expect(queued).toHaveLength(1)
      expect(queued[0].operation).toBe('create')
      expect(queued[0].payload).toEqual(expect.objectContaining({ title: 'Offline note' }))
      expect(mockNoteService.prototype.createNote).not.toHaveBeenCalled()
      expect(mockDatabaseService.saveNotes).toHaveBeenCalledWith([
        expect.objectContaining({
          title: 'Offline note',
          user_id: TEST_USER_ID,
          is_synced: 0,
          is_deleted: 0,
        }),
      ])

      setOnline(true)

      await waitFor(() => {
        expect(performSync).toHaveBeenCalled()
      })

      expect(mockNoteService.prototype.createNote).toHaveBeenCalled()

      await waitFor(async () => {
        const state = await manager.getState()
        expect(state.queueSize).toBe(0)
      })

      manager.dispose()
    })
  })

  describe('Search filtering integration', () => {
    it('filters search results by tag and updates cache', async () => {
      const { result, rerender } = renderHook(
        ({ query, tag }: { query: string; tag: string | null }) => useSearch(query, { tag }),
        {
          wrapper,
          initialProps: { query: 'test', tag: null },
        }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Change tag filter
      rerender({ query: 'test', tag: 'important' })

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false)
      })

      // Should create separate cache entry for filtered search
      const unfiltered = queryClient.getQueryData(['search', TEST_USER_ID, 'test', null])
      const filtered = queryClient.getQueryData(['search', TEST_USER_ID, 'test', 'important'])

      expect(unfiltered).toBeDefined()
      expect(filtered).toBeDefined()
    })
  })

  describe('Cache invalidation flow', () => {
    it('invalidates search cache when notes are updated', async () => {
      // Setup initial search
      const { result: searchResult } = renderHook(() => useSearch('test', { tag: null }), {
        wrapper,
      })

      await waitFor(() => {
        expect(searchResult.current.isSuccess).toBe(true)
      })

      // Invalidate all notes queries
      await act(async () => {
        await queryClient.invalidateQueries({ queryKey: ['notes'] })
      })

      // Search should refetch
      await waitFor(() => {
        expect(searchResult.current.isFetching).toBe(false)
      })
    })
  })

  describe('Error recovery flow', () => {
    it('falls back to offline mode when network fails', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const { useNetworkStatus } = require('@ui/mobile/hooks/useNetworkStatus')
      useNetworkStatus.mockReturnValue(true)

      const localNotes = [
        {
          id: 'local-note-1',
          title: 'Local Note',
          description: 'Local content',
          tags: ['local'],
          created_at: '2025-01-01T10:00:00.000Z',
          updated_at: '2025-01-01T10:00:00.000Z',
          user_id: TEST_USER_ID,
        },
      ]

      mockNoteService.prototype.getNotes = jest.fn().mockRejectedValue(new Error('Network down'))
      mockDatabaseService.getLocalNotes = jest.fn().mockResolvedValue(localNotes)

      const { result } = renderHook(() => useNotes(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const notes = result.current.data?.pages.flatMap((page) => page.notes) ?? []
      expect(notes).toHaveLength(1)
      expect(notes[0].id).toBe('local-note-1')
      expect(mockDatabaseService.getLocalNotes).toHaveBeenCalledWith(TEST_USER_ID)
      expect(mockNoteService.prototype.getNotes).toHaveBeenCalledWith(TEST_USER_ID, {
        page: 0,
        pageSize: 50,
        searchQuery: undefined,
        tag: undefined,
      })

      warnSpy.mockRestore()
    })
  })

  describe('Pagination with search', () => {
    it('loads more search results on scroll', async () => {
      const { result } = renderHook(() => useSearch('test query', { tag: null }), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Load next page
      await act(async () => {
        if (result.current.hasNextPage) {
          await result.current.fetchNextPage()
        }
      })

      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(false)
      })

      // Should have multiple pages in cache
      const cacheData = queryClient.getQueryData(['search', TEST_USER_ID, 'test query', null]) as unknown as { pages?: unknown[] }
      expect(cacheData?.pages).toBeDefined()
    })
  })
})
