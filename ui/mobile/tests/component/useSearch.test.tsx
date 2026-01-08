import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
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

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
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
      },
    })
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
        wrapper: createWrapper(),
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
        wrapper: createWrapper(),
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
        wrapper: createWrapper(),
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
        wrapper: createWrapper(),
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
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetNotes).toHaveBeenCalledWith('test-user-id', {
        tag: 'work',
        page: 0,
        pageSize: 50,
      })
      expect(result.current.data?.pages[0].method).toBe('tag_only')
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
        wrapper: createWrapper(),
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
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockDatabaseService.getLocalNotesByTag).toHaveBeenCalledWith('test-user-id', 'work', {
        limit: 50,
        offset: 0,
      })
      expect(result.current.data?.pages[0].method).toBe('local_tag_only')
    })
  })

  describe('Query enabling', () => {
    it('is disabled for query shorter than 2 characters without tag', () => {
      const { result } = renderHook(() => useSearch('a'), {
        wrapper: createWrapper(),
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
        wrapper: createWrapper(),
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
        wrapper: createWrapper(),
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
        wrapper: createWrapper(),
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
        wrapper: createWrapper(),
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
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.pages[0].hasMore).toBe(false)
      expect(result.current.data?.pages[0].nextCursor).toBeUndefined()
    })
  })
})
