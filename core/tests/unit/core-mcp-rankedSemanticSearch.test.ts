import { createRagNotebookSearch } from '@core/mcp/ragSemanticSearch'
import { notebookSearchInputSchema } from '@core/mcp/notebookSearch'

const wire = { notes: [{ id: 'note', title: 'Title', tags: ['work'], created_at: null, updated_at: null, excerpt_html: 'Relevant &amp; precise', score: 0.03 }], total: 1, has_more: false, mode: 'hybrid' }

describe('MCP ranked semantic search adapter', () => {
  afterEach(() => { jest.restoreAllMocks() })

  it('forwards validated date, tag and ranking options to the existing RAG service', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(wire), { status: 200 }))
    const input = notebookSearchInputSchema.parse({ query: 'hiring', mode: 'hybrid', tags: ['Work', 'urgent'], updated_after: '2026-10-01T00:00:00Z' })
    const result = await createRagNotebookSearch('https://project.invalid', 'synthetic-token').searchNotes(input)
    expect(fetch).toHaveBeenCalledWith('https://project.invalid/functions/v1/rag-search', expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer synthetic-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ notebookSearch: input }) }))
    expect(result).toMatchObject({ status: 'ok', result: { notes: [{ excerpt: 'Relevant & precise' }], mode: 'hybrid' } })
  })

  it('identifies a missing key so hybrid can explicitly fall back to free text search', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Gemini API key not configured' }), { status: 400 }))
    const result = await createRagNotebookSearch('https://project.invalid', 'synthetic-token').searchNotes(notebookSearchInputSchema.parse({ query: 'hiring', mode: 'hybrid' }))
    expect(result).toMatchObject({ status: 'unavailable', message: expect.stringContaining('Gemini API key') })
  })

  it('keeps genuine upstream failures distinct from setup gaps', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Embedding service error' }), { status: 500 }))
    await expect(createRagNotebookSearch('https://project.invalid', 'synthetic-token').searchNotes(notebookSearchInputSchema.parse({ query: 'hiring', mode: 'semantic' }))).rejects.toThrow('Embedding service error')
  })
  it('recognizes a missing RAG deployment even when a gateway returns a non-JSON 404', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Not found', { status: 404 }))
    const result = await createRagNotebookSearch('https://project.invalid', 'synthetic-token').searchNotes(notebookSearchInputSchema.parse({ query: 'hiring', mode: 'hybrid' }))
    expect(result).toMatchObject({ status: 'unavailable', message: expect.stringContaining('not available') })
  })

  it('preserves upstream status for an error without a message and rejects malformed success data', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch')
    fetch.mockResolvedValueOnce(new Response('{}', { status: 503 })).mockResolvedValueOnce(new Response('{}', { status: 200 }))
    const search = createRagNotebookSearch('https://project.invalid', 'synthetic-token')
    const input = notebookSearchInputSchema.parse({ query: 'hiring', mode: 'semantic' })
    await expect(search.searchNotes(input)).rejects.toThrow('503')
    await expect(search.searchNotes(input)).rejects.toThrow()
  })

})
