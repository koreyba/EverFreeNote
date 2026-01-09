import { SearchService } from '@core/services/search'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FtsSearchResult } from '@/supabase/types'

describe('core/services/search', () => {
  let service: SearchService
  let mockSupabase: jest.Mocked<SupabaseClient>

  beforeEach(() => {
    // Create minimal Supabase mock
    mockSupabase = {
      rpc: jest.fn(),
      from: jest.fn(),
    } as unknown as jest.Mocked<SupabaseClient>

    service = new SearchService(mockSupabase)
  })

  describe('searchNotes - FTS path', () => {
    it('searches using full-text search with results', async () => {
      const ftsResults: FtsSearchResult[] = [
        {
          id: 'note-1',
          user_id: 'user-1',
          title: 'Test Note',
          description: 'Test description',
          tags: ['test'],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          rank: 0.5,
          headline: 'Test <b>description</b>',
        },
      ]

      mockSupabase.rpc.mockResolvedValue({
        data: ftsResults,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      } as unknown as Awaited<ReturnType<typeof mockSupabase.rpc>>)

      const result = await service.searchNotes('user-1', 'тест запрос')

      expect(result.results).toHaveLength(1)
      expect(result.method).toBe('fts')
      expect(result.total).toBeGreaterThan(0)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_notes_fts', {
        search_query: 'тест:* & запрос:*',
        search_language: 'russian',
        min_rank: 0.01,
        result_limit: 50,
        result_offset: 0,
        search_user_id: 'user-1',
        filter_tag: null,
      })
    })

    it('uses english language for latin text', async () => {
      const ftsResults: FtsSearchResult[] = []

      mockSupabase.rpc.mockResolvedValue({
        data: ftsResults,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      } as unknown as Awaited<ReturnType<typeof mockSupabase.rpc>>)

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      await service.searchNotes('user-1', 'hello world')

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'search_notes_fts',
        expect.objectContaining({
          search_language: 'english',
        })
      )
    })

    it('applies custom options', async () => {
      const ftsResults: FtsSearchResult[] = []

      mockSupabase.rpc.mockResolvedValue({
        data: ftsResults,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      } as unknown as Awaited<ReturnType<typeof mockSupabase.rpc>>)

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      await service.searchNotes('user-1', 'test', {
        language: 'en',
        minRank: 0.5,
        limit: 20,
        offset: 10,
        tag: 'important',
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_notes_fts', {
        search_query: 'test:*',
        search_language: 'english',
        min_rank: 0.5,
        result_limit: 20,
        result_offset: 10,
        search_user_id: 'user-1',
        filter_tag: 'important',
      })
    })

    it('normalizes FTS results with content field', async () => {
      const ftsResults = [
        {
          id: 'note-1',
          title: 'Test',
          content: 'Content from DB',
          tags: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          rank: 0.5,
          headline: 'Headline',
        },
      ]

      mockSupabase.rpc.mockResolvedValue({
        data: ftsResults,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      } as unknown as Awaited<ReturnType<typeof mockSupabase.rpc>>)

      const result = await service.searchNotes('user-1', 'test')

      expect(result.results[0]).toMatchObject({
        id: 'note-1',
        user_id: 'user-1',
        description: 'Content from DB',
        rank: 0.5,
        headline: 'Headline',
      })
    })

    it('handles total_count from FTS results', async () => {
      const ftsResults = [
        {
          id: 'note-1',
          title: 'Test',
          description: 'Desc',
          tags: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          rank: 0.5,
          headline: 'Headline',
          total_count: 100,
        },
      ]

      mockSupabase.rpc.mockResolvedValue({
        data: ftsResults,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      } as unknown as Awaited<ReturnType<typeof mockSupabase.rpc>>)

      const result = await service.searchNotes('user-1', 'test')

      expect(result.total).toBe(100)
    })
  })

  describe('searchNotes - Fallback path', () => {
    it('falls back to ILIKE when FTS returns no results', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      } as unknown as Awaited<ReturnType<typeof mockSupabase.rpc>>)

      const fallbackResults = [
        {
          id: 'note-1',
          user_id: 'user-1',
          title: 'Test Note',
          description: 'Test description',
          tags: ['test'],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: fallbackResults, error: null }),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      const result = await service.searchNotes('user-1', 'test')

      expect(result.method).toBe('fallback')
      expect(result.results).toHaveLength(1)
      expect(result.results[0].id).toBe('note-1')
      expect(mockSupabase.from).toHaveBeenCalledWith('notes')
    })

    it('applies tag filter in fallback', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      } as unknown as Awaited<ReturnType<typeof mockSupabase.rpc>>)

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      await service.searchNotes('user-1', 'test', { tag: 'work' })

      expect(mockFrom.contains).toHaveBeenCalledWith('tags', ['work'])
    })

    it('handles fallback errors gracefully', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      } as unknown as Awaited<ReturnType<typeof mockSupabase.rpc>>)

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      const result = await service.searchNotes('user-1', 'test')

      expect(result.method).toBe('fallback')
      expect(result.results).toEqual([])
      expect(result.error).toBe('Database error')
    })

    it('uses ILIKE with sanitized search term', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      } as unknown as Awaited<ReturnType<typeof mockSupabase.rpc>>)

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      await service.searchNotes('user-1', 'test "quote"')

      expect(mockFrom.or).toHaveBeenCalledWith(
        expect.stringContaining('test quote')
      )
    })
  })

  describe('searchNotes - Edge cases', () => {
    it('handles empty query gracefully', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      const result = await service.searchNotes('user-1', '')

      expect(result.method).toBe('fallback')
      expect(result.results).toEqual([])
    })

    it('handles very short query (< 3 chars)', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      const result = await service.searchNotes('user-1', 'ab')

      expect(result.method).toBe('fallback')
    })

    it('handles FTS error and falls back', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'FTS error' },
        count: null,
        status: 500,
        statusText: 'Error',
      } as unknown as Awaited<ReturnType<typeof mockSupabase.rpc>>)

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      const result = await service.searchNotes('user-1', 'test')

      expect(result.method).toBe('fallback')
    })

    it('handles pagination in fallback', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      } as unknown as Awaited<ReturnType<typeof mockSupabase.rpc>>)

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      await service.searchNotes('user-1', 'test', { limit: 10, offset: 20 })

      expect(mockFrom.range).toHaveBeenCalledWith(20, 29)
    })
  })
})



