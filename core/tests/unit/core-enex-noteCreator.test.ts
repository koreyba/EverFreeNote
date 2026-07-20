import type { SupabaseClient } from '@supabase/supabase-js'

import { NoteCreator } from '@core/enex/note-creator'
import type { ParsedNote } from '@core/enex/types'

function createParsedNote(title: string): ParsedNote {
  return {
    title,
    content: '<p>Hello</p>',
    created: new Date('2026-03-15T10:00:00.000Z'),
    updated: new Date('2026-03-15T10:00:00.000Z'),
    tags: [],
    resources: [],
  }
}

describe('core/enex/note-creator', () => {
  let creator: NoteCreator
  let mockSupabase: jest.Mocked<SupabaseClient>
  let noteTable: {
    select: jest.Mock
    insert: jest.Mock
  }
  let lookupOrder: jest.Mock
  let insertSingle: jest.Mock

  beforeEach(() => {
    lookupOrder = jest.fn()
    insertSingle = jest.fn()

    const lookupQuery = {
      eq: jest.fn().mockReturnThis(),
      order: lookupOrder,
    }

    noteTable = {
      select: jest.fn().mockReturnValue(lookupQuery),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: insertSingle,
        }),
      }),
    }

    mockSupabase = {
      from: jest.fn().mockReturnValue(noteTable),
    } as unknown as jest.Mocked<SupabaseClient>

    creator = new NoteCreator(mockSupabase)
  })

  it('reuses the first pre-write lookup result when snapshot lookup is unavailable and no pre-import duplicate exists', async () => {
    lookupOrder.mockResolvedValueOnce({ data: [], error: null })
    insertSingle
      .mockResolvedValueOnce({ data: { id: 'created-1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'created-2' }, error: null })

    const duplicateContext = {
      skipFileDuplicates: false,
      existingByTitle: null,
      fallbackExistingByTitle: new Map<string, string | null>(),
      seenTitlesInImport: new Set<string>(),
    }

    await expect(
      creator.create(createParsedNote('Repeated title'), 'user-1', 'prefix', duplicateContext)
    ).resolves.toBe('created-1')
    await expect(
      creator.create(createParsedNote('Repeated title'), 'user-1', 'prefix', duplicateContext)
    ).resolves.toBe('created-2')

    expect(lookupOrder).toHaveBeenCalledTimes(1)
    expect(noteTable.insert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ title: 'Repeated title' })
    )
    expect(noteTable.insert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ title: 'Repeated title' })
    )
    expect(duplicateContext.fallbackExistingByTitle.get('Repeated title')).toBeNull()
  })

  it('does not fall back to a live lookup when the pre-import snapshot is available and misses the title', async () => {
    insertSingle.mockResolvedValueOnce({ data: { id: 'created-1' }, error: null })

    const duplicateContext = {
      skipFileDuplicates: false,
      existingByTitle: new Map<string, string>(),
      fallbackExistingByTitle: new Map<string, string | null>(),
      seenTitlesInImport: new Set<string>(),
    }

    await expect(
      creator.create(createParsedNote('Fresh title'), 'user-1', 'prefix', duplicateContext)
    ).resolves.toBe('created-1')

    expect(lookupOrder).not.toHaveBeenCalled()
    expect(noteTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Fresh title' })
    )
    expect(duplicateContext.fallbackExistingByTitle.size).toBe(0)
  })

  it('keeps prefix behavior stable across repeated titles when a pre-import duplicate exists', async () => {
    lookupOrder.mockResolvedValueOnce({
      data: [{ id: 'existing-1', created_at: '2026-03-14T10:00:00.000Z' }],
      error: null,
    })
    insertSingle
      .mockResolvedValueOnce({ data: { id: 'created-1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'created-2' }, error: null })

    const duplicateContext = {
      skipFileDuplicates: false,
      existingByTitle: null,
      fallbackExistingByTitle: new Map<string, string | null>(),
      seenTitlesInImport: new Set<string>(),
    }

    await expect(
      creator.create(createParsedNote('Repeated title'), 'user-1', 'prefix', duplicateContext)
    ).resolves.toBe('created-1')
    await expect(
      creator.create(createParsedNote('Repeated title'), 'user-1', 'prefix', duplicateContext)
    ).resolves.toBe('created-2')

    expect(lookupOrder).toHaveBeenCalledTimes(1)
    expect(noteTable.insert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ title: '[duplicate] Repeated title' })
    )
    expect(noteTable.insert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ title: '[duplicate] Repeated title' })
    )
    expect(duplicateContext.fallbackExistingByTitle.get('Repeated title')).toBe('existing-1')
  })

  it('fails note creation when duplicate lookup errors instead of treating the note as new', async () => {
    lookupOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'lookup failed' },
    })

    await expect(creator.create(createParsedNote('Broken lookup'), 'user-1', 'prefix')).rejects.toThrow(
      'Failed to create note: lookup failed'
    )

    expect(noteTable.insert).not.toHaveBeenCalled()
  })
})
