import {
  EVERFREENOTE_COPY_ATTRIBUTE,
  EVERFREENOTE_COPY_KIND,
  NoteCopyService,
} from '@core/services/noteCopy'

describe('core/services/noteCopy', () => {
  it('wraps sanitized note HTML with the EverFreeNote self-copy marker', () => {
    const payload = NoteCopyService.buildPayload('<p>Hello <strong>world</strong></p>')

    expect(payload.html).toContain(`${EVERFREENOTE_COPY_ATTRIBUTE}="${EVERFREENOTE_COPY_KIND}"`)
    expect(payload.html).toContain('<p>Hello <strong>world</strong></p>')
  })

  it('builds readable plain text with preserved paragraph spacing', () => {
    const payload = NoteCopyService.buildPayload('<h2>Title</h2><p>First line<br />Second line</p><p>Next block</p>')

    expect(payload.text).toBe('Title\n\nFirst line\nSecond line\n\nNext block')
  })

  it('preserves task-list metadata needed for EverFreeNote round-trip', () => {
    const payload = NoteCopyService.buildPayload(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input checked="checked" disabled="disabled" type="checkbox"><span></span></label><div><p>Done</p></div></li></ul>',
    )

    expect(payload.html).toContain('data-type="taskList"')
    expect(payload.html).toContain('data-checked="true"')
    expect(payload.html).toContain('<input')
    expect(payload.html).toContain('type="checkbox"')
    expect(payload.text).toContain('[x] Done')
  })

  it('does not over-capture trailing markup in the regex fallback path', () => {
    const previous = globalThis.DOMParser
    globalThis.DOMParser = undefined as unknown as typeof DOMParser

    try {
      const payload = NoteCopyService.buildPayload('<p>Inner</p>')
      const htmlWithTrailingMarkup = `${payload.html}<div>extra</div>`

      expect(NoteCopyService.isSelfCopyHtml(htmlWithTrailingMarkup)).toBe(false)
      expect(NoteCopyService.unwrapSelfCopyHtml(htmlWithTrailingMarkup)).toContain('<p>Inner</p>')
      expect(NoteCopyService.unwrapSelfCopyHtml(htmlWithTrailingMarkup)).toContain('<div>extra</div>')
      expect(NoteCopyService.unwrapSelfCopyHtml(payload.html)).toBe('<p>Inner</p>')
    } finally {
      globalThis.DOMParser = previous
    }
  })

  it('requires the self-copy marker on the only top-level wrapper in the DOMParser path', () => {
    const payload = NoteCopyService.buildPayload('<p>Inner</p>')
    const htmlWithTrailingMarkup = `${payload.html}<div>extra</div>`
    const nestedMarker = `<section>${payload.html}</section>`

    expect(NoteCopyService.isSelfCopyHtml(payload.html)).toBe(true)
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
