import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseNotebookRepository } from '@core/mcp/supabaseNotebookRepository'
import { notebookSearchInputSchema } from '@core/mcp/notebookSearch'

const ID = '11111111-1111-4111-8111-111111111111'
const VERSION = '2026-11-05T10:00:00.123456+00:00'
const row = { id: ID, title: 'Meeting', description: '<p>Body</p>', tags: ['work'], created_at: VERSION, updated_at: VERSION }

describe('MCP repository workflows', () => {
  it('loads a batch with one owner-scoped select', async () => {
    const builder = { select: jest.fn(), in: jest.fn(), eq: jest.fn(), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [row], error: null }).then(resolve) }
    builder.select.mockReturnValue(builder); builder.in.mockReturnValue(builder); builder.eq.mockReturnValue(builder)
    const from = jest.fn().mockReturnValue(builder)
    const repo = createSupabaseNotebookRepository({ from } as unknown as SupabaseClient, 'owner')
    const result = await repo.getNotes([ID])
    expect(result).toEqual([{ id: ID, title: 'Meeting', contentHtml: '<p>Body</p>', tags: ['work'], created_at: VERSION, updated_at: VERSION }])
    expect(from).toHaveBeenCalledTimes(1)
    expect(builder.in).toHaveBeenCalledWith('id', [ID])
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'owner')
  })

  it('preserves microsecond precision when invoking the conditional update', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { status: 'updated', note: row }, error: null })
    const repo = createSupabaseNotebookRepository({ rpc } as unknown as SupabaseClient, 'owner')
    const result = await repo.updateNoteIfVersion(ID, { contentHtml: '<p>New</p>', tags: ['work'] }, VERSION)
    expect(rpc).toHaveBeenCalledWith('mcp_update_note', { note_id: ID, expected_updated_at: VERSION, patch: { description: '<p>New</p>', tags: ['work'] } })
    expect(result?.id).toBe(ID)
  })

  it('turns a stale write into an actionable conflict rather than not found', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { status: 'conflict' }, error: null })
    const repo = createSupabaseNotebookRepository({ rpc } as unknown as SupabaseClient, 'owner')
    await expect(repo.updateNoteIfVersion(ID, { title: 'New' }, VERSION)).rejects.toThrow('changed since')
  })

  it('hides missing and foreign notes in the conditional update', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { status: 'not_found' }, error: null })
    await expect(createSupabaseNotebookRepository({ rpc } as unknown as SupabaseClient, 'owner').updateNoteIfVersion(ID, { title: 'New' }, null)).resolves.toBeNull()
  })

  it('surfaces database errors on a conditional update', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: new Error('database unavailable') })
    await expect(createSupabaseNotebookRepository({ rpc } as unknown as SupabaseClient, 'owner').updateNoteIfVersion(ID, { title: 'New' }, VERSION)).rejects.toThrow('database unavailable')
  })

  it('passes every search constraint to the database before ranking and paging', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { notes: [{ ...row, excerpt_html: '<p>Relevant &amp; useful</p>', score: 0.8 }], total: 7, has_more: true, mode: 'text' }, error: null })
    const repo = createSupabaseNotebookRepository({ rpc } as unknown as SupabaseClient, 'owner')
    const input = notebookSearchInputSchema.parse({ query: 'meeting', tags: ['Work'], updated_after: VERSION, limit: 1, offset: 2 })
    const result = await repo.searchNotes(input)
    expect(rpc).toHaveBeenCalledWith('search_notebook_notes', expect.objectContaining({ query_text: 'meeting', search_mode: 'text', tag_filters: ['Work'], updated_after: VERSION, result_limit: 1, result_offset: 2 }))
    expect(result).toMatchObject({ notes: [{ excerpt: 'Relevant & useful' }], total: 7, has_more: true })
  })
})
