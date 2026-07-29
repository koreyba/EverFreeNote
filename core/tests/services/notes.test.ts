import { NoteService } from '../../services/notes'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('NoteService - getAllTagsWithCounts', () => {
  let service: NoteService
  let mockSupabase: jest.Mocked<SupabaseClient>

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(),
    } as unknown as jest.Mocked<SupabaseClient>

    service = new NoteService(mockSupabase)
  })

  it('aggregates tag counts across all notes for a user', async () => {
    const userId = 'user-123'
    const mockSelect = jest.fn()
    const mockEq = jest.fn().mockResolvedValue({
      data: [
        { tags: ['work', 'urgent'] },
        { tags: ['work', 'personal'] },
        { tags: ['urgent'] },
      ],
      error: null,
    })

    mockSelect.mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ select: mockSelect } as unknown as ReturnType<typeof mockSupabase.from>)

    const result = await service.getAllTagsWithCounts(userId)

    expect(mockSupabase.from).toHaveBeenCalledWith('notes')
    expect(mockSelect).toHaveBeenCalledWith('tags')
    expect(mockEq).toHaveBeenCalledWith('user_id', userId)

    expect(result).toEqual({
      tags: ['personal', 'urgent', 'work'],
      counts: {
        personal: 1,
        urgent: 2,
        work: 2,
      },
    })
  })

  it('normalizes tags by trimming, converting to lowercase, and replacing extra spaces', async () => {
    const userId = 'user-123'
    const mockSelect = jest.fn()
    const mockEq = jest.fn().mockResolvedValue({
      data: [
        { tags: ['  WORK  ', 'Urgent   Task'] },
        { tags: ['work', 'urgent task'] },
      ],
      error: null,
    })

    mockSelect.mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ select: mockSelect } as unknown as ReturnType<typeof mockSupabase.from>)

    const result = await service.getAllTagsWithCounts(userId)

    expect(result).toEqual({
      tags: ['urgent task', 'work'],
      counts: {
        'urgent task': 2,
        work: 2,
      },
    })
  })

  it('deduplicates tags within the same note', async () => {
    const userId = 'user-123'
    const mockSelect = jest.fn()
    const mockEq = jest.fn().mockResolvedValue({
      data: [
        { tags: ['work', 'Work', ' WORK '] },
      ],
      error: null,
    })

    mockSelect.mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ select: mockSelect } as unknown as ReturnType<typeof mockSupabase.from>)

    const result = await service.getAllTagsWithCounts(userId)

    expect(result).toEqual({
      tags: ['work'],
      counts: {
        work: 1,
      },
    })
  })

  it('handles empty notes list, non-string tags, and null or empty tags gracefully', async () => {
    const userId = 'user-123'
    const mockSelect = jest.fn()
    const mockEq = jest.fn().mockResolvedValue({
      data: [
        { tags: null },
        { tags: [] },
        { tags: ['   '] },
        { tags: ['valid', null, 123 as unknown as string] },
      ],
      error: null,
    })

    mockSelect.mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ select: mockSelect } as unknown as ReturnType<typeof mockSupabase.from>)

    const result = await service.getAllTagsWithCounts(userId)

    expect(result).toEqual({
      tags: ['valid'],
      counts: { valid: 1 },
    })
  })

  it('throws error when Supabase query returns error', async () => {
    const userId = 'user-123'
    const dbError = { message: 'Database fetch error', code: '500' }
    const mockSelect = jest.fn()
    const mockEq = jest.fn().mockResolvedValue({
      data: null,
      error: dbError,
    })

    mockSelect.mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ select: mockSelect } as unknown as ReturnType<typeof mockSupabase.from>)

    await expect(service.getAllTagsWithCounts(userId)).rejects.toEqual(dbError)
  })
})
