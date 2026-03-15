import {
  DUPLICATE_LOOKUP_UNAVAILABLE_MESSAGE,
  fetchExistingTitles,
  resolveExistingTitlesForImport,
} from '@core/enex/import-shared'

type QueryResult = {
  data: Array<{ id: string; title: string | null | undefined }> | null
  error: { message: string } | null
}

function createSupabaseClient(result: QueryResult) {
  return {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(async () => result),
      })),
    })),
  } as never
}

describe('import-shared helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws when existing-title lookup fails', async () => {
    const client = createSupabaseClient({
      data: null,
      error: { message: 'lookup failed' },
    })

    await expect(fetchExistingTitles(client, 'user-1')).rejects.toThrow(
      'Failed to fetch existing titles: lookup failed'
    )
  })

  it('falls back to an empty snapshot for prefix imports when lookup fails', async () => {
    const client = createSupabaseClient({
      data: null,
      error: { message: 'lookup failed' },
    })
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    const existingByTitle = await resolveExistingTitlesForImport(client, 'user-1', 'prefix')

    expect(existingByTitle).toEqual(new Map())
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to fetch existing titles for prefix import:',
      expect.any(Error)
    )

    consoleErrorSpy.mockRestore()
  })

  it('fails closed for skip imports when lookup is unavailable', async () => {
    const client = createSupabaseClient({
      data: null,
      error: { message: 'lookup failed' },
    })

    await expect(resolveExistingTitlesForImport(client, 'user-1', 'skip')).rejects.toThrow(
      DUPLICATE_LOOKUP_UNAVAILABLE_MESSAGE
    )
  })

  it('skips rows with missing or blank titles when building the duplicate map', async () => {
    const client = createSupabaseClient({
      data: [
        { id: 'note-1', title: 'First note' },
        { id: 'note-2', title: '' },
        { id: 'note-3', title: '   ' },
        { id: 'note-4', title: null },
        { id: 'note-5', title: undefined },
        { id: 'note-6', title: 'First note' },
      ],
      error: null,
    })

    await expect(fetchExistingTitles(client, 'user-1')).resolves.toEqual(
      new Map([['First note', 'note-1']])
    )
  })
})
