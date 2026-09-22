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
