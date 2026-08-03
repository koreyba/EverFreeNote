import type { SupabaseClient } from '@supabase/supabase-js'
import { NoteService } from '../../services/notes'
import type { Tables } from '../../../supabase/types'

type Note = Tables<'notes'>

const createNote = (id: string, tags: string[]): Note => ({
  id,
  title: id,
  description: '',
  tags,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  user_id: 'user-1',
})

function createService(notes: Note[]) {
  const select = jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({ data: notes, error: null }),
      }),
    }),
  })
  const updateSingle = jest.fn()
  const updateSelect = jest.fn().mockReturnValue({ single: updateSingle })
  const updateEq = jest.fn().mockReturnValue({ select: updateSelect })
  const update = jest.fn().mockReturnValue({ eq: updateEq })
  const supabase = {
    from: jest.fn().mockReturnValue({ select, update }),
  } as unknown as SupabaseClient

  return {
    service: new NoteService(supabase),
    update,
    updateSingle,
  }
}

describe('NoteService tag management operations', () => {
  it('renames a tag across the complete user note set and merges duplicates', async () => {
    const notes = [
      createNote('one', ['React', 'notes']),
      createNote('two', ['react', 'ReactJS']),
      createNote('three', ['unrelated']),
    ]
    const firstUpdated = { ...notes[0], tags: ['ReactJS', 'notes'] }
    const secondUpdated = { ...notes[1], tags: ['ReactJS'] }
    const { service, update, updateSingle } = createService(notes)
    updateSingle
      .mockResolvedValueOnce({ data: firstUpdated, error: null })
      .mockResolvedValueOnce({ data: secondUpdated, error: null })

    const result = await service.renameTag('user-1', ' react ', 'ReactJS')

    expect(update).toHaveBeenCalledTimes(2)
    expect(update.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ tags: ['ReactJS', 'notes'] }))
    expect(update.mock.calls[1]?.[0]).toEqual(expect.objectContaining({ tags: ['ReactJS'] }))
    expect(result).toEqual([firstUpdated, secondUpdated])
  })

  it('deletes a tag case-insensitively and leaves unrelated notes untouched', async () => {
    const notes = [
      createNote('one', ['Work', 'keep']),
      createNote('two', ['other']),
    ]
    const firstUpdated = { ...notes[0], tags: ['keep'] }
    const { service, update, updateSingle } = createService(notes)
    updateSingle.mockResolvedValueOnce({ data: firstUpdated, error: null })

    const result = await service.deleteTag('user-1', ' work ')

    expect(update).toHaveBeenCalledTimes(1)
    expect(update.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ tags: ['keep'] }))
    expect(result).toEqual([firstUpdated])
  })
})
