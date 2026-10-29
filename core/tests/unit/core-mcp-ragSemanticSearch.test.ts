import type { SupabaseClient } from '@supabase/supabase-js'
import { createRagSemanticSearch } from '@core/mcp/ragSemanticSearch'

const params = { query: 'meaning', limit: 5, minSimilarity: null, tag: null }

function setup(stored: number | null, error: unknown = null) {
  const builder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: stored === null ? null : { similarity_threshold: stored }, error }),
  }
  const from = jest.fn().mockReturnValue(builder)
  const supabase = { from } as unknown as SupabaseClient
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"chunks":[]}', { status: 200 }))
  return { adapter: createRagSemanticSearch('http://localhost', 'user-token', supabase, 'owner'), fetchSpy, from, builder }
}

afterEach(() => jest.restoreAllMocks())

it('uses the saved threshold when there is no explicit override', async () => {
  const { adapter, fetchSpy, from, builder } = setup(0.8)
  await adapter.search(params)
  expect(from).toHaveBeenCalledWith('user_rag_search_settings')
  expect(builder.eq).toHaveBeenCalledWith('user_id', 'owner')
  expect(JSON.parse(fetchSpy.mock.calls[0][1]!.body as string).threshold).toBe(0.8)
})

it('uses an explicit threshold including zero without looking up settings', async () => {
  const { adapter, fetchSpy, from } = setup(0.8)
  await adapter.search({ ...params, minSimilarity: 0 })
  expect(from).not.toHaveBeenCalled()
  expect(JSON.parse(fetchSpy.mock.calls[0][1]!.body as string).threshold).toBe(0)
})

it('uses the shared default only when there is no saved setting', async () => {
  const { adapter, fetchSpy } = setup(null)
  await adapter.search(params)
  expect(JSON.parse(fetchSpy.mock.calls[0][1]!.body as string).threshold).toBe(0.55)
})

it('does not silently use a different threshold when loading settings fails', async () => {
  const error = { message: 'settings unavailable' }
  const { adapter, fetchSpy } = setup(null, error)
  await expect(adapter.search(params)).rejects.toEqual(error)
  expect(fetchSpy).not.toHaveBeenCalled()
})
