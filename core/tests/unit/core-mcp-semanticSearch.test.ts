import {
  MAX_EXCERPTS_PER_NOTE,
  MAX_EXCERPT_LENGTH,
  describeEmptyResult,
  groupChunksByNote,
  mapUnavailableResponse,
  type RagSearchChunk,
} from '@core/mcp/semanticSearch'

const chunk = (overrides: Partial<RagSearchChunk> = {}): RagSearchChunk => ({
  noteId: 'note-1',
  noteTitle: 'Groceries',
  noteTags: ['home'],
  content: 'milk and eggs',
  similarity: 0.8,
  ...overrides,
})

describe('core/mcp/semanticSearch', () => {
  describe('groupChunksByNote', () => {
    it('returns one entry per note, keeping the best similarity', () => {
      const result = groupChunksByNote(
        [chunk({ similarity: 0.6, content: 'first' }), chunk({ similarity: 0.9, content: 'second' })],
        10,
      )

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ id: 'note-1', title: 'Groceries', tags: ['home'], similarity: 0.9 })
      expect(result[0].excerpts).toEqual(['first', 'second'])
    })

    it('orders notes by similarity descending', () => {
      const result = groupChunksByNote(
        [chunk({ noteId: 'a', similarity: 0.4 }), chunk({ noteId: 'b', similarity: 0.95 })],
        10,
      )
      expect(result.map((note) => note.id)).toEqual(['b', 'a'])
    })

    it('applies the limit after ordering', () => {
      const result = groupChunksByNote(
        [chunk({ noteId: 'a', similarity: 0.4 }), chunk({ noteId: 'b', similarity: 0.9 }), chunk({ noteId: 'c', similarity: 0.7 })],
        2,
      )
      expect(result.map((note) => note.id)).toEqual(['b', 'c'])
    })

    it('caps and de-duplicates excerpts per note', () => {
      const chunks = ['one', 'two', 'three', 'four', 'two'].map((content, index) =>
        chunk({ content, similarity: 0.9 - index / 100 }),
      )

      expect(groupChunksByNote(chunks, 10)[0].excerpts).toEqual(['one', 'two', 'three'])
      expect(MAX_EXCERPTS_PER_NOTE).toBe(3)
    })

    it('normalises whitespace and truncates a long passage', () => {
      const result = groupChunksByNote([chunk({ content: `a\n\n  b  ${'x'.repeat(400)}` })], 10)
      const excerpt = result[0].excerpts[0]

      expect(excerpt.startsWith('a b ')).toBe(true)
      expect(excerpt.length).toBeLessThanOrEqual(MAX_EXCERPT_LENGTH)
      expect(excerpt.endsWith('…')).toBe(true)
    })

    it('tolerates missing titles, tags and content', () => {
      const result = groupChunksByNote([chunk({ noteTitle: null, noteTags: null, content: null })], 10)
      expect(result[0]).toMatchObject({ title: '', tags: [], excerpts: [] })
    })

    it('skips chunks without a note id and handles an empty input', () => {
      expect(groupChunksByNote([chunk({ noteId: '' })], 10)).toEqual([])
      expect(groupChunksByNote([], 10)).toEqual([])
    })
  })

  describe('mapUnavailableResponse', () => {
    it('reports a missing Gemini key as a setup gap', () => {
      const outcome = mapUnavailableResponse(400, { error: 'Gemini API key not configured. Add it in Settings.' })

      expect(outcome).toMatchObject({ status: 'unavailable', reason: 'missing_api_key' })
      expect(outcome?.status === 'unavailable' && outcome.message).toContain('Settings')
    })

    it('reports an embedding-model mismatch by status or by code', () => {
      expect(mapUnavailableResponse(409, {})).toMatchObject({ reason: 'model_mismatch' })
      expect(mapUnavailableResponse(500, { code: 'EMBEDDING_MODEL_MISMATCH' })).toMatchObject({
        reason: 'model_mismatch',
      })
    })

    it('reports a missing rag-search deployment', () => {
      expect(mapUnavailableResponse(404, null)).toMatchObject({ reason: 'not_configured' })
    })

    it('returns null for genuine failures so the caller surfaces them', () => {
      expect(mapUnavailableResponse(500, { error: 'Internal error' })).toBeNull()
      expect(mapUnavailableResponse(400, { error: 'Missing or empty query' })).toBeNull()
      expect(mapUnavailableResponse(401, { error: 'Unauthorized' })).toBeNull()
    })
  })

  describe('describeEmptyResult', () => {
    it('names the threshold when the caller set one', () => {
      expect(describeEmptyResult(0.8)).toContain('0.8')
      expect(describeEmptyResult(null)).toContain('configured for this notebook')
    })
  })
})
