import { parseRagIndexDebugChunks, parseRagIndexResult } from '@core/rag/indexResult'

const validChunk = {
  chunkIndex: 0,
  charOffset: 12,
  sectionHeading: 'Heading',
  title: 'Title',
  content: 'Chunk content',
  bodyContent: 'Body content',
  overlapPrefix: null,
}

describe('RAG index result additional branch behavior', () => {
  it('returns no debug chunks for null, non-record, or non-array input', () => {
    expect(parseRagIndexDebugChunks(null)).toEqual([])
    expect(parseRagIndexDebugChunks('not a record')).toEqual([])
    expect(parseRagIndexDebugChunks({ debugChunks: null })).toEqual([])
    expect(parseRagIndexDebugChunks({ debugChunks: {} })).toEqual([])
  })

  it('keeps valid debug chunks and drops non-record or malformed chunks', () => {
    const malformedChunks: unknown[] = [
      null,
      {},
      { ...validChunk, chunkIndex: '0' },
      { ...validChunk, content: 123 },
      { ...validChunk, bodyContent: null },
      { ...validChunk, overlapPrefix: 123 },
      { ...validChunk, sectionHeading: 123 },
      { ...validChunk, title: 123 },
    ]

    expect(parseRagIndexDebugChunks({ debugChunks: [validChunk, ...malformedChunks] })).toEqual([validChunk])
  })

  it('normalizes deleted aliases and non-record indexing responses', () => {
    expect(parseRagIndexResult(null)).toEqual({
      outcome: 'unknown',
      message: 'Indexing returned an empty response.',
      debugChunks: [],
    })
    expect(parseRagIndexResult('invalid')).toEqual({
      outcome: 'unknown',
      message: 'Indexing returned an empty response.',
      debugChunks: [],
    })
    expect(parseRagIndexResult({ outcome: 'deleted' })).toEqual({ outcome: 'deleted', message: null, debugChunks: [] })
    expect(parseRagIndexResult({ deleted: true })).toEqual({ outcome: 'deleted', message: null, debugChunks: [] })
  })

  it('preserves known and unknown skipped reasons with trimmed or fallback messages', () => {
    expect(parseRagIndexResult({ outcome: 'skipped', reason: 'too_short', message: '  Too short  ' })).toEqual({
      outcome: 'skipped',
      reason: 'too_short',
      chunkCount: 0,
      message: 'Too short',
      debugChunks: [],
    })
    expect(parseRagIndexResult({ skipped: 'provider_limit', message: '  Provider limit  ' })).toMatchObject({
      outcome: 'skipped',
      reason: null,
      chunkCount: 0,
      message: 'Provider limit',
    })
    expect(parseRagIndexResult({ outcome: 'skipped', message: '   ' })).toMatchObject({
      outcome: 'skipped',
      reason: null,
      chunkCount: 0,
      message: 'Indexing was skipped.',
    })
  })

  it('normalizes indexed positive counts and clamps invalid dropped counts', () => {
    expect(parseRagIndexResult({ outcome: 'indexed', chunkCount: 3, droppedChunks: -2, debugChunks: [validChunk] })).toEqual({
      outcome: 'indexed',
      chunkCount: 3,
      droppedChunks: 0,
      message: null,
      debugChunks: [validChunk],
    })
    expect(parseRagIndexResult({ chunkCount: 2 })).toMatchObject({
      outcome: 'indexed',
      chunkCount: 2,
      droppedChunks: 0,
    })
  })

  it('distinguishes zero and unknown counts and applies the corresponding fallbacks', () => {
    expect(parseRagIndexResult({ chunkCount: 0, message: '  No chunks  ' })).toEqual({
      outcome: 'unknown',
      message: 'No chunks',
      debugChunks: [],
    })
    expect(parseRagIndexResult({ chunkCount: 0, message: '' })).toMatchObject({
      outcome: 'unknown',
      message: 'Indexing completed without creating any chunks.',
    })
    expect(parseRagIndexResult({ outcome: 'indexed', message: '' })).toMatchObject({
      outcome: 'unknown',
      message: 'Indexing returned an unexpected response.',
    })
    expect(parseRagIndexResult({ chunkCount: -1, message: '  Unknown count  ' })).toEqual({
      outcome: 'unknown',
      message: 'Unknown count',
      debugChunks: [],
    })
  })
})
