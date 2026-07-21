import { SearchService } from '../../services/search'

type FallbackChain = {
  select: jest.Mock
  eq: jest.Mock
  or: jest.Mock
  contains: jest.Mock
  range: jest.Mock
  order: jest.Mock
}

const createFallbackChain = (data: unknown, error: unknown = null): FallbackChain => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data, error }),
  }
  return chain
}

const createService = (rpc: jest.Mock, chain: FallbackChain) => new SearchService({
  rpc,
  from: jest.fn().mockReturnValue(chain),
} as never)

describe('SearchService additional branches', () => {
  it('falls back for null and empty FTS data and preserves null fallback data', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: [], error: null })
    const chain = createFallbackChain(null)
    const service = createService(rpc, chain)

    await expect(service.searchNotes('user-1', 'first query')).resolves.toEqual({
      results: [],
      total: 0,
      method: 'fallback',
    })
    await expect(service.searchNotes('user-1', 'second query')).resolves.toEqual({
      results: [],
      total: 0,
      method: 'fallback',
    })
    expect(chain.order).toHaveBeenCalledTimes(2)
  })

  it('normalizes missing description, content and headline fields in FTS rows', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        { id: 'missing-fields', rank: 0.2, description: null, content: null },
        { id: 'content-only', rank: 0.3, description: null, content: 'content fallback', headline: null, total_count: 2 },
      ],
      error: null,
    })
    const service = createService(rpc, createFallbackChain([]))

    await expect(service.searchNotes('user-1', 'content')).resolves.toMatchObject({
      method: 'fts',
      total: 2,
      results: [
        { id: 'missing-fields', user_id: 'user-1', description: '', content: null, headline: null, rank: 0.2 },
        { id: 'content-only', user_id: 'user-1', description: 'content fallback', content: 'content fallback', headline: null, rank: 0.3 },
      ],
    })
  })

  it('sends exact RPC payloads for language, ranking, pagination and tags', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [], error: null })
    const chain = createFallbackChain([])
    const service = createService(rpc, chain)

    await service.searchNotes('user-42', 'hello world', {
      language: 'en',
      minRank: 0.25,
      limit: 7,
      offset: 14,
      tag: 'important',
    })

    expect(rpc).toHaveBeenCalledWith('search_notes_fts', {
      search_query: 'hello:* & world:*',
      search_language: 'english',
      min_rank: 0.25,
      result_limit: 7,
      result_offset: 14,
      search_user_id: 'user-42',
      filter_tag: 'important',
    })
  })

  it('sends the exact REST fallback chain payload, including sanitized query and tag', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [], error: null })
    const chain = createFallbackChain([
      { id: 'note-1', title: 'Title', description: 'Description', tags: ['work'] },
    ])
    const service = createService(rpc, chain)

    await expect(service.searchNotes('user-42', 'Title "Quote"', { limit: 3, offset: 5, tag: 'work' }))
      .resolves.toMatchObject({ method: 'fallback', total: 1, results: [{ id: 'note-1', user_id: 'user-42' }] })

    expect(chain.select).toHaveBeenCalledWith('id, title, description, tags, created_at, updated_at')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-42')
    expect(chain.or).toHaveBeenCalledWith('title.ilike."%title quote%",description.ilike."%title quote%"')
    expect(chain.contains).toHaveBeenCalledWith('tags', ['work'])
    expect(chain.range).toHaveBeenCalledWith(5, 7)
    expect(chain.order).toHaveBeenCalledWith('updated_at', { ascending: false })
  })

  it('returns a useful message for Error and unknown fallback failures', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
    const chain = createFallbackChain(null)
    chain.order
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockRejectedValueOnce({ code: 'DB_FAILURE' })
    const service = createService(rpc, chain)

    await expect(service.searchNotes('user-1', 'query')).resolves.toEqual({
      results: [], total: 0, method: 'fallback', error: 'database unavailable',
    })
    await expect(service.searchNotes('user-1', 'query')).resolves.toEqual({
      results: [], total: 0, method: 'fallback', error: 'Unknown error occurred',
    })
  })
})
