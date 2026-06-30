import {
  EVERFREENOTE_COPY_ATTRIBUTE,
  EVERFREENOTE_COPY_KIND,
  NoteCopyService,
} from '@core/services/noteCopy'

function wrapSelfCopy(innerHtml: string): string {
  return `<div ${EVERFREENOTE_COPY_ATTRIBUTE}="${EVERFREENOTE_COPY_KIND}">${innerHtml}</div>`
}

describe('core/services/noteCopy', () => {
  it('does not over-capture trailing markup in the regex fallback path', () => {
    const previous = globalThis.DOMParser
    globalThis.DOMParser = undefined as unknown as typeof DOMParser

    try {
      const html = wrapSelfCopy('<p>Inner</p>')
      const htmlWithTrailingMarkup = `${html}<div>extra</div>`

      expect(NoteCopyService.isSelfCopyHtml(htmlWithTrailingMarkup)).toBe(false)
      expect(NoteCopyService.unwrapSelfCopyHtml(htmlWithTrailingMarkup)).toContain('<p>Inner</p>')
      expect(NoteCopyService.unwrapSelfCopyHtml(htmlWithTrailingMarkup)).toContain('<div>extra</div>')
      expect(NoteCopyService.unwrapSelfCopyHtml(html)).toBe('<p>Inner</p>')
    } finally {
      globalThis.DOMParser = previous
    }
  })

  it('requires the self-copy marker on the only top-level wrapper in the DOMParser path', () => {
    const html = wrapSelfCopy('<p>Inner</p>')
    const htmlWithTrailingMarkup = `${html}<div>extra</div>`
    const nestedMarker = `<section>${html}</section>`

    expect(NoteCopyService.isSelfCopyHtml(html)).toBe(true)
    expect(NoteCopyService.isSelfCopyHtml(htmlWithTrailingMarkup)).toBe(false)
    expect(NoteCopyService.isSelfCopyHtml(nestedMarker)).toBe(false)
  })

  it('returns sanitized HTML when parser unwrap fails and fallback cannot match', () => {
    const originalDOMParser = globalThis.DOMParser
    class ThrowingDOMParser {
      parseFromString() {
        throw new Error('parse failed')
      }
    }
    globalThis.DOMParser = ThrowingDOMParser as unknown as typeof DOMParser

    try {
      const malformedSelfCopy = `<div ${EVERFREENOTE_COPY_ATTRIBUTE}="${EVERFREENOTE_COPY_KIND}" onclick="alert(1)"><script>alert(1)</script><p>Safe</p>`
      const result = NoteCopyService.unwrapSelfCopyHtml(malformedSelfCopy)

      expect(result).toContain('<p>Safe</p>')
      expect(result).not.toContain('<script')
      expect(result).not.toContain('onclick')
    } finally {
      globalThis.DOMParser = originalDOMParser
    }
  })

  it('sanitizes fallback-unwrapped HTML before returning it', () => {
    const previous = globalThis.DOMParser
    globalThis.DOMParser = undefined as unknown as typeof DOMParser

    try {
      const unsafePayload = `<div ${EVERFREENOTE_COPY_ATTRIBUTE}="${EVERFREENOTE_COPY_KIND}"><p onclick="alert(1)">Safe</p><script>alert(1)</script></div>`
      const result = NoteCopyService.unwrapSelfCopyHtml(unsafePayload)

      expect(result).toContain('<p>Safe</p>')
      expect(result).not.toContain('onclick')
      expect(result).not.toContain('<script')
    } finally {
      globalThis.DOMParser = previous
    }
  })
})
