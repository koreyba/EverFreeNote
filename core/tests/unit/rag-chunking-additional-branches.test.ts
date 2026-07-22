/** @jest-environment jsdom */

import { buildRagIndexChunks } from '../../rag/chunking'
import { getRagChunkBodyText } from '../../rag/chunkTemplate'
import { RAG_INDEX_EDITABLE_DEFAULTS, type RagIndexingEditableSettings } from '../../rag/indexingSettings'

const settings = (overrides: Partial<RagIndexingEditableSettings> = {}): RagIndexingEditableSettings => ({
  ...RAG_INDEX_EDITABLE_DEFAULTS,
  min_chunk_size: 5,
  target_chunk_size: 500,
  max_chunk_size: 1500,
  overlap: 0,
  ...overrides,
})

const body = (chunks: ReturnType<typeof buildRagIndexChunks>) =>
  chunks.map((chunk) => getRagChunkBodyText(chunk.content)).join('\n')

describe('RAG chunking additional edge behavior', () => {
  it('extracts text around DOM comments and line breaks while ignoring empty list items', () => {
    const chunks = buildRagIndexChunks({
      title: 'DOM edges',
      html: '<p>Before<!-- ignored -->after<br>line</p><ul><li><!-- empty --></li><li>Visible <br> item</li></ul>',
      tags: [],
      settings: settings(),
    })

    const text = body(chunks)
    expect(text).toContain('Beforeafter')
    expect(text).toContain('line')
    expect(text).toContain('- Visible item')
    expect(text).not.toContain('ignored')
  })

  it('preserves valid nested lists and text when regex fallback sees non-list tags', () => {
    const previous = globalThis.DOMParser
    delete (globalThis as { DOMParser?: typeof DOMParser }).DOMParser
    try {
      const chunks = buildRagIndexChunks({
        title: 'Regex edges',
        html: '<ul>intro<li>outer<ul><li>nested</li></ul></li><liquid>not a list tag</li><li>last</li></ul>',
        tags: [],
        settings: settings(),
      })

      const text = body(chunks)
      expect(text).toContain('intro')
      expect(text).toContain('- outer')
      expect(text).toContain('- nested')
      expect(text).toContain('- last')
      expect(text).toContain('not a list tag')
    } finally {
      globalThis.DOMParser = previous
    }
  })

  it('keeps malformed list markup as text instead of discarding the source', () => {
    const previous = globalThis.DOMParser
    delete (globalThis as { DOMParser?: typeof DOMParser }).DOMParser
    try {
      const malformedTag = buildRagIndexChunks({
        title: 'Malformed tag',
        html: '<ul><li unfinished>content</ul>',
        tags: [],
        settings: settings(),
      })
      const malformedItem = buildRagIndexChunks({
        title: 'Malformed item',
        html: '<ol><li>unfinished',
        tags: [],
        settings: settings(),
      })

      expect(body(malformedTag)).toContain('content')
      expect(body(malformedItem)).toContain('unfinished')
    } finally {
      globalThis.DOMParser = previous
    }
  })

  it('uses whitespace, sentence and hard boundaries when satisfying a minimum chunk size', () => {
    const sentence = buildRagIndexChunks({
      title: 'Sentence partial',
      html: '<p>a</p><p>first part. remaining words</p>',
      tags: [],
      settings: settings({ min_chunk_size: 10, target_chunk_size: 10, max_chunk_size: 21 }),
    })
    const whitespace = buildRagIndexChunks({
      title: 'Whitespace partial',
      html: '<p>a</p><p>abcdef ghijkl</p>',
      tags: [],
      settings: settings({ min_chunk_size: 9, target_chunk_size: 10, max_chunk_size: 13 }),
    })
    const hard = buildRagIndexChunks({
      title: 'Hard partial',
      html: '<p>a</p><p>abcdefghijk</p>',
      tags: [],
      settings: settings({ min_chunk_size: 10, target_chunk_size: 10, max_chunk_size: 11 }),
    })

    expect(body(sentence)).toContain('first part.')
    expect(body(sentence)).toContain('remaining words')
    expect(body(whitespace)).toContain('abcdef')
    expect(body(whitespace)).toContain('ghijkl')
    expect(body(hard)).toContain('abcdefg')
    expect(body(hard)).toContain('hijk')
    expect(sentence.every((chunk) => chunk.bodyContent.length > 0)).toBe(true)
  })

  it('closes a nearly complete chunk before a new block when the minimum is already met', () => {
    const chunks = buildRagIndexChunks({
      title: 'Minimum boundary',
      html: '<p>1234</p><p>abcdefghijk</p>',
      tags: [],
      settings: settings({ min_chunk_size: 5, target_chunk_size: 5, max_chunk_size: 11 }),
    })

    expect(chunks.map((chunk) => chunk.bodyContent)).toEqual(['1234', 'abcdefghijk'])
  })

  it('merges an undersized same-section tail only when it fits, not across sections', () => {
    const merged = buildRagIndexChunks({
      title: 'Merge tail',
      html: '<p>1234567890</p><p>abcdefghij</p><p>x</p>',
      tags: [],
      settings: settings({ min_chunk_size: 15, target_chunk_size: 15, max_chunk_size: 30 }),
    })
    const tooLarge = buildRagIndexChunks({
      title: 'Keep tail',
      html: '<p>1234567890</p><p>abcdefghijklmnopqrst</p><p>x</p>',
      tags: [],
      settings: settings({ min_chunk_size: 5, target_chunk_size: 15, max_chunk_size: 22 }),
    })
    const differentSection = buildRagIndexChunks({
      title: 'Section tail',
      html: '<h2>First</h2><p>1234567890</p><h2>Second</h2><p>x</p>',
      tags: [],
      settings: settings({ min_chunk_size: 5, target_chunk_size: 15, max_chunk_size: 30 }),
    })

    const assertChunkIntegrity = (
      chunks: ReturnType<typeof buildRagIndexChunks>,
      expectedBodies: string[],
      expectedSections: Array<string | null>,
    ) => {
      expect(chunks.map((chunk) => chunk.bodyContent)).toEqual(expectedBodies)
      expect(chunks.map((chunk) => getRagChunkBodyText(chunk.content))).toEqual(expectedBodies)
      expect(chunks.map((chunk) => chunk.sectionHeading)).toEqual(expectedSections)
      expect(chunks.every((chunk) => chunk.bodyContent.length > 0)).toBe(true)
      expect(new Set(chunks.map((chunk) => chunk.bodyContent)).size).toBe(chunks.length)
    }

    assertChunkIntegrity(
      merged,
      ['1234567890\n\nabcdefghij\n\nx'],
      [null],
    )
    assertChunkIntegrity(
      tooLarge,
      ['1234567890', 'abcdefghijklmnopqrst', 'x'],
      [null, null, null],
    )
    assertChunkIntegrity(
      differentSection,
      ['1234567890', 'x'],
      ['First', 'Second'],
    )
  })

  it('adds overlap from the suffix or from the last complete sentence without crossing sections', () => {
    const suffixOverlap = buildRagIndexChunks({
      title: 'Suffix overlap',
      html: '<p>abcdefghij</p><p>klmnopqrst</p>',
      tags: [],
      settings: settings({ target_chunk_size: 10, max_chunk_size: 20, overlap: 4 }),
    })
    const sentenceOverlap = buildRagIndexChunks({
      title: 'Sentence overlap',
      html: '<p>First sentence. More text</p><p>Next paragraph</p>',
      tags: [],
      settings: settings({ target_chunk_size: 20, max_chunk_size: 30, overlap: 10 }),
    })
    const sectionBoundary = buildRagIndexChunks({
      title: 'No cross-section overlap',
      html: '<h2>First</h2><p>First section text</p><h2>Second</h2><p>Second section text</p>',
      tags: [],
      settings: settings({ target_chunk_size: 10, max_chunk_size: 30, overlap: 5 }),
    })

    expect(suffixOverlap[1].overlapPrefix).toBe('ghij')
    expect(sentenceOverlap[1].overlapPrefix).toBe('More text')
    expect(sectionBoundary[1].overlapPrefix).toBe('')
  })
})
