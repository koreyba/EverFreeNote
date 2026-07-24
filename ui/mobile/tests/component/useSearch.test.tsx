import type { QueryClient } from '@tanstack/react-query'
import { createQueryWrapper, createTestQueryClient, renderHook, waitFor } from '../testUtils'
import { useSearch } from '@ui/mobile/hooks/useSearch'
import { databaseService } from '@ui/mobile/services/database'
import { SearchService } from '@core/services/search'
import { NoteService } from '@core/services/notes'

// Mock dependencies
jest.mock('@ui/mobile/services/database')
jest.mock('@core/services/search')
jest.mock('@core/services/notes')
jest.mock('@ui/mobile/hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(() => true), // Online by default
}))
jest.mock('@ui/mobile/providers', () => ({
  useSupabase: jest.fn(() => ({
    client: {},
    user: { id: 'test-user-id' },
  })),
}))

const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>
const mockSearchService = SearchService as jest.MockedClass<typeof SearchService>
const mockNoteService = NoteService as jest.MockedClass<typeof NoteService>

describe('hooks/useSearch', () => {
  let queryClient: QueryClient
  let wrapper: ReturnType<typeof createQueryWrapper>

  beforeEach(() => {
    jest.clearAllMocks()
    queryClient = createTestQueryClient()
    wrapper = createQueryWrapper(queryClient)
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('Online search', () => {
    it('searches notes online with query', async () => {
      const mockSearchNotes = jest.fn().mockResolvedValue({
        results: [
          {
            id: 'note-1',
            title: 'Test Note',
            description: 'Test description',
            tags: ['test'],
            updated_at: '2024-01-01T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
            rank: 0.5,
          },
        ],
        total: 1,
        method: 'fts',
      })

      mockSearchService.prototype.searchNotes = mockSearchNotes

      const { result } = renderHook(() => useSearch('test query'), {
        wrapper,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSearchNotes).toHaveBeenCalledWith('test-user-id', 'test query', {
        tag: null,
        limit: 50,
        offset: 0,
      })
      expect(result.current.data?.pages[0].results).toHaveLength(1)
      expect(result.current.data?.pages[0].method).toBe('fts')
    })

    it('filters by tag when provided', async () => {
      const mockSearchNotes = jest.fn().mockResolvedValue({
        results: [],
        total: 0,
        method: 'fts',
      })

      mockSearchService.prototype.searchNotes = mockSearchNotes

      const { result } = renderHook(() => useSearch('test', { tag: 'work' }), {
        wrapper,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSearchNotes).toHaveBeenCalledWith('test-user-id', 'test', {
        tag: 'work',
        limit: 50,
        offset: 0,
      })
    })

    it('ignores empty tag', async () => {
      const mockSearchNotes = jest.fn().mockResolvedValue({
        results: [],
        total: 0,
        method: 'fts',
      })

      mockSearchService.prototype.searchNotes = mockSearchNotes

      const { result } = renderHook(() => useSearch('test', { tag: '  ' }), {
        wrapper,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSearchNotes).toHaveBeenCalledWith('test-user-id', 'test', {
        tag: null,
        limit: 50,
        offset: 0,
      })
    })

    it('returns empty results for empty query without tag', () => {
      const { result } = renderHook(() => useSearch(''), {
        wrapper,
      })

      // Query is disabled for empty search without tag
      expect(result.current.fetchStatus).toBe('idle')
    })

    it('uses tag-only mode when no query provided', async () => {
      const mockGetNotes = jest.fn().mockResolvedValue({
        notes: [
          {
            id: 'note-1',
            title: 'Tagged Note',
            description: 'Description',
            tags: ['work'],
            updated_at: '2024-01-01T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
        totalCount: 1,
        hasMore: false,
      })

      mockNoteService.prototype.getNotes = mockGetNotes

      const { result } = renderHook(() => useSearch('', { tag: 'work' }), {
        wrapper,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetNotes).toHaveBeenCalledWith('test-user-id', {
        tag: 'work',
        page: 0,
        pageSize: 50,
      })
      expect(result.current.data?.pages[0].method).toBe('tag_only')
    })

    it('returns nextCursor when online tag-only results have more pages (lines 71-79)', async () => {
      const manyNotes = Array.from({ length: 50 }, (_, i) => ({
        id: `note-${i}`,
        title: `Note ${i}`,
        description: 'Description',
        tags: ['work'],
        updated_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      }))

      mockNoteService.prototype.getNotes = jest.fn().mockResolvedValue({
        notes: manyNotes,
        totalCount: 200,
        hasMore: true,
      })

      const { result } = renderHook(() => useSearch('', { tag: 'work' }), {
        wrapper,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.pages[0].hasMore).toBe(true)
      expect(result.current.data?.pages[0].nextCursor).toBe(1)
      expect(result.current.data?.pages[0].method).toBe('tag_only')
    })

    it('falls back to local FTS search via databaseService.searchNotes when online search throws an error', async () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {})
      const mockSearchNotes = jest.fn().mockRejectedValue(new Error('Online search RPC failed'))
      mockSearchService.prototype.searchNotes = mockSearchNotes

      const mockLocalNotes = [
        {
          id: 'note-local-1',
          title: 'Fallback Local Note',
          description: 'Description',
          tags: ['test'],
          updated_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          user_id: 'test-user-id',
          snippet: null,
          rank: null,
        },
      ]
      mockDatabaseService.searchNotes.mockResolvedValue(mockLocalNotes)

      const { result } = renderHook(() => useSearch('fallback query'), {
        wrapper,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSearchNotes).toHaveBeenCalledWith('test-user-id', 'fallback query', {
        tag: null,
        limit: 50,
        offset: 0,
      })
      expect(mockDatabaseService.searchNotes).toHaveBeenCalledWith('fallback query', 'test-user-id', {
        limit: 50,
        offset: 0,
        tag: null,
      })
      expect(result.current.data?.pages[0].method).toBe('local_fts')
      expect(result.current.data?.pages[0].results).toEqual(mockLocalNotes)
    })
  })

  describe('Offline fallback', () => {
    beforeEach(() => {
      const { useNetworkStatus } = require('@ui/mobile/hooks/useNetworkStatus')
      useNetworkStatus.mockReturnValue(false) // Offline
    })

    it('searches locally when offline', async () => {
      const mockLocalSearch = [
        {
          id: 'note-1',
          title: 'Local Note',
          description: 'Description',
          tags: ['test'],
          updated_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          user_id: 'test-user-id',
          snippet: null,
          rank: null,
        },
      ]

      mockDatabaseService.searchNotes.mockResolvedValue(mockLocalSearch)

      const { result } = renderHook(() => useSearch('test'), {
        wrapper,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockDatabaseService.searchNotes).toHaveBeenCalledWith('test', 'test-user-id', {
        limit: 50,
        offset: 0,
        tag: null,
      })
      expect(result.current.data?.pages[0].method).toBe('local_fts')
    })

    it('gets notes by tag locally when offline', async () => {
      mockDatabaseService.getLocalNotesByTag.mockResolvedValue({
        notes: [
          {
            id: 'note-1',
            title: 'Tagged Note',
            description: 'Description',
            tags: ['work'],
            updated_at: '2024-01-01T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
            user_id: 'test-user-id',
          },
        ],
        total: 1,
      })

      const { result } = renderHook(() => useSearch('', { tag: 'work' }), {
        wrapper,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockDatabaseService.getLocalNotesByTag).toHaveBeenCalledWith('test-user-id', 'work', {
        limit: 50,
        offset: 0,
      })
      expect(result.current.data?.pages[0].method).toBe('local_tag_only')
    })

    it('returns nextCursor when local tag-only results indicate hasMore (lines 98-100)', async () => {
      // Return more results than offset+length to trigger hasMore=true and nextCursor
      const manyNotes = Array.from({ length: 50 }, (_, i) => ({
        id: `note-${i}`,
        title: `Note ${i}`,
        description: 'Description',
        tags: ['work'],
        updated_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        user_id: 'test-user-id',
      }))

      mockDatabaseService.getLocalNotesByTag.mockResolvedValue({
        notes: manyNotes,
        total: 200, // offset(0) + 50 < 200, so hasMore=true
      })

      const { result } = renderHook(() => useSearch('', { tag: 'work' }), {
        wrapper,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.pages[0].hasMore).toBe(true)
      expect(result.current.data?.pages[0].nextCursor).toBe(1)
      expect(result.current.data?.pages[0].method).toBe('local_tag_only')
    })

    it('returns nextCursor when offline local FTS results fill a full page (lines 108-114)', async () => {
      // Return exactly PAGE_SIZE results so baseHasMore=true and nextCursor is set
      const fullPageResults = Array.from({ length: 50 }, (_, i) => ({
        id: `note-${i}`,
        title: `Note ${i}`,
        description: 'Description',
        tags: ['test'],
        updated_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        user_id: 'test-user-id',
        snippet: null,
        rank: null,
      }))

      mockDatabaseService.searchNotes.mockResolvedValue(fullPageResults)

      const { result } = renderHook(() => useSearch('test'), {
        wrapper,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.pages[0].hasMore).toBe(true)
      expect(result.current.data?.pages[0].nextCursor).toBe(1)
      expect(result.current.data?.pages[0].method).toBe('local_fts')
    })
  })

  describe('Query enabling', () => {
    it('is disabled for query shorter than 2 characters without tag', () => {
      const { result } = renderHook(() => useSearch('a'), {
        wrapper,
      })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('is enabled for query with 2+ characters', async () => {
      mockSearchService.prototype.searchNotes = jest.fn().mockResolvedValue({
        results: [],
        total: 0,
        method: 'fts',
      })

      const { result } = renderHook(() => useSearch('ab'), {
        wrapper,
      })

      await waitFor(() => expect(result.current.fetchStatus).not.toBe('idle'))
    })

    it('is enabled when tag is present even without query', async () => {
      mockNoteService.prototype.getNotes = jest.fn().mockResolvedValue({
        notes: [],
        totalCount: 0,
        hasMore: false,
      })

      const { result } = renderHook(() => useSearch('', { tag: 'work' }), {
        wrapper,
      })

      await waitFor(() => expect(result.current.fetchStatus).not.toBe('idle'))
    })

    it('is disabled when user is not authenticated', () => {
      const { useSupabase } = require('@ui/mobile/providers')
      useSupabase.mockReturnValueOnce({
        client: {},
        user: null,
      })

      const { result } = renderHook(() => useSearch('test'), {
        wrapper,
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('Pagination', () => {
    beforeEach(() => {
      // Reset to online for pagination tests
      const { useNetworkStatus } = require('@ui/mobile/hooks/useNetworkStatus')
      useNetworkStatus.mockReturnValue(true)
    })

    it('indicates hasMore when results match page size', async () => {
      const results = Array.from({ length: 50 }, (_, i) => ({
        id: `note-${i}`,
        title: `Note ${i}`,
        description: 'Description',
        tags: [],
        updated_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        rank: 0.5,
      }))

      mockSearchService.prototype.searchNotes = jest.fn().mockResolvedValue({
        results,
        total: 100,
        method: 'fts',
      })

      const { result } = renderHook(() => useSearch('test'), {
        wrapper,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // hasMore is determined by offset + results.length < total
      // offset=0, results.length=50, total=100 => 0 + 50 < 100 = true
      expect(result.current.data?.pages[0].results).toHaveLength(50)
      expect(result.current.data?.pages[0].hasMore).toBe(true)
      expect(result.current.data?.pages[0].nextCursor).toBe(1)
    })

    it('indicates no more results when total reached', async () => {
      mockSearchService.prototype.searchNotes = jest.fn().mockResolvedValue({
        results: [
          {
            id: 'note-1',
            title: 'Note',
            description: 'Description',
            tags: [],
            updated_at: '2024-01-01T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
        method: 'fts',
      })

      const { result } = renderHook(() => useSearch('test'), {
        wrapper,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.pages[0].hasMore).toBe(false)
      expect(result.current.data?.pages[0].nextCursor).toBeUndefined()
    })
  })
})
