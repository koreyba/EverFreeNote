import { NoteService } from '@core/services/notes'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('core/services/notes - deleteNote', () => {
  let service: NoteService
  let mockSupabase: jest.Mocked<SupabaseClient>

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(),
    } as unknown as jest.Mocked<SupabaseClient>

    service = new NoteService(mockSupabase)
  })

  describe('deleteNote', () => {
    it('deletes a note successfully', async () => {
      const noteId = 'note-123'

      const mockDelete = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      }
      const mockFrom = {
        delete: jest.fn().mockReturnValue(mockDelete),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      const result = await service.deleteNote(noteId)

      expect(mockSupabase.from).toHaveBeenCalledWith('notes')
      expect(mockFrom.delete).toHaveBeenCalled()
      expect(mockDelete.eq).toHaveBeenCalledWith('id', noteId)
      expect(result).toBe(noteId)
    })

    it('throws error when deletion fails', async () => {
      const noteId = 'note-456'
      const error = { message: 'Database error', code: '500' }

      const mockDelete = {
        eq: jest.fn().mockResolvedValue({ error }),
      }
      const mockFrom = {
        delete: jest.fn().mockReturnValue(mockDelete),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      await expect(service.deleteNote(noteId)).rejects.toEqual(error)
    })

    it('handles network timeout error', async () => {
      const noteId = 'note-789'
      const error = { message: 'Network timeout', code: 'TIMEOUT' }

      const mockDelete = {
        eq: jest.fn().mockResolvedValue({ error }),
      }
      const mockFrom = {
        delete: jest.fn().mockReturnValue(mockDelete),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      await expect(service.deleteNote(noteId)).rejects.toEqual(error)
    })

    it('handles permission denied error', async () => {
      const noteId = 'note-999'
      const error = { message: 'Permission denied', code: '403' }

      const mockDelete = {
        eq: jest.fn().mockResolvedValue({ error }),
      }
      const mockFrom = {
        delete: jest.fn().mockReturnValue(mockDelete),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      await expect(service.deleteNote(noteId)).rejects.toEqual(error)
    })

    it('handles not found error', async () => {
      const noteId = 'non-existent-note'
      const error = { message: 'Note not found', code: '404' }

      const mockDelete = {
        eq: jest.fn().mockResolvedValue({ error }),
      }
      const mockFrom = {
        delete: jest.fn().mockReturnValue(mockDelete),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      await expect(service.deleteNote(noteId)).rejects.toEqual(error)
    })

    it('handles empty note id', async () => {
      const mockDelete = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      }
      const mockFrom = {
        delete: jest.fn().mockReturnValue(mockDelete),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      const result = await service.deleteNote('')

      expect(mockDelete.eq).toHaveBeenCalledWith('id', '')
      expect(result).toBe('')
    })

    it('returns note id on successful deletion', async () => {
      const noteId = 'test-note-id'

      const mockDelete = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      }
      const mockFrom = {
        delete: jest.fn().mockReturnValue(mockDelete),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      const result = await service.deleteNote(noteId)

      expect(result).toBe(noteId)
      expect(typeof result).toBe('string')
    })

    it('calls Supabase methods in correct order', async () => {
      const noteId = 'sequence-test'
      const callOrder: string[] = []

      const mockDelete = {
        eq: jest.fn().mockImplementation((field, value) => {
          callOrder.push(`eq:${field}:${value}`)
          return Promise.resolve({ error: null })
        }),
      }
      const mockFrom = {
        delete: jest.fn().mockImplementation(() => {
          callOrder.push('delete')
          return mockDelete
        }),
      }
      mockSupabase.from.mockImplementation((table) => {
        callOrder.push(`from:${table}`)
        return mockFrom as unknown as ReturnType<typeof mockSupabase.from>
      })

      await service.deleteNote(noteId)

      expect(callOrder).toEqual(['from:notes', 'delete', `eq:id:${noteId}`])
    })

    it('handles deletion of note with special characters in id', async () => {
      const noteId = 'note-with-special!@#$%^&*()'

      const mockDelete = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      }
      const mockFrom = {
        delete: jest.fn().mockReturnValue(mockDelete),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      const result = await service.deleteNote(noteId)

      expect(mockDelete.eq).toHaveBeenCalledWith('id', noteId)
      expect(result).toBe(noteId)
    })

    it('handles deletion of note with UUID format', async () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440000'

      const mockDelete = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      }
      const mockFrom = {
        delete: jest.fn().mockReturnValue(mockDelete),
      }
      mockSupabase.from.mockReturnValue(mockFrom as unknown as ReturnType<typeof mockSupabase.from>)

      const result = await service.deleteNote(noteId)

      expect(mockDelete.eq).toHaveBeenCalledWith('id', noteId)
      expect(result).toBe(noteId)
    })
  })
})

