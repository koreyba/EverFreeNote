import { createClient } from '@supabase/supabase-js'
import { NoteService } from '@core/services/notes'

it('passes the refresh cancellation signal through Supabase for list and single-note reads', async () => {
  const requests: AbortSignal[] = []
  const fetcher: typeof fetch = async (_url, init) => {
    requests.push(init?.signal as AbortSignal)
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json', 'content-range': '0-0/0' } })
  }
  const client = createClient('https://refresh.example.test', 'test-key', {
    global: { fetch: fetcher }, auth: { persistSession: false, autoRefreshToken: false },
  })
  const service = new NoteService(client)
  const controller = new AbortController()
  await service.getNotes('user-1', { signal: controller.signal })
  await expect(service.getNoteStatus('note-1', controller.signal)).resolves.toEqual({ status: 'not_found' })
  expect(requests).toHaveLength(2)
  expect(requests[0] === controller.signal).toBe(true)
  expect(requests[1] === controller.signal).toBe(true)
})

it('checks cached IDs in bounded account-scoped batches without downloading note contents', async () => {
  const requests: URL[] = []
  const controller = new AbortController()
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input))
    requests.push(url)
    expect(init?.signal).toBe(controller.signal)
    expect(url.searchParams.get('user_id')).toBe('eq.user-1')
    expect(url.searchParams.get('select')).toBe('id')
    const ids = url.searchParams.get('id')!.slice(4, -1).split(',')
    expect(ids.length).toBeLessThanOrEqual(100)
    const rows = ids.filter(id => id !== 'deleted').map(id => ({ id }))
    return new Response(JSON.stringify(rows), { headers: { 'content-type': 'application/json', 'content-range': `0-${rows.length - 1}/${rows.length}` } })
  }
  const client = createClient('https://refresh.example.test', 'test-key', {
    global: { fetch: fetcher }, auth: { persistSession: false, autoRefreshToken: false },
  })
  const ids = ['deleted', ...Array.from({ length: 101 }, (_, i) => `note-${i}`)]
  await expect(new NoteService(client).getExistingNoteIds(ids, 'user-1', controller.signal)).resolves.toEqual(ids.slice(1))
  expect(requests).toHaveLength(2)
})

it('rejects incomplete ID results instead of treating truncated rows as deletions', async () => {
  const fetcher: typeof fetch = async () => new Response('[{"id":"one"}]', {
    headers: { 'content-type': 'application/json', 'content-range': '0-0/2' },
  })
  const client = createClient('https://refresh.example.test', 'test-key', {
    global: { fetch: fetcher }, auth: { persistSession: false, autoRefreshToken: false },
  })
  await expect(new NoteService(client).getExistingNoteIds(['one', 'two'], 'user-1')).rejects.toThrow('Incomplete')
})
