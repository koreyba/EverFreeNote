import { NoteService } from '@core/services/notes'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('core/services/notes - getNoteStatus', () => {
  let service: NoteService
  let mockSupabase: jest.Mocked<SupabaseClient>

  const noteRecord = {
    id: 'note-123',
    title: 'Test Note',
    description: 'Body',
    tags: ['work'],
    created_at: '2025-01-01T10:00:00.000Z',
    updated_at: '2025-01-01T10:00:00.000Z',
    user_id: 'user-1',
  }

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(),
    } as unknown as jest.Mocked<SupabaseClient>

    service = new NoteService(mockSupabase)
  })

  function mockLookup(result: { data: typeof noteRecord | null; error: unknown }) {
    const maybeSingle = jest.fn().mockResolvedValue(result)
    const eq = jest.fn().mockReturnValue({ maybeSingle })
    const select = jest.fn().mockReturnValue({ eq })

    mockSupabase.from.mockReturnValue({
      select,
    } as unknown as ReturnType<typeof mockSupabase.from>)

    return { select, eq, maybeSingle }
  }

  it('returns found when Supabase returns a note', async () => {
    const chain = mockLookup({ data: noteRecord, error: null })

    await expect(service.getNoteStatus(noteRecord.id)).resolves.toEqual({
      status: 'found',
      note: noteRecord,
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('notes')
    expect(chain.select).toHaveBeenCalledWith('id, title, description, tags, created_at, updated_at, user_id')
    expect(chain.eq).toHaveBeenCalledWith('id', noteRecord.id)
    expect(chain.maybeSingle).toHaveBeenCalled()
  })

  it('returns not_found when Supabase returns no row', async () => {
    mockLookup({ data: null, error: null })

    await expect(service.getNoteStatus('missing-note')).resolves.toEqual({
      status: 'not_found',
    })
  })

  it('returns transient_error when Supabase returns an error', async () => {
    const error = { message: 'Temporary outage', code: '500' }
    mockLookup({ data: null, error })

    await expect(service.getNoteStatus('note-123')).resolves.toEqual({
      status: 'transient_error',
      error,
    })
  })
})
