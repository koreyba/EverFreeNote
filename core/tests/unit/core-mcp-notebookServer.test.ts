import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

import {
  DEFAULT_LIST_LIMIT,
  NOTEBOOK_MCP_SERVER_INFO,
  createNotebookMcpServer,
  describeToolError,
  normalizeTags,
  toNoteDetail,
  toNoteSummary,
} from '@core/mcp/notebookServer'
import type { SemanticSearch } from '@core/mcp/semanticSearch'
import type { NotebookRepository, NoteRecord } from '@core/mcp/types'

const NOTE_A: NoteRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Groceries',
  contentHtml: '<p>Milk &amp; eggs</p><ul><li>Bread</li></ul>',
  tags: ['home'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-03T00:00:00Z',
}

const NOTE_B: NoteRecord = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Ideas',
  contentHtml: '',
  tags: [],
  created_at: null,
  updated_at: null,
}

type CallToolOutput = Awaited<ReturnType<Client['callTool']>>

function createRepositoryMock(): jest.Mocked<NotebookRepository> {
  return {
    listNotes: jest.fn(),
    getNote: jest.fn(),
    createNote: jest.fn(),
    updateNote: jest.fn(),
    listTags: jest.fn(),
    editNoteTags: jest.fn(),
  }
}

async function connect(repository: NotebookRepository, semanticSearch?: SemanticSearch) {
  const server = createNotebookMcpServer(repository, semanticSearch)
  const client = new Client({ name: 'test-client', version: '0.0.0' })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

  return {
    client,
    async close() {
      await client.close()
      await server.close()
    },
  }
}

const textOf = (result: CallToolOutput) => {
  const first = (result.content as Array<{ type: string; text?: string }>)[0]
  return first?.type === 'text' ? first.text ?? '' : ''
}

