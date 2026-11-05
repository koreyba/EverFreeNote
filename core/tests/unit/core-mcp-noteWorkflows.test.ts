import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createNotebookMcpServer } from '@core/mcp/notebookServer'
import type { NotebookSemanticSearch } from '@core/mcp/notebookSearch'
import type { NotebookRepository, NoteRecord } from '@core/mcp/types'

const ID = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const VERSION = '2026-11-05T10:00:00.123456+00:00'
const NOTE: NoteRecord = { id: ID, title: 'Meeting', contentHtml: '<h2>Plan</h2><p>First</p><p>Last</p>', tags: ['work'], created_at: VERSION, updated_at: VERSION }
const text = (result: Awaited<ReturnType<Client['callTool']>>) => JSON.stringify(result.content)

function repositoryMock() {
  return { listNotes: jest.fn(), getNote: jest.fn().mockResolvedValue(NOTE), createNote: jest.fn(), updateNote: jest.fn(), listTags: jest.fn(), editNoteTags: jest.fn(), getNotes: jest.fn(), updateNoteIfVersion: jest.fn(), searchNotes: jest.fn() }
}

async function connect(repository: NotebookRepository, ranked?: NotebookSemanticSearch) {
  const server = createNotebookMcpServer(repository, undefined, ranked)
  const client = new Client({ name: 'workflow-test', version: '1' })
  const [left, right] = InMemoryTransport.createLinkedPair()
  await Promise.all([server.connect(right), client.connect(left)])
  return { client, close: async () => { await client.close(); await server.close() } }
}

