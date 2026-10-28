import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseNotebookRepository } from '@core/mcp/supabaseNotebookRepository'

// These tests create disposable accounts and notes, so they only run when an
// explicitly configured local Supabase instance is provided.
const url = process.env.MCP_TEST_SUPABASE_URL
const anonKey = process.env.MCP_TEST_SUPABASE_ANON_KEY
const runLocal = url && anonKey ? describe : describe.skip

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
})
