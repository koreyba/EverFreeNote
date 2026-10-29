import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseNotebookRepository } from '@core/mcp/supabaseNotebookRepository'
import { createRagSemanticSearch } from '@core/mcp/ragSemanticSearch'

// These tests create disposable accounts and notes, so they only run when an
// explicitly configured local Supabase instance is provided.
const url = process.env.MCP_TEST_SUPABASE_URL
const anonKey = process.env.MCP_TEST_SUPABASE_ANON_KEY
const runLocal = url && anonKey ? describe : describe.skip
const runWithColumnGrantFixture = process.env.MCP_TEST_COLUMN_GRANTS === '1' ? it : it.skip

runLocal('MCP repository against local PostgREST and RLS', () => {
  let client: SupabaseClient
  let other: SupabaseClient
  let userId: string
  let otherId: string

  beforeAll(async () => {
    const parsed = new URL(url!)
    if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) throw new Error('A local test instance is required')
    client = createClient(url!, anonKey!, { auth: { persistSession: false } })
    other = createClient(url!, anonKey!, { auth: { persistSession: false } })
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const first = await client.auth.signUp({ email: `mcp-a-${suffix}@example.test`, password: 'local-test-pass-123' })
    const second = await other.auth.signUp({ email: `mcp-b-${suffix}@example.test`, password: 'local-test-pass-123' })
    if (first.error || second.error || !first.data.session || !second.data.session) throw first.error ?? second.error ?? new Error('No session')
    userId = first.data.user!.id
    otherId = second.data.user!.id
  }, 30000)

  it('concurrently applies additions and removals without losing either update', async () => {
    const note = await createSupabaseNotebookRepository(client, userId)
      .createNote({ title: 'concurrent tags', contentHtml: '', tags: ['base', 'remove-me'] })
    const session = await client.auth.getSession()
    let initialReads = 0
    let release!: () => void
    const bothRead = new Promise<void>((resolve) => { release = resolve })
    const concurrentClient = createClient(url!, anonKey!, {
      auth: { persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${session.data.session!.access_token}` },
        fetch: async (input, init) => {
          const response = await fetch(input, init)
          if (init?.method === 'GET' && String(input).includes('/rest/v1/notes?') && initialReads < 2) {
            initialReads += 1
            if (initialReads === 2) {
              const independent = await client.from('notes').update({ title: 'changed independently' }).eq('id', note.id)
              if (independent.error) throw independent.error
              release()
            }
            await bothRead
          }
          return response
        },
      },
    })
    const repo = createSupabaseNotebookRepository(concurrentClient, userId)
    await Promise.all([
      repo.editNoteTags(note.id, { add: ['other'], remove: [] }),
      repo.editNoteTags(note.id, { add: [], remove: ['remove-me'] }),
    ])
    const result = await repo.getNote(note.id)
    expect(result?.tags).toEqual(['base', 'other'])
    expect(result?.title).toBe('changed independently')
  }, 30000)

  it('handles null and escaped array values and cannot edit another user’s note', async () => {
    const inserted = await client.from('notes').insert({
      user_id: userId, title: 'escaped tags', tags: ['comma,tag', 'quote"tag', 'back\\slash'],
    }).select('id').single()
    if (inserted.error) throw inserted.error
    const repo = createSupabaseNotebookRepository(client, userId)
    const updated = await repo.editNoteTags(inserted.data.id, { add: ['new'], remove: [] })
    expect(updated?.tags).toEqual(['comma,tag', 'quote"tag', 'back\\slash', 'new'])
    expect(await createSupabaseNotebookRepository(other, otherId)
      .editNoteTags(inserted.data.id, { add: ['forbidden'], remove: [] })).toBeNull()
    // Even a forged repository user id must not bypass database RLS.
    expect(await createSupabaseNotebookRepository(other, userId)
      .editNoteTags(inserted.data.id, { add: ['forbidden'], remove: [] })).toBeNull()
    expect((await repo.getNote(inserted.data.id))?.tags).not.toContain('forbidden')

    const nullNote = await client.from('notes').insert({ user_id: userId, title: 'legacy null', tags: null }).select('id').single()
    if (nullNote.error) throw nullNote.error
    expect((await repo.editNoteTags(nullNote.data.id, { add: ['added'], remove: [] }))?.tags).toEqual(['added'])
    const empty = await repo.createNote({ title: 'empty tags', contentHtml: '', tags: [] })
    expect((await repo.editNoteTags(empty.id, { add: ['added'], remove: [] }))?.tags).toEqual(['added'])
  }, 30000)

  it('scans all pages under the 1000-row server limit and reports the 5000-note boundary accurately', async () => {
    const repo = createSupabaseNotebookRepository(other, otherId)
    let inserted = 0
    for (const size of [999, 1, 1, 3999, 1]) {
      const rows = Array.from({ length: size }, (_, index) => ({
        user_id: otherId,
        title: `pagination ${inserted + index}`,
        tags: ['pagination'],
      }))
      const result = await other.from('notes').insert(rows)
      if (result.error) throw result.error
      inserted += size
      const vocabulary = await repo.listTags()
      expect(vocabulary.total).toBe(Math.min(inserted, 5000))
      expect(vocabulary.tags).toEqual([{ name: 'pagination', count: Math.min(inserted, 5000) }])
      expect(vocabulary.truncated).toBe(inserted > 5000)
    }
  }, 60000)

  it('searches wildcard and filter syntax as literal text without broadening the query', async () => {
    const repo = createSupabaseNotebookRepository(client, userId)
    const cases = [
      { query: '"D:\\archive" (v1.2)', match: 'Archive "D:\\archive" (v1.2)', decoy: 'Archive D:archive v1X2' },
      { query: '100%', match: '100% guaranteed', decoy: '100x guaranteed' },
      { query: 'under_score', match: 'under_score here', decoy: 'underXscore here' },
      { query: 'star*token', match: 'star*token here', decoy: 'starXtoken here' },
      { query: '[a-z]?(x)+', match: '[a-z]?(x)+ here', decoy: 'aax here' },
      { query: 'a"b', match: 'a"b quoted', decoy: 'ab quoted' },
      { query: 'back\\slash', match: 'back\\slash here', decoy: 'backslash here' },
      { query: '"),title.ilike.*', match: '"),title.ilike.* literal', decoy: 'unrelated title' },
    ]
    for (const entry of cases) {
      await repo.createNote({ title: entry.match, contentHtml: '', tags: [] })
      await repo.createNote({ title: entry.decoy, contentHtml: '', tags: [] })
    }
    for (const entry of cases) {
      const found = await repo.listNotes({ query: entry.query, tags: [], tagMatch: 'all', limit: 100, offset: 0 })
      expect(found.notes.map((note) => note.title)).toContain(entry.match)
      expect(found.notes.map((note) => note.title)).not.toContain(entry.decoy)
      expect(found.total).toBe(1)
    }
  }, 30000)

  it('loads only the authenticated user’s saved semantic threshold', async () => {
    const inserted = await client.from('user_rag_search_settings').insert({ user_id: userId, similarity_threshold: 0.8 })
    if (inserted.error) throw inserted.error
    const originalFetch = globalThis.fetch
    const sent: number[] = []
    const spy = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).endsWith('/functions/v1/rag-search')) {
        sent.push(JSON.parse(init!.body as string).threshold)
        return new Response('{"chunks":[]}', { status: 200 })
      }
      return originalFetch(input, init)
    })
    try {
      const request = { query: 'test', limit: 5, minSimilarity: null, tag: null }
      await createRagSemanticSearch(url!, 'token', client, userId).search(request)
      // A different JWT cannot read this row even when a user id is forged.
      await createRagSemanticSearch(url!, 'token', other, userId).search(request)
      await createRagSemanticSearch(url!, 'token', other, otherId).search(request)
      await createRagSemanticSearch(url!, 'token', client, userId).search({ ...request, minSimilarity: 0 })
      expect(sent).toEqual([0.8, 0.55, 0.55, 0])
    } finally {
      spy.mockRestore()
    }
  }, 30000)

  runWithColumnGrantFixture('limits semantic settings SELECT to needed columns and preserves RLS', async () => {
    // The disposable fixture must not grant table-level SELECT to authenticated.
    const extraColumn = await client.from('user_rag_search_settings').select('user_id,top_k').eq('user_id', userId)
    expect(extraColumn.error?.code).toBe('42501')
    const foreign = await other.from('user_rag_search_settings').select('user_id,similarity_threshold').eq('user_id', userId)
    expect(foreign.error).toBeNull()
    expect(foreign.data).toEqual([])

    const anonymous = createClient(url!, anonKey!, { auth: { persistSession: false } })
    const denied = await anonymous.from('user_rag_search_settings')
      .select('user_id,similarity_threshold').eq('user_id', userId)
    expect(denied.error?.code).toBe('42501')
    const fetchSpy = jest.spyOn(globalThis, 'fetch')
    try {
      await expect(createRagSemanticSearch(url!, 'token', anonymous, userId).search({
        query: 'test', limit: 5, minSimilarity: null, tag: null,
      })).rejects.toMatchObject({ code: '42501' })
      expect(fetchSpy.mock.calls.some(([input]) => String(input).endsWith('/functions/v1/rag-search'))).toBe(false)
    } finally {
      fetchSpy.mockRestore()
    }
  }, 30000)
})