describe('MCP note workflows', () => {
  let repo: ReturnType<typeof repositoryMock>
  let session: Awaited<ReturnType<typeof connect>>
  let ranked: { searchNotes: jest.Mock }
  beforeEach(async () => { repo = repositoryMock(); ranked = { searchNotes: jest.fn() }; session = await connect(repo as NotebookRepository, ranked) })
  afterEach(async () => { await session.close() })

  it('appends meeting minutes without resending or replacing the previous body', async () => {
    const body = NOTE.contentHtml + '<p>Minutes</p>'
    repo.updateNoteIfVersion.mockResolvedValue({ ...NOTE, contentHtml: body })
    const result = await session.client.callTool({ name: 'update_note', arguments: { id: ID, expected_updated_at: VERSION, content_edits: [{ operation: 'append', content_html: '<p>Minutes</p>' }] } })
    expect(result.isError).not.toBe(true)
    expect(repo.updateNoteIfVersion).toHaveBeenCalledWith(ID, { contentHtml: body }, VERSION)
    expect(repo.updateNote).not.toHaveBeenCalled()
  })

  it('inserts a paragraph between existing blocks and preserves untouched HTML', async () => {
    const body = '<h2>Plan</h2><p>First</p><p>Middle</p><p>Last</p>'
    repo.updateNoteIfVersion.mockResolvedValue({ ...NOTE, contentHtml: body })
    const result = await session.client.callTool({ name: 'update_note', arguments: { id: ID, expected_updated_at: VERSION, content_edits: [{ operation: 'insert_before', anchor_html: '<p>Last</p>', content_html: '<p>Middle</p>' }] } })
    expect(result.isError).not.toBe(true)
    expect(repo.updateNoteIfVersion).toHaveBeenCalledWith(ID, { contentHtml: body }, VERSION)
  })

  it('refuses block edits without the version returned by reading the note', async () => {
    const result = await session.client.callTool({ name: 'update_note', arguments: { id: ID, content_edits: [{ operation: 'append', content_html: '<p>Minutes</p>' }] } })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain('expected_updated_at')
    expect(repo.updateNoteIfVersion).not.toHaveBeenCalled()
  })

  it('protects a full replacement when the caller supplies a version', async () => {
    repo.updateNoteIfVersion.mockResolvedValue({ ...NOTE, contentHtml: '<p>New</p>' })
    await session.client.callTool({ name: 'update_note', arguments: { id: ID, content_html: '<p>New</p>', expected_updated_at: VERSION } })
    expect(repo.updateNoteIfVersion).toHaveBeenCalledWith(ID, { contentHtml: '<p>New</p>' }, VERSION)
    expect(repo.updateNote).not.toHaveBeenCalled()
  })

  it('rejects simultaneous whole-body replacement and block edits before writing', async () => {
    const result = await session.client.callTool({ name: 'update_note', arguments: { id: ID, content_html: '<p>New</p>', expected_updated_at: VERSION, content_edits: [{ operation: 'append', content_html: '<p>Extra</p>' }] } })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain('content_html and content_edits')
    expect(repo.updateNote).not.toHaveBeenCalled()
    expect(repo.updateNoteIfVersion).not.toHaveBeenCalled()
  })

  it('reads twenty requested notes with a single batch repository call', async () => {
    const ids = Array.from({ length: 20 }, (_, index) => `11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`)
    repo.getNotes.mockResolvedValue(ids.map(id => ({ ...NOTE, id })).reverse())
    const result = await session.client.callTool({ name: 'get_notes', arguments: { ids } })
    expect(result.isError).not.toBe(true)
    expect(repo.getNotes).toHaveBeenCalledWith(ids)
    const notes = (result.structuredContent as { notes: { id: string; status: string; content: string; content_format: string }[] }).notes
    expect(notes.map(note => note.id)).toEqual(ids)
    expect(notes).toHaveLength(20)
    expect(notes[0]).toMatchObject({ status: 'ok', content: 'Plan\nFirst\nLast', content_format: 'text' })
    expect(result.structuredContent).toMatchObject({ partial: false, total_requested: 20 })
    expect(repo.getNote).not.toHaveBeenCalled()
  })

  it('reports missing or foreign ids without disclosing their existence', async () => {
    repo.getNotes.mockResolvedValue([NOTE])
    const result = await session.client.callTool({ name: 'get_notes', arguments: { ids: [ID, OTHER], format: 'html' } })
    expect(result.isError).not.toBe(true)
    expect(result.structuredContent).toMatchObject({ notes: [{ id: ID, status: 'ok', content: NOTE.contentHtml }, { id: OTHER, status: 'not_found' }], partial: true })
  })

  it('reports content over the shared budget explicitly without cutting HTML', async () => {
    repo.getNotes.mockResolvedValue([{ ...NOTE, contentHtml: '<p>' + 'x'.repeat(1000) + '</p>' }, { ...NOTE, id: OTHER, contentHtml: '<p>Fits</p>' }])
    const result = await session.client.callTool({ name: 'get_notes', arguments: { ids: [ID, OTHER], format: 'html', max_chars: 1000 } })
    expect(result.isError).not.toBe(true)
    expect(result.structuredContent).toMatchObject({ notes: [{ id: ID, status: 'limit_exceeded', content_length: 1007 }, { id: OTHER, status: 'ok', content: '<p>Fits</p>' }], partial: true })
  })

  it('finds project notes within a date range and several tags ranked by relevance', async () => {
    const found = { notes: [{ id: ID, title: 'Meeting', tags: ['work'], created_at: VERSION, updated_at: VERSION, excerpt: 'Interview plan', score: 0.9 }], total: 1, has_more: false, mode: 'text' }
    repo.searchNotes.mockResolvedValue(found)
    const result = await session.client.callTool({ name: 'search_notes', arguments: { query: 'interview', created_after: '2026-10-01T00:00:00Z', created_before: '2026-11-01T00:00:00Z', tags: ['Work', 'urgent'], tag_match: 'all' } })
    expect(result.isError).not.toBe(true)
    expect(repo.searchNotes).toHaveBeenCalledWith(expect.objectContaining({ query: 'interview', mode: 'text', created_after: '2026-10-01T00:00:00Z', created_before: '2026-11-01T00:00:00Z', tags: ['Work', 'urgent'], tag_match: 'all', sort: 'relevance', limit: 20, offset: 0 }))
    expect(result.structuredContent).toMatchObject(found)
  })
  it('leaves the note unchanged when a later edit has an invalid anchor', async () => {
    const result = await session.client.callTool({ name: 'update_note', arguments: { id: ID, expected_updated_at: VERSION, content_edits: [{ operation: 'append', content_html: '<p>Extra</p>' }, { operation: 'replace', anchor_html: '<p>Missing</p>', content_html: '' }] } })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain('not found')
    expect(repo.updateNoteIfVersion).not.toHaveBeenCalled()
  })

  it('reports concurrent updates and never falls back to an unconditional write', async () => {
    repo.updateNoteIfVersion.mockRejectedValue(new Error('Note changed since it was read'))
    const result = await session.client.callTool({ name: 'update_note', arguments: { id: ID, expected_updated_at: VERSION, content_edits: [{ operation: 'append', content_html: '<p>Extra</p>' }] } })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain('changed since')
    expect(repo.updateNote).not.toHaveBeenCalled()
  })

  it('accepts an explicit null version for a legacy note', async () => {
    repo.getNote.mockResolvedValue({ ...NOTE, updated_at: null })
    repo.updateNoteIfVersion.mockResolvedValue(NOTE)
    const result = await session.client.callTool({ name: 'update_note', arguments: { id: ID, expected_updated_at: null, content_edits: [{ operation: 'append', content_html: '<p>Extra</p>' }] } })
    expect(result.isError).not.toBe(true)
    expect(repo.updateNoteIfVersion).toHaveBeenCalledWith(ID, { contentHtml: NOTE.contentHtml + '<p>Extra</p>' }, null)
  })

  it('returns not found without writing when an edited note is missing or foreign', async () => {
    repo.getNote.mockResolvedValue(null)
    const result = await session.client.callTool({ name: 'update_note', arguments: { id: ID, expected_updated_at: VERSION, content_edits: [{ operation: 'append', content_html: '<p>Extra</p>' }] } })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain('Note not found')
    expect(repo.updateNoteIfVersion).not.toHaveBeenCalled()
  })

  it('rejects duplicate batch ids and reports batch database errors', async () => {
    const invalid = await session.client.callTool({ name: 'get_notes', arguments: { ids: [ID, ID] } })
    expect(invalid.isError).toBe(true)
    expect(repo.getNotes).not.toHaveBeenCalled()
    repo.getNotes.mockRejectedValue(new Error('database unavailable'))
    const result = await session.client.callTool({ name: 'get_notes', arguments: { ids: [ID] } })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain('database unavailable')
  })

  it('returns ranked hybrid results without running a second text query', async () => {
    const result = { notes: [], total: 0, has_more: false, mode: 'hybrid' }
    ranked.searchNotes.mockResolvedValue({ status: 'ok', result })
    const output = await session.client.callTool({ name: 'search_notes', arguments: { query: 'hiring', mode: 'hybrid' } })
    expect(output.isError).not.toBe(true)
    expect(output.structuredContent).toEqual(result)
    expect(repo.searchNotes).not.toHaveBeenCalled()
  })

  it('explicitly falls back to text only for a hybrid setup gap', async () => {
    ranked.searchNotes.mockResolvedValue({ status: 'unavailable', message: 'Add a Gemini key' })
    repo.searchNotes.mockResolvedValue({ notes: [], total: 0, has_more: false, mode: 'text' })
    const output = await session.client.callTool({ name: 'search_notes', arguments: { query: 'hiring', mode: 'hybrid' } })
    expect(output.isError).not.toBe(true)
    expect(output.structuredContent).toMatchObject({ mode: 'text', warnings: ['Add a Gemini key'] })
    expect(repo.searchNotes).toHaveBeenCalledWith(expect.objectContaining({ mode: 'text' }))
  })

  it('does not disguise semantic-only setup gaps or genuine hybrid failures as text success', async () => {
    ranked.searchNotes.mockResolvedValueOnce({ status: 'unavailable', message: 'Index is unavailable' }).mockRejectedValueOnce(new Error('upstream unavailable'))
    const semantic = await session.client.callTool({ name: 'search_notes', arguments: { query: 'hiring', mode: 'semantic' } })
    const hybrid = await session.client.callTool({ name: 'search_notes', arguments: { query: 'hiring', mode: 'hybrid' } })
    expect(semantic.isError).toBe(true)
    expect(text(semantic)).toContain('Index is unavailable')
    expect(hybrid.isError).toBe(true)
    expect(text(hybrid)).toContain('upstream unavailable')
    expect(repo.searchNotes).not.toHaveBeenCalled()
  })

  it('rejects inverted date ranges before querying the database', async () => {
    const result = await session.client.callTool({ name: 'search_notes', arguments: { query: 'hiring', created_after: '2026-11-01T00:00:00Z', created_before: '2026-10-01T00:00:00Z' } })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain('lower bound')
    expect(repo.searchNotes).not.toHaveBeenCalled()
  })

})
