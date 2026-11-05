import * as allure from 'allure-js-commons'
import { DEFAULT_RAG_EMBEDDING_MODEL } from '@core/rag/embeddingModels'
import { notebookSearchInputSchema } from '@core/mcp/notebookSearch'

const mockServe = jest.fn()
const mockCreateClient = jest.fn()
jest.mock('https://deno.land/std@0.177.0/http/server.ts', () => ({ serve: (handler: unknown) => mockServe(handler) }), { virtual: true })
jest.mock('@supabase/supabase-js', () => ({ createClient: (...args: unknown[]) => mockCreateClient(...args) }))

const USER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const wire = { notes: [], total: 0, has_more: false, mode: 'hybrid' }

describe('RAG notebook search HTTP route', () => {
  let handler: (request: Request) => Promise<Response>
  let encryptedKey: string
  let rpc: jest.Mock
  let getUser: jest.Mock
  const originalDeno = Object.getOwnPropertyDescriptor(globalThis, 'Deno')

  beforeAll(async () => {
    const secret = new TextEncoder().encode('synthetic-encryption-secret')
    const digest = await crypto.subtle.digest('SHA-256', secret)
    const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt'])
    const iv = new Uint8Array(12)
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode('synthetic-gemini-key'))
    encryptedKey = Buffer.from(iv).toString('base64') + ':' + Buffer.from(encrypted).toString('base64')
    const env: Record<string, string> = { SUPABASE_URL: 'https://project.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-key', SUPABASE_ANON_KEY: 'synthetic-anon-key', AI_CREDENTIALS_KEY: 'synthetic-encryption-secret' }
    Object.defineProperty(globalThis, 'Deno', { configurable: true, value: { env: { get: (name: string) => env[name] } } })
    // The production handler executes unchanged; only platform modules and external boundaries are mocked.
    await import('../../../supabase/functions/rag-search/index')
    handler = mockServe.mock.calls[0][0]
  })

  afterAll(() => {
    if (originalDeno) Object.defineProperty(globalThis, 'Deno', originalDeno)
    else Reflect.deleteProperty(globalThis, 'Deno')
  })

  beforeEach(() => {
    rpc = jest.fn().mockResolvedValue({ data: wire, error: null })
    getUser = jest.fn().mockResolvedValue({ data: { user: { id: USER } }, error: null })
    const from = jest.fn((table: string) => {
      const data = table === 'user_api_keys' ? { gemini_api_key_encrypted: encryptedKey }
        : { top_k: 15, similarity_threshold: 0.8, embedding_model: DEFAULT_RAG_EMBEDDING_MODEL }
      const builder = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn().mockResolvedValue({ data, error: null }) }
      builder.select.mockReturnValue(builder); builder.eq.mockReturnValue(builder)
      return builder
    })
    mockCreateClient.mockImplementation((_url: string, key: string) => key === 'synthetic-service-key' ? { auth: { getUser }, from } : { rpc })
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ embedding: { values: [1, 0] } }), { status: 200 }))
  })
  afterEach(() => { jest.restoreAllMocks() })

  async function callRoute(body: unknown): Promise<Response> {
    const request = new Request('https://project.invalid/functions/v1/rag-search', { method: 'POST', headers: { Authorization: 'Bearer synthetic-token', 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const response = await handler(request)
    await allure.attachment('Observed synthetic RAG HTTP exchange', JSON.stringify({ request: { method: request.method, url: request.url, body }, response: { status: response.status, body: await response.clone().json() } }, null, 2), 'application/json')
    return response
  }

  it('embeds once and executes the owner-scoped note RPC with all filters and the saved threshold', async () => {
    const input = notebookSearchInputSchema.parse({ query: 'hiring', mode: 'hybrid', tags: ['Work', 'urgent'], tag_match: 'all', created_after: '2026-10-01T00:00:00Z', updated_before: '2026-11-01T00:00:00Z', limit: 10, offset: 2 })
    const response = await callRoute({ notebookSearch: input })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(wire)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('search_notebook_notes', expect.objectContaining({ query_text: 'hiring', search_mode: 'hybrid', query_embedding: [1, 0], tag_filters: ['Work', 'urgent'], created_after: input.created_after, updated_before: input.updated_before, result_limit: 10, result_offset: 2, min_similarity: 0.8 }))
    expect(mockCreateClient).toHaveBeenCalledWith('https://project.invalid', 'synthetic-anon-key', { global: { headers: { Authorization: 'Bearer synthetic-token' } } })
  })

  it('honors an explicit zero similarity override', async () => {
    const response = await callRoute({ notebookSearch: { query: 'hiring', mode: 'semantic', min_similarity: 0 } })
    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('search_notebook_notes', expect.objectContaining({ min_similarity: 0 }))
  })

  it('rejects invalid ranges and free text mode before authentication or billing', async () => {
    const inverted = await callRoute({ notebookSearch: { query: 'hiring', mode: 'hybrid', created_after: '2026-11-01T00:00:00Z', created_before: '2026-10-01T00:00:00Z' } })
    const text = await callRoute({ notebookSearch: { query: 'hiring', mode: 'text' } })
    expect(inverted.status).toBe(400)
    expect(text.status).toBe(400)
    expect(getUser).not.toHaveBeenCalled()
    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('preserves legacy chunk-search requests and responses', async () => {
    rpc.mockResolvedValue({ data: [], error: null })
    const response = await callRoute({ query: 'hiring', topK: 10, threshold: 0.6 })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ chunks: [], availableChunkCount: 0, hasMore: false })
    expect(rpc).toHaveBeenCalledWith('match_notes', expect.objectContaining({ match_count: 11, query_embedding: [1, 0] }))
  })
})
