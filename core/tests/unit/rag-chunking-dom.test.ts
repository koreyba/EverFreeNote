/** @jest-environment jsdom */

import { buildRagIndexChunks } from '../../rag/chunking'
import { getRagChunkBodyText } from '../../rag/chunkTemplate'
import { RAG_INDEX_EDITABLE_DEFAULTS } from '../../rag/indexingSettings'

describe('RAG chunking with DOMParser', () => {
  it('walks headings, semantic containers, nested blocks and lists', () => {
    const html = '<main><h2>Heading</h2><div><p>First paragraph with enough words.</p><blockquote>Quoted text.</blockquote></div><ol><li>First item</li><li>Second item</li></ol><ul><li>Bullet item</li></ul></main>'
    const chunks = buildRagIndexChunks({
      title: 'DOM note', html, tags: [], settings: {
        ...RAG_INDEX_EDITABLE_DEFAULTS, min_chunk_size: 10, target_chunk_size: 500, max_chunk_size: 1500, overlap: 0,
      },
    })
    const body = chunks.map((chunk) => getRagChunkBodyText(chunk.content)).join('\n')
    expect(body).toContain('First paragraph')
    expect(body).toContain('1. First item')
    expect(body).toContain('2. Second item')
    expect(body).toContain('- Bullet item')
    expect(chunks.every((chunk) => chunk.sectionHeading === 'Heading')).toBe(true)
  })

  it('handles plain text and malformed HTML through DOM parsing', () => {
    const chunks = buildRagIndexChunks({
      title: 'Plain', html: 'First paragraph\n\nSecond paragraph', tags: [], settings: {
        ...RAG_INDEX_EDITABLE_DEFAULTS, min_chunk_size: 5, target_chunk_size: 500, max_chunk_size: 1500, overlap: 0,
      },
    })
    expect(chunks).toHaveLength(1)
    expect(getRagChunkBodyText(chunks[0].content)).toContain('First paragraph')
    expect(getRagChunkBodyText(chunks[0].content)).toContain('Second paragraph')
  })

  it('handles DOM comments, empty list items and non-block containers', () => {
    const chunks = buildRagIndexChunks({
      title: 'DOM edges',
      html: '<!-- ignored --><span>Loose text</span><div><span>Nested text</span></div><ul><li></li><li>Useful item</li>text</ul><h7>Not a heading</h7><p>Final paragraph.</p>',
      tags: [],
      settings: { ...RAG_INDEX_EDITABLE_DEFAULTS, min_chunk_size: 5, target_chunk_size: 500, max_chunk_size: 1500, overlap: 0 },
    })
    const body = chunks.map((chunk) => getRagChunkBodyText(chunk.content)).join('\n')
    expect(body).toContain('Loose text')
    expect(body).toContain('- Useful item')
    expect(body).toContain('Final paragraph.')
    expect(body).not.toContain('1. ')
  })

  it('uses the regex fallback for headings, lists, nesting and malformed tags', () => {
    const previous = globalThis.DOMParser
    delete (globalThis as { DOMParser?: typeof DOMParser }).DOMParser
    try {
      const regexHtml = '<h2>Regex heading</h2><p>First paragraph</p><ol><li>One</li><li>Two</li></ol><ul><li>Bullet</li></ul>'
      const chunks = buildRagIndexChunks({
        title: 'Regex', html: regexHtml, tags: [],
        settings: { ...RAG_INDEX_EDITABLE_DEFAULTS, min_chunk_size: 5, target_chunk_size: 500, max_chunk_size: 1500, overlap: 0 },
      })
      const body = chunks.map((chunk) => getRagChunkBodyText(chunk.content)).join('\n')
      expect(chunks.some((chunk) => chunk.sectionHeading === 'Regex heading')).toBe(true)
      expect(body).toContain('1. One')
      expect(body).toContain('- Bullet')

      const malformedCases = [
        { html: '<ol', expected: '<ol' },
        { html: '<ol><li>unfinished', expected: 'unfinished' },
        { html: '<ul><li>one</li><ul>unfinished', expected: 'unfinished' },
      ]
      for (const { html, expected } of malformedCases) {
        const malformed = buildRagIndexChunks({
          title: 'Malformed', html, tags: [],
          settings: { ...RAG_INDEX_EDITABLE_DEFAULTS, min_chunk_size: 1, target_chunk_size: 500, max_chunk_size: 1500, overlap: 0 },
        })
        expect(malformed.length).toBeGreaterThan(0)
        expect(malformed.map((chunk) => chunk.bodyContent).join('\n')).toContain(expected)
      }
    } finally {
      globalThis.DOMParser = previous
    }
  })

  it('splits oversized text at whitespace, sentence and hard boundaries', () => {
    const settings = { ...RAG_INDEX_EDITABLE_DEFAULTS, min_chunk_size: 5, target_chunk_size: 10, max_chunk_size: 10, overlap: 0 }
    const withSpaces = buildRagIndexChunks({ title: 'spaces', html: `<p>${'word '.repeat(8)}</p>`, tags: [], settings })
    expect(withSpaces.length).toBeGreaterThan(1)
    expect(withSpaces.every((chunk) => chunk.bodyContent.length > 0)).toBe(true)
    expect(withSpaces.map((chunk) => chunk.bodyContent).join(' ')).toMatch(/word(?:\s+word){7}/)

    const sentencePartial = buildRagIndexChunks({
      title: 'sentence', html: '<p>tiny</p><p>first sentence. second sentence remains</p>', tags: [],
      settings: { ...settings, min_chunk_size: 12, max_chunk_size: 20, target_chunk_size: 20 },
    })
    expect(sentencePartial.length).toBeGreaterThan(1)
    const sentenceBody = sentencePartial.map((chunk) => chunk.bodyContent).join(' ')
    expect(sentenceBody).toContain('tiny')
    expect(sentenceBody).toContain('first sentence.')
    expect(sentenceBody).toContain('second sentence remains')

    const noRemainder = buildRagIndexChunks({
      title: 'remainder', html: `<p>${'a'.repeat(9)}</p><p>bb</p><p>${'c'.repeat(20)}</p>`, tags: [],
      settings: { ...settings, min_chunk_size: 20, max_chunk_size: 10, target_chunk_size: 10 },
    })
    expect(noRemainder.length).toBeGreaterThan(0)
    const remainderBody = noRemainder.map((chunk) => chunk.bodyContent).join('')
    expect(remainderBody).toContain('a'.repeat(9))
    expect(remainderBody).toContain('bb')
    expect(remainderBody.replaceAll(/\s/g, '')).toContain('c'.repeat(20))
  })

  it('closes an existing chunk before an oversized paragraph in the same section', () => {
    const chunks = buildRagIndexChunks({
      title: 'oversized after text', html: `<p>${'a'.repeat(20)}</p><p>${'b'.repeat(40)}</p>`, tags: [],
      settings: { ...RAG_INDEX_EDITABLE_DEFAULTS, min_chunk_size: 5, target_chunk_size: 10, max_chunk_size: 20, overlap: 0 },
    })
    expect(chunks.length).toBeGreaterThan(2)
    expect(chunks[0].bodyContent).toContain('a')
    expect(chunks.every((chunk) => chunk.bodyContent.length > 0)).toBe(true)
    expect(chunks.map((chunk) => chunk.bodyContent).join('')).toContain('b'.repeat(40))
  })

  it('exercises malformed-list and character fallback branches without DOMParser', () => {
    const previous = globalThis.DOMParser
    delete (globalThis as { DOMParser?: typeof DOMParser }).DOMParser
    try {
      const malformed = buildRagIndexChunks({
        title: 'Fallback', html: '<ol><li>unfinished', tags: null, settings: {
          ...RAG_INDEX_EDITABLE_DEFAULTS, min_chunk_size: 5, target_chunk_size: 20, max_chunk_size: 20, overlap: 0,
        },
      })
      expect(malformed.length).toBeGreaterThan(0)
      expect(malformed.map((chunk) => chunk.bodyContent).join('\n')).toContain('unfinished')
      const oversized = buildRagIndexChunks({
        title: 'Solid', html: `<p>${'x'.repeat(45)}</p>`, tags: [null, 'tag', 1] as never, settings: {
          ...RAG_INDEX_EDITABLE_DEFAULTS, min_chunk_size: 5, target_chunk_size: 10, max_chunk_size: 20, overlap: 1,
        },
      })
      expect(oversized.length).toBeGreaterThan(1)
      expect(oversized.every((chunk) => chunk.bodyContent.length > 0)).toBe(true)
      expect(oversized.map((chunk) => chunk.bodyContent).join('')).toContain('x'.repeat(45))
    } finally {
      globalThis.DOMParser = previous
    }
  })
})
