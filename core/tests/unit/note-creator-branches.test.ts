import { NoteCreator } from '../../enex/note-creator'
import type { ParsedNote } from '../../enex/types'

const parsedNote = (title = 'Title'): ParsedNote => ({
  title, content: '<p>Body</p>', created: new Date('2026-01-01T00:00:00Z'), updated: new Date('2026-01-02T00:00:00Z'), tags: [], resources: [],
})

const createSupabase = (lookup: { data?: unknown; error?: unknown }, write: { data?: unknown; error?: unknown }) => {
  const lookupQuery = { eq: jest.fn().mockReturnThis(), order: jest.fn().mockResolvedValue(lookup) }
  const writeResult = { select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue(write) }), eq: jest.fn().mockReturnThis() }
  const table = {
    select: jest.fn().mockReturnValue(lookupQuery),
    insert: jest.fn().mockReturnValue(writeResult),
    update: jest.fn().mockReturnValue(writeResult),
  }
  return { client: { from: jest.fn().mockReturnValue(table) }, table }
}

describe('NoteCreator duplicate branches', () => {
  it('inserts a new note and tracks seen titles for file duplicate skipping', async () => {
    const { client, table } = createSupabase({ data: [], error: null }, { data: { id: 'new-id' }, error: null })
    const creator = new NoteCreator(client as never)
    const context = { skipFileDuplicates: true, existingByTitle: new Map<string, string>(), fallbackExistingByTitle: new Map<string, string | null>(), seenTitlesInImport: new Set<string>() }
    await expect(creator.create(parsedNote('New'), 'user', 'prefix', context)).resolves.toBe('new-id')
    expect(context.seenTitlesInImport.has('New')).toBe(true)
    expect(table.insert).toHaveBeenCalledWith(expect.objectContaining({ title: 'New', user_id: 'user' }))
    await expect(creator.create(parsedNote('New'), 'user', 'prefix', context)).resolves.toBeNull()
  })

  it('skips an existing title or updates it using replace strategy', async () => {
    const skipSetup = createSupabase({ data: [{ id: 'existing' }], error: null }, { data: { id: 'ignored' }, error: null })
    await expect(new NoteCreator(skipSetup.client as never).create(parsedNote(), 'user', 'skip')).resolves.toBeNull()
    expect(skipSetup.table.insert).not.toHaveBeenCalled()

    const replaceSetup = createSupabase({ data: [{ id: 'existing' }], error: null }, { data: { id: 'existing' }, error: null })
    await expect(new NoteCreator(replaceSetup.client as never).create(parsedNote(), 'user', 'replace')).resolves.toBe('existing')
    expect(replaceSetup.table.update).toHaveBeenCalledWith(expect.objectContaining({ title: 'Title' }))
    expect(replaceSetup.table.insert).not.toHaveBeenCalled()
  })

  it('prefixes duplicates and wraps lookup/write failures with context', async () => {
    const prefixSetup = createSupabase({ data: [{ id: 'existing' }], error: null }, { data: { id: 'new' }, error: null })
    await expect(new NoteCreator(prefixSetup.client as never).create(parsedNote(), 'user', 'prefix')).resolves.toBe('new')
    expect(prefixSetup.table.insert).toHaveBeenCalledWith(expect.objectContaining({ title: '[duplicate] Title' }))

    const lookupFailure = createSupabase({ data: null, error: { message: 'lookup failed' } }, { data: null, error: null })
    await expect(new NoteCreator(lookupFailure.client as never).create(parsedNote(), 'user')).rejects.toThrow('Failed to create note: lookup failed')
    const writeFailure = createSupabase({ data: [], error: null }, { data: null, error: { message: 'write failed' } })
    await expect(new NoteCreator(writeFailure.client as never).create(parsedNote(), 'user')).rejects.toThrow('Failed to create note: write failed')
    const missingId = createSupabase({ data: [], error: null }, { data: {}, error: null })
    await expect(new NoteCreator(missingId.client as never).create(parsedNote(), 'user')).rejects.toThrow(
      'Failed to create note: Created note id was not returned',
    )
  })
})
