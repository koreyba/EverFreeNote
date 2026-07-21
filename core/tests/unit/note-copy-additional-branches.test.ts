/** @jest-environment jsdom */

import {
  EVERFREENOTE_COPY_ATTRIBUTE,
  EVERFREENOTE_COPY_KIND,
  NoteCopyService,
} from '@core/services/noteCopy'

const wrapSelfCopy = (innerHtml: string, attributes = '') =>
  `<div ${EVERFREENOTE_COPY_ATTRIBUTE}="${EVERFREENOTE_COPY_KIND}"${attributes}>${innerHtml}</div>`

describe('NoteCopyService additional branches', () => {
  describe('wrapper recognition', () => {
    it('accepts whitespace around the exact wrapper and rejects kind/attribute variants', () => {
      expect(NoteCopyService.isSelfCopyHtml(`  ${wrapSelfCopy('<p>Copied</p>')}  `)).toBe(true)
      expect(NoteCopyService.isSelfCopyHtml('<div data-everfreenote-copy="other"><p>Copied</p></div>')).toBe(false)
      expect(NoteCopyService.isSelfCopyHtml('<div data-other-copy="note-body"><p>Copied</p></div>')).toBe(false)
      expect(NoteCopyService.isSelfCopyHtml('<span data-everfreenote-copy="note-body"><p>Copied</p></span>')).toBe(false)
      expect(NoteCopyService.isSelfCopyHtml('<div data-everfreenote-copy="NOTE-BODY"><p>Copied</p></div>')).toBe(false)
    })

    it('requires one top-level wrapper even when the wrapper itself has harmless attributes', () => {
      expect(NoteCopyService.isSelfCopyHtml(wrapSelfCopy('<p>Copied</p>', ' class="clipboard"'))).toBe(true)
      expect(NoteCopyService.isSelfCopyHtml(`${wrapSelfCopy('<p>Copied</p>')}<p>sibling</p>`)).toBe(false)
      expect(NoteCopyService.isSelfCopyHtml(`<div class="outer">${wrapSelfCopy('<p>Copied</p>')}</div>`)).toBe(false)
    })
  })

  describe('unwrap behavior', () => {
    it('unwraps an empty wrapper to an empty string and preserves nested inner HTML exactly', () => {
      expect(NoteCopyService.unwrapSelfCopyHtml(wrapSelfCopy(''))).toBe('')

      const nested = wrapSelfCopy('<div class="nested"><p>A</p></div><p data-type="taskItem">B</p>')
      expect(NoteCopyService.unwrapSelfCopyHtml(nested)).toBe(
        '<div class="nested"><p>A</p></div><p data-type="taskItem">B</p>',
      )
    })

    it('does not unwrap a wrong-kind or non-wrapper element and still sanitizes it', () => {
      const wrongKind = '<div data-everfreenote-copy="other"><p onclick="alert(1)">Safe</p></div>'
      const regularHtml = '<section><p onclick="alert(1)">Safe</p></section>'

      const wrongKindResult = NoteCopyService.unwrapSelfCopyHtml(wrongKind)
      const regularResult = NoteCopyService.unwrapSelfCopyHtml(regularHtml)

      expect(wrongKindResult).toContain('data-everfreenote-copy="other"')
      expect(wrongKindResult).toContain('<p>Safe</p>')
      expect(wrongKindResult).not.toContain('onclick')
      expect(regularResult).toContain('<p>Safe</p>')
      expect(regularResult).not.toContain('onclick')
    })

    it('returns sanitized input for a wrapper with missing or extra closing structure', () => {
      const missingClosing = `${wrapSelfCopy('<p>Safe</p>')}`.replace('</div>', '')
      const extraClosing = `${wrapSelfCopy('<p>Safe</p>')}</div>`

      expect(NoteCopyService.unwrapSelfCopyHtml(missingClosing)).toContain('<p>Safe</p>')
      expect(NoteCopyService.unwrapSelfCopyHtml(extraClosing)).toContain('<p>Safe</p>')
    })
  })

  describe('DOMParser fallback semantics', () => {
    it('recognizes and unwraps a valid wrapper when DOMParser is unavailable', () => {
      const previous = globalThis.DOMParser
      globalThis.DOMParser = undefined as unknown as typeof DOMParser

      try {
        const html = wrapSelfCopy('<div><p>Fallback</p></div>')

        expect(NoteCopyService.isSelfCopyHtml(html)).toBe(true)
        expect(NoteCopyService.unwrapSelfCopyHtml(html)).toBe('<div><p>Fallback</p></div>')
        expect(NoteCopyService.isSelfCopyHtml(`${html}<p>outside</p>`)).toBe(false)
      } finally {
        globalThis.DOMParser = previous
      }
    })

    it('falls back to the exact regex boundary when DOMParser throws', () => {
      const previous = globalThis.DOMParser
      class ThrowingDOMParser {
        parseFromString(): never {
          throw new Error('parser unavailable')
        }
      }
      globalThis.DOMParser = ThrowingDOMParser as unknown as typeof DOMParser

      try {
        const html = wrapSelfCopy('<p>Fallback</p>')

        expect(NoteCopyService.isSelfCopyHtml(html)).toBe(true)
        expect(NoteCopyService.unwrapSelfCopyHtml(html)).toBe('<p>Fallback</p>')
        expect(NoteCopyService.isSelfCopyHtml(`${html} trailing`)).toBe(false)
      } finally {
        globalThis.DOMParser = previous
      }
    })
  })
})