describe('core/mcp/notebookServer', () => {
  describe('pure helpers', () => {
    it('normalizes tags by trimming and removing blanks and duplicates', () => {
      expect(normalizeTags([' a ', 'b', 'a', '', '  ', 'b '])).toEqual(['a', 'b'])
      expect(normalizeTags(undefined)).toEqual([])
    })

    it('maps a note to a summary with an excerpt', () => {
      expect(toNoteSummary(NOTE_A)).toEqual({
        id: NOTE_A.id,
        title: 'Groceries',
        tags: ['home'],
        created_at: NOTE_A.created_at,
        updated_at: NOTE_A.updated_at,
        excerpt: 'Milk & eggs • Bread',
      })
    })

    it('maps a note to a detail with html and text bodies', () => {
      expect(toNoteDetail(NOTE_A)).toMatchObject({
        id: NOTE_A.id,
        content_html: NOTE_A.contentHtml,
        content_text: 'Milk & eggs\n• Bread',
      })
    })

    it('describes errors of various shapes', () => {
      expect(describeToolError(new Error('bad'))).toBe('bad')
      expect(describeToolError({ message: 'pg error' })).toBe('pg error')
      expect(describeToolError({ message: 42 })).toBe('Unexpected error')
      expect(describeToolError('string')).toBe('Unexpected error')
      expect(describeToolError(new Error(''))).toBe('Unexpected error')
    })
  })

  describe('protocol', () => {
    let repository: jest.Mocked<NotebookRepository>
    let session: Awaited<ReturnType<typeof connect>>

    beforeEach(async () => {
      repository = createRepositoryMock()
      session = await connect(repository)
    })

    afterEach(async () => {
      await session.close()
    })

    it('advertises the server info and the notebook tools', async () => {
      expect(session.client.getServerVersion()).toMatchObject({
        name: NOTEBOOK_MCP_SERVER_INFO.name,
        version: NOTEBOOK_MCP_SERVER_INFO.version,
      })
      expect(session.client.getInstructions()).toContain('EverFreeNote notebook')

      const { tools } = await session.client.listTools()
      const names = tools.map((tool) => tool.name).sort()
      expect(names).toEqual(['create_note', 'edit_note_tags', 'get_note', 'list_notes', 'list_tags', 'update_note'])

      const listTool = tools.find((tool) => tool.name === 'list_notes')
      expect(listTool?.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false })
      expect(listTool?.outputSchema).toBeDefined()

      const updateTool = tools.find((tool) => tool.name === 'update_note')
      expect(updateTool?.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true })
    })

    describe('list_notes', () => {
      it('uses defaults and reports pagination', async () => {
        repository.listNotes.mockResolvedValue({ notes: [NOTE_A, NOTE_B], total: 5 })

        const result = await session.client.callTool({ name: 'list_notes', arguments: {} })

        expect(repository.listNotes).toHaveBeenCalledWith({ query: null, tags: [], tagMatch: 'all', limit: DEFAULT_LIST_LIMIT, offset: 0 })
        expect(result.isError).toBeFalsy()
        expect(result.structuredContent).toEqual({
          notes: [toNoteSummary(NOTE_A), toNoteSummary(NOTE_B)],
          total: 5,
          has_more: true,
        })
        expect(JSON.parse(textOf(result))).toEqual(result.structuredContent)
      })

      it('passes filters through and detects the last page', async () => {
        repository.listNotes.mockResolvedValue({ notes: [NOTE_A], total: 3 })

        const result = await session.client.callTool({
          name: 'list_notes',
          arguments: { query: '  milk ', tags: ['home'], limit: 2, offset: 2 },
        })

        expect(repository.listNotes).toHaveBeenCalledWith({ query: 'milk', tags: ['home'], tagMatch: 'all', limit: 2, offset: 2 })
        expect(result.structuredContent).toMatchObject({ total: 3, has_more: false })
      })

      it('rejects invalid pagination arguments with a validation error', async () => {
        for (const args of [{ limit: 0 }, { limit: 101 }, { offset: -1 }]) {
          const result = await session.client.callTool({ name: 'list_notes', arguments: args })
          expect(result.isError).toBe(true)
          expect(textOf(result)).toContain('Input validation error')
        }
        expect(repository.listNotes).not.toHaveBeenCalled()
      })

      it('returns a tool error when the repository fails', async () => {
        repository.listNotes.mockRejectedValue(new Error('db down'))

        const result = await session.client.callTool({ name: 'list_notes', arguments: {} })

        expect(result.isError).toBe(true)
        expect(textOf(result)).toBe('Failed to list notes: db down')
      })
    })

    describe('get_note', () => {
      it('returns the full note', async () => {
        repository.getNote.mockResolvedValue(NOTE_A)

        const result = await session.client.callTool({ name: 'get_note', arguments: { id: NOTE_A.id } })

        expect(repository.getNote).toHaveBeenCalledWith(NOTE_A.id)
        expect(result.isError).toBeFalsy()
        expect(result.structuredContent).toEqual(toNoteDetail(NOTE_A))
      })

      it('reports a missing note as a tool error', async () => {
        repository.getNote.mockResolvedValue(null)

        const result = await session.client.callTool({ name: 'get_note', arguments: { id: NOTE_B.id } })

        expect(result.isError).toBe(true)
        expect(textOf(result)).toBe('Note not found')
      })

      it('rejects a non-UUID id before touching the repository', async () => {
        const result = await session.client.callTool({ name: 'get_note', arguments: { id: 'nope' } })

        expect(result.isError).toBe(true)
        expect(textOf(result)).toContain('Invalid UUID')
        expect(repository.getNote).not.toHaveBeenCalled()
      })

      it('returns a tool error when the repository fails', async () => {
        repository.getNote.mockRejectedValue({ message: 'timeout' })

        const result = await session.client.callTool({ name: 'get_note', arguments: { id: NOTE_A.id } })

        expect(result.isError).toBe(true)
        expect(textOf(result)).toBe('Failed to read note: timeout')
      })
    })

    describe('create_note', () => {
      it('creates a note with defaults and normalized tags', async () => {
        repository.createNote.mockResolvedValue(NOTE_B)

        const result = await session.client.callTool({
          name: 'create_note',
          arguments: { title: '  Ideas ', tags: [' x ', 'x', ''] },
        })

        expect(repository.createNote).toHaveBeenCalledWith({ title: 'Ideas', contentHtml: '', tags: ['x'] })
        expect(result.isError).toBeFalsy()
        expect(result.structuredContent).toEqual(toNoteDetail(NOTE_B))
      })

      it('passes the html body through', async () => {
        repository.createNote.mockResolvedValue(NOTE_A)

        await session.client.callTool({
          name: 'create_note',
          arguments: { title: 'Groceries', content_html: NOTE_A.contentHtml, tags: ['home'] },
        })

        expect(repository.createNote).toHaveBeenCalledWith({
          title: 'Groceries',
          contentHtml: NOTE_A.contentHtml,
          tags: ['home'],
        })
      })

      it('sanitizes agent-supplied markup before storing it', async () => {
        repository.createNote.mockResolvedValue(NOTE_A)

        await session.client.callTool({
          name: 'create_note',
          arguments: {
            title: 'Hostile',
            content_html: '<p onclick="steal()">text</p><script>alert(1)</script><a href="javascript:alert(2)">l</a>',
          },
        })

        expect(repository.createNote).toHaveBeenCalledWith({
          title: 'Hostile',
          contentHtml: '<p>text</p><a>l</a>',
          tags: [],
        })
      })

      it('rejects an empty title', async () => {
        const result = await session.client.callTool({ name: 'create_note', arguments: { title: '   ' } })

        expect(result.isError).toBe(true)
        expect(textOf(result)).toContain('Input validation error')
        expect(repository.createNote).not.toHaveBeenCalled()
      })

      it('returns a tool error when the repository fails', async () => {
        repository.createNote.mockRejectedValue(new Error('quota'))

        const result = await session.client.callTool({ name: 'create_note', arguments: { title: 'x' } })

        expect(result.isError).toBe(true)
        expect(textOf(result)).toBe('Failed to create note: quota')
      })
    })

    describe('update_note', () => {
      it('updates the provided fields only', async () => {
        repository.updateNote.mockResolvedValue({ ...NOTE_A, title: 'Shopping' })

        const result = await session.client.callTool({
          name: 'update_note',
          arguments: { id: NOTE_A.id, title: ' Shopping ', tags: ['home', 'home', ' errands'] },
        })

        expect(repository.updateNote).toHaveBeenCalledWith(NOTE_A.id, { title: 'Shopping', tags: ['home', 'errands'] })
        expect(result.isError).toBeFalsy()
        expect(result.structuredContent).toMatchObject({ id: NOTE_A.id, title: 'Shopping' })
      })

      it('maps content_html to the description field', async () => {
        repository.updateNote.mockResolvedValue(NOTE_A)

        await session.client.callTool({
          name: 'update_note',
          arguments: { id: NOTE_A.id, content_html: '<p>new</p>' },
        })

        expect(repository.updateNote).toHaveBeenCalledWith(NOTE_A.id, { contentHtml: '<p>new</p>' })
      })

      it('sanitizes agent-supplied markup on update', async () => {
        repository.updateNote.mockResolvedValue(NOTE_A)

        await session.client.callTool({
          name: 'update_note',
          arguments: { id: NOTE_A.id, content_html: '<iframe src="https://evil.example"></iframe><p>ok</p>' },
        })

        expect(repository.updateNote).toHaveBeenCalledWith(NOTE_A.id, { contentHtml: '<p>ok</p>' })
      })

      it('requires at least one field', async () => {
        const result = await session.client.callTool({ name: 'update_note', arguments: { id: NOTE_A.id } })

        expect(result.isError).toBe(true)
        expect(textOf(result)).toBe('Provide at least one of title, content_html or tags')
        expect(repository.updateNote).not.toHaveBeenCalled()
      })

      it('reports a missing or foreign note as not found', async () => {
        repository.updateNote.mockResolvedValue(null)

        const result = await session.client.callTool({
          name: 'update_note',
          arguments: { id: NOTE_B.id, title: 'x' },
        })

        expect(result.isError).toBe(true)
        expect(textOf(result)).toBe('Note not found')
      })

      it('returns a tool error when the repository fails', async () => {
        repository.updateNote.mockRejectedValue(new Error('conflict'))

        const result = await session.client.callTool({
          name: 'update_note',
          arguments: { id: NOTE_A.id, title: 'x' },
        })

        expect(result.isError).toBe(true)
        expect(textOf(result)).toBe('Failed to update note: conflict')
      })
    })

    describe('list_tags', () => {
      it('returns the vocabulary ordered by usage', async () => {
        repository.listTags.mockResolvedValue({
          tags: [
            { name: 'work', count: 4 },
            { name: 'home', count: 1 },
          ],
          total: 5,
          truncated: false,
        })

        const result = await session.client.callTool({ name: 'list_tags', arguments: {} })

        expect(result.isError).toBeFalsy()
        expect(result.structuredContent).toEqual({
          tags: [
            { name: 'work', count: 4 },
            { name: 'home', count: 1 },
          ],
          total: 2,
          truncated: false,
        })
      })

      it('filters by substring and applies the limit', async () => {
        repository.listTags.mockResolvedValue({
          tags: [
            { name: 'work', count: 4 },
            { name: 'homework', count: 2 },
            { name: 'home', count: 1 },
          ],
          total: 7,
          truncated: false,
        })

        const result = await session.client.callTool({ name: 'list_tags', arguments: { query: 'work', limit: 1 } })

        expect(result.structuredContent).toMatchObject({ tags: [{ name: 'work', count: 4 }], total: 2 })
      })

      it('passes the truncated flag through', async () => {
        repository.listTags.mockResolvedValue({ tags: [{ name: 'a', count: 1 }], total: 1, truncated: true })

        const result = await session.client.callTool({ name: 'list_tags', arguments: {} })

        expect(result.structuredContent).toMatchObject({ truncated: true })
      })

      it('returns a tool error when the repository fails', async () => {
        repository.listTags.mockRejectedValue(new Error('db down'))

        const result = await session.client.callTool({ name: 'list_tags', arguments: {} })

        expect(result.isError).toBe(true)
        expect(textOf(result)).toBe('Failed to list tags: db down')
      })
    })

    describe('edit_note_tags', () => {
      it('forwards normalised add and remove lists', async () => {
        repository.editNoteTags.mockResolvedValue({ ...NOTE_A, tags: ['home', 'urgent'] })

        const result = await session.client.callTool({
          name: 'edit_note_tags',
          arguments: { id: NOTE_A.id, add: [' urgent ', 'urgent'], remove: ['old', ''] },
        })

        expect(repository.editNoteTags).toHaveBeenCalledWith(NOTE_A.id, { add: ['urgent'], remove: ['old'] })
        expect(result.isError).toBeFalsy()
        expect(result.structuredContent).toMatchObject({ tags: ['home', 'urgent'] })
      })

      it('accepts a removal on its own', async () => {
        repository.editNoteTags.mockResolvedValue({ ...NOTE_A, tags: [] })

        await session.client.callTool({ name: 'edit_note_tags', arguments: { id: NOTE_A.id, remove: ['home'] } })

        expect(repository.editNoteTags).toHaveBeenCalledWith(NOTE_A.id, { add: [], remove: ['home'] })
      })

      it('requires at least one tag to add or remove', async () => {
        const result = await session.client.callTool({ name: 'edit_note_tags', arguments: { id: NOTE_A.id } })

        expect(result.isError).toBe(true)
        expect(textOf(result)).toBe('Provide at least one tag to add or remove')
        expect(repository.editNoteTags).not.toHaveBeenCalled()
      })

      it('treats blank-only lists as nothing to do', async () => {
        const result = await session.client.callTool({
          name: 'edit_note_tags',
          arguments: { id: NOTE_A.id, add: ['  '], remove: [''] },
        })

        expect(result.isError).toBe(true)
        expect(repository.editNoteTags).not.toHaveBeenCalled()
      })

      it('reports a missing note and repository failures', async () => {
        repository.editNoteTags.mockResolvedValue(null)
        const missing = await session.client.callTool({
          name: 'edit_note_tags',
          arguments: { id: NOTE_B.id, add: ['x'] },
        })
        expect(missing.isError).toBe(true)
        expect(textOf(missing)).toBe('Note not found')

        repository.editNoteTags.mockRejectedValue(new Error('conflict'))
        const failed = await session.client.callTool({
          name: 'edit_note_tags',
          arguments: { id: NOTE_A.id, add: ['x'] },
        })
        expect(failed.isError).toBe(true)
        expect(textOf(failed)).toBe('Failed to edit tags: conflict')
      })
    })
  })

  describe('semantic search', () => {
    let repository: jest.Mocked<NotebookRepository>
    let semanticSearch: { search: jest.Mock }
    let session: Awaited<ReturnType<typeof connect>>

    beforeEach(async () => {
      repository = createRepositoryMock()
      semanticSearch = { search: jest.fn() }
      session = await connect(repository, semanticSearch as unknown as SemanticSearch)
    })

    afterEach(async () => {
      await session.close()
    })

    it('is only registered when a search port is supplied', async () => {
      const { tools } = await session.client.listTools()
      expect(tools.map((tool) => tool.name)).toContain('search_notes_semantic')

      const withoutPort = await connect(createRepositoryMock())
      try {
        const listed = await withoutPort.client.listTools()
        expect(listed.tools.map((tool) => tool.name)).not.toContain('search_notes_semantic')
      } finally {
        await withoutPort.close()
      }
    })

    it('returns the matching notes with defaults applied', async () => {
      semanticSearch.search.mockResolvedValue({
        status: 'ok',
        notes: [{ id: NOTE_A.id, title: 'Groceries', tags: ['home'], similarity: 0.83, excerpts: ['milk'] }],
      })

      const result = await session.client.callTool({
        name: 'search_notes_semantic',
        arguments: { query: '  what to buy  ' },
      })

      expect(semanticSearch.search).toHaveBeenCalledWith({
        query: 'what to buy',
        limit: 10,
        minSimilarity: null,
        tag: null,
      })
      expect(result.isError).toBeFalsy()
      expect(result.structuredContent).toMatchObject({ total: 1 })
    })

    it('forwards the limit, threshold and tag', async () => {
      semanticSearch.search.mockResolvedValue({ status: 'ok', notes: [] })

      await session.client.callTool({
        name: 'search_notes_semantic',
        arguments: { query: 'x', limit: 3, min_similarity: 0.9, tag: 'home' },
      })

      expect(semanticSearch.search).toHaveBeenCalledWith({
        query: 'x',
        limit: 3,
        minSimilarity: 0.9,
        tag: 'home',
      })
    })

    it('explains an empty result without failing', async () => {
      semanticSearch.search.mockResolvedValue({ status: 'ok', notes: [] })

      const result = await session.client.callTool({
        name: 'search_notes_semantic',
        arguments: { query: 'x', min_similarity: 0.95 },
      })

      expect(result.isError).toBeFalsy()
      expect(result.structuredContent).toEqual({ notes: [], total: 0 })
      expect(textOf(result)).toContain('0.95')
    })

    it('relays a setup gap as an actionable message', async () => {
      semanticSearch.search.mockResolvedValue({
        status: 'unavailable',
        reason: 'missing_api_key',
        message: 'Semantic search needs a Gemini API key.',
      })

      const result = await session.client.callTool({ name: 'search_notes_semantic', arguments: { query: 'x' } })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toBe('Semantic search needs a Gemini API key.')
    })

    it('rejects an empty query and reports upstream failures', async () => {
      const invalid = await session.client.callTool({ name: 'search_notes_semantic', arguments: { query: '   ' } })
      expect(invalid.isError).toBe(true)
      expect(semanticSearch.search).not.toHaveBeenCalled()

      semanticSearch.search.mockRejectedValue(new Error('rag-search returned 500'))
      const failed = await session.client.callTool({ name: 'search_notes_semantic', arguments: { query: 'x' } })
      expect(failed.isError).toBe(true)
      expect(textOf(failed)).toBe('Semantic search failed: rag-search returned 500')
    })
  })
})
