import { NoteCreator } from '../../enex/note-creator'
import type { ParsedNote } from '../../enex/types'

const parsedNote = (title = 'Title'): ParsedNote => ({
  title,
  content: '<p>Body</p>',
  created: new Date('2026-01-01T00:00:00Z'),
  updated: new Date('2026-01-02T00:00:00Z'),
  tags: ['tag'],
  resources: [],
})

const createSupabase = (
  lookup: { data?: unknown; error?: unknown },
  write: { data?: unknown; error?: unknown }
) => {
  const lookupQuery = {
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue(lookup),
  }
  const writeResult = {
    select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue(write) }),
    eq: jest.fn().mockReturnThis(),
  }
  const table = {
    select: jest.fn().mockReturnValue(lookupQuery),
    insert: jest.fn().mockReturnValue(writeResult),
    update: jest.fn().mockReturnValue(writeResult),
  }
  return { client: { from: jest.fn().mockReturnValue(table) }, table, lookupQuery, writeResult }
}

const duplicateContext = (overrides: Partial<{
  skipFileDuplicates: boolean
  existingByTitle: Map<string, string> | null
  fallbackExistingByTitle: Map<string, string | null>
  seenTitlesInImport: Set<string>
}> = {}) => ({
  skipFileDuplicates: false,
  existingByTitle: new Map<string, string>(),
  fallbackExistingByTitle: new Map<string, string | null>(),
  seenTitlesInImport: new Set<string>(),
  ...overrides,
})

describe('NoteCreator additional branches', () => {
  it('normalizes titles and records only successfully created notes as seen', async () => {
    const { client, table } = createSupabase({ data: [], error: null }, { data: { id: 'created' }, error: null })
    const creator = new NoteCreator(client as never)
    const context = duplicateContext({ skipFileDuplicates: true })

    await expect(creator.create(parsedNote('   '), 'user', 'prefix', context)).resolves.toBe('created')
    expect(table.insert).toHaveBeenCalledWith(expect.objectContaining({ title: 'Untitled' }))
    expect(context.seenTitlesInImport).toEqual(new Set(['Untitled']))

    await expect(creator.create(parsedNote(' Untitled '), 'user', 'prefix', context)).resolves.toBeNull()
    expect(table.insert).toHaveBeenCalledTimes(1)

    const failedSetup = createSupabase(
      { data: [], error: null },
      { data: null, error: new Error('write failed') },
    )
    const failedWrite = jest.fn()
      .mockResolvedValueOnce({ data: null, error: new Error('write failed') })
      .mockResolvedValueOnce({ data: { id: 'retried' }, error: null })
    failedSetup.writeResult.select.mockReturnValue({ single: failedWrite })
    const failedContext = duplicateContext({ skipFileDuplicates: true })
    const failedCreator = new NoteCreator(failedSetup.client as never)

    await expect(failedCreator.create(parsedNote('Retry me'), 'user', 'prefix', failedContext))
      .rejects.toThrow('Failed to create note: write failed')
    expect(failedContext.seenTitlesInImport).toEqual(new Set())
    await expect(failedCreator.create(parsedNote('Retry me'), 'user', 'prefix', failedContext)).resolves.toBe('retried')
    expect(failedContext.seenTitlesInImport).toEqual(new Set(['Retry me']))
  })

  it('uses cached fallback lookups for replace and cached misses for prefix', async () => {
    const replaceSetup = createSupabase({ data: [{ id: 'existing-id' }], error: null }, { data: { id: 'existing-id' }, error: null })
    const replaceContext = duplicateContext({
      existingByTitle: null,
      fallbackExistingByTitle: new Map(),
    })
    const replaceCreator = new NoteCreator(replaceSetup.client as never)

    await expect(replaceCreator.create(parsedNote(), 'user', 'replace', replaceContext)).resolves.toBe('existing-id')
    await expect(replaceCreator.create(parsedNote(), 'user', 'replace', replaceContext)).resolves.toBe('existing-id')
    expect(replaceSetup.lookupQuery.order).toHaveBeenCalledTimes(1)
    expect(replaceContext.fallbackExistingByTitle.get('Title')).toBe('existing-id')
    expect(replaceSetup.table.update).toHaveBeenCalledTimes(2)

    const missSetup = createSupabase({ data: [], error: null }, { data: { id: 'new-id' }, error: null })
    const missContext = duplicateContext({
      existingByTitle: null,
      fallbackExistingByTitle: new Map([['Title', null]]),
    })
    await expect(new NoteCreator(missSetup.client as never).create(parsedNote(), 'user', 'prefix', missContext))
      .resolves.toBe('new-id')
    expect(missSetup.table.select).not.toHaveBeenCalled()
    expect(missSetup.table.insert).toHaveBeenCalledWith(expect.objectContaining({ title: 'Title' }))
  })

  it('inserts exact note data when lookup returns a row without an id', async () => {
    const setup = createSupabase({ data: [{ created_at: '2026-01-03T00:00:00Z' }], error: null }, { data: { id: 'new-id' }, error: null })
    const creator = new NoteCreator(setup.client as never)
    const note = parsedNote('  Normalized title  ')

    await expect(creator.create(note, 'user-id', 'prefix')).resolves.toBe('new-id')
    expect(setup.lookupQuery.eq).toHaveBeenNthCalledWith(1, 'user_id', 'user-id')
    expect(setup.lookupQuery.eq).toHaveBeenNthCalledWith(2, 'title', 'Normalized title')
    expect(setup.lookupQuery.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(setup.table.insert).toHaveBeenCalledWith({
      user_id: 'user-id',
      title: 'Normalized title',
      description: '<p>Body</p>',
      tags: ['tag'],
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    })
  })

  it('updates the exact existing note and reports a missing update id', async () => {
    const setup = createSupabase({ data: [{ id: 'existing-id' }], error: null }, { data: { id: 'updated-id' }, error: null })
    const creator = new NoteCreator(setup.client as never)
    const note = parsedNote('Title')

    await expect(creator.create(note, 'user-id', 'replace')).resolves.toBe('updated-id')
    expect(setup.table.update).toHaveBeenCalledWith({
      user_id: 'user-id',
      title: 'Title',
      description: '<p>Body</p>',
      tags: ['tag'],
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    })
    expect(setup.writeResult.eq).toHaveBeenCalledWith('id', 'existing-id')
    expect(setup.writeResult.select).toHaveBeenCalledWith('id')

    const missingIdSetup = createSupabase({ data: [{ id: 'existing-id' }], error: null }, { data: {}, error: null })
    await expect(new NoteCreator(missingIdSetup.client as never).create(note, 'user-id', 'replace'))
      .rejects.toThrow('Failed to create note: Updated note id was not returned')
  })

  it('wraps non-Error lookup and write failures with the creation context', async () => {
    const lookupFailure = createSupabase({ data: null, error: 'lookup failed' }, { data: null, error: null })
    await expect(new NoteCreator(lookupFailure.client as never).create(parsedNote(), 'user-id'))
      .rejects.toThrow('Failed to create note: Unknown error')

    const writeFailure = createSupabase({ data: null, error: null }, { data: null, error: new Error('write failed') })
    await expect(new NoteCreator(writeFailure.client as never).create(parsedNote(), 'user-id'))
      .rejects.toThrow('Failed to create note: write failed')
  })
})
