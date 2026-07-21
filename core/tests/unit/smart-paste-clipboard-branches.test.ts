import { SmartPasteService } from '../../services/smartPaste'
import { NoteClipboardService } from '../../services/noteClipboard'
import { SanitizationService } from '../../services/sanitizer'

describe('smart paste and clipboard branch behavior', () => {
  it('builds clipboard payloads and handles empty/empty-text detection', () => {
    const event = { clipboardData: {
      getData: jest.fn((type: string) => type === 'text/html' ? ' <p>Html</p> ' : 'plain'),
      types: ['text/html', 'text/plain'],
    } } as unknown as ClipboardEvent
    expect(SmartPasteService.buildPayload(event)).toEqual({ html: ' <p>Html</p> ', text: 'plain', types: ['text/html', 'text/plain'] })
    expect(SmartPasteService.buildPayload({} as ClipboardEvent)).toEqual({ html: null, text: null, types: [] })
    expect(SmartPasteService.detectPasteType({ html: null, text: null, types: [] })).toMatchObject({ type: 'plain', confidence: 0.5 })
  })

  it('falls back to plain text for forced oversized markdown and html-only payloads', () => {
    const oversized = SmartPasteService.resolvePaste({ html: null, text: 'x'.repeat(20), types: ['text/plain'] }, { maxLength: 10 }, 'markdown')
    expect(oversized.type).toBe('plain')
    expect(oversized.warnings).toContain('plain:oversized-text')
    const htmlOnly = SmartPasteService.resolvePaste({ html: '<p>Visible</p>', text: null, types: ['text/html'] }, {}, 'plain')
    expect(htmlOnly.type).toBe('plain')
    expect(htmlOnly.html).toContain('Visible')
  })

  it('handles empty and protocol-relative links/images and malformed style declarations', () => {
    const previous = globalThis.DOMParser
    delete (globalThis as { DOMParser?: typeof DOMParser }).DOMParser
    const sanitize = jest.spyOn(SanitizationService, 'sanitize').mockImplementation((value) => value)
    try {
      const html = '<p><span style=": red; color: ; font-weight: bold">Styled</span><a href="">Empty</a><a href="//remote.test">Protocol relative</a><img src=""><img src="//remote.test/a.png"></p>'
      const result = SmartPasteService.resolvePaste({ html, text: null, types: ['text/html'] })
      expect(result.type).toBe('html')
      expect(result.html).toContain('font-weight: bold')
      expect(result.html).not.toContain('color:')
      expect(result.html).not.toContain('href=""')
      expect(result.html).not.toContain('//remote.test')
    } finally {
      sanitize.mockRestore()
      globalThis.DOMParser = previous
    }
  })

  it('allows safe self-copy data images and removes unsafe image protocols', () => {
    const html = '<div data-everfreenote-copy="note-body"><p><img src="data:image/png;base64,AQ=="><img src="data:image/svg+xml;base64,AQ=="><img src="file:///tmp/a.png"><img src="https://cdn.test/a.png"></p></div>'
    const result = SmartPasteService.resolvePaste({ html, text: 'images', types: ['text/html', 'text/plain'] })
    expect(result.type).toBe('html')
    expect(result.html).toContain('data:image/png;base64,AQ==')
    expect(result.html).toContain('https://cdn.test/a.png')
    expect(result.html).not.toContain('svg+xml')
    expect(result.html).not.toContain('file:///tmp')
  })

  it('preserves clipboard blank lines and readable plain text degradation', () => {
    expect(NoteClipboardService.isBodyEmpty('')).toBe(true)
    expect(NoteClipboardService.isBodyEmpty('<p><img src="x" alt="Image"/></p>')).toBe(false)
    const payload = NoteClipboardService.buildPayload('<p>One</p><p>Two</p><p></p><p>Three</p>')
    expect(payload.html).toContain('data-everfreenote-gap="1"')
    expect(payload.text).toContain('One\n')
    expect(NoteClipboardService.restoreEditorHtml(payload.html)).not.toContain('data-everfreenote-gap')
    expect(NoteClipboardService.restoreEditorHtml('<p><br></p>')).toBe('<p></p>')
    expect(NoteClipboardService.htmlToPlainText('<p>A&nbsp;B</p><p><img alt="Alt"/></p><p><img/></p>')).toContain('Alt')
    expect(NoteClipboardService.htmlToPlainText('<p>A&nbsp;B</p><p><img alt="Alt"/></p><p><img/></p>')).toContain('[image]')
  })
})
