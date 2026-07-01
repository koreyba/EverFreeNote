import { Editor } from '@tiptap/core'
import { editorExtensions } from '@/components/editorExtensions'
import { SmartPasteService } from '@core/services/smartPaste'
import { NoteCopyService } from '@core/services/noteCopy'
import { NoteClipboardService } from '@core/services/noteClipboard'
import { SanitizationService } from '@core/services/sanitizer'

/**
 * Regression guard for the self-copy round-trip in a real DOM environment.
 *
 * The core suite runs in node (no DOMParser) and exercises only the regex
 * fallback, which masked a bug where the editor-self-copy sanitize profile
 * stripped the `data-everfreenote-copy` marker before detection — sending
 * paste down the default path that drops inline styles (alignment, font-size,
 * color). These tests run in jsdom (DOMParser present), matching production
 * web + WebView behavior.
 */
describe('self-copy round-trip (jsdom / DOMParser path)', () => {
  it('detects the self-copy marker after sanitization', () => {
    const payload = NoteClipboardService.buildPayload('<p style="text-align: center">Hi</p>')
    expect(NoteCopyService.isSelfCopyHtml(payload.html)).toBe(true)
  })

  it('keeps the self-copy marker through sanitization (regression for the dropped-marker bug)', () => {
    const sanitized = SanitizationService.sanitize(
      '<div data-everfreenote-copy="note-body"><p>x</p></div>',
      { profile: 'editor-self-copy' },
    )
    expect(sanitized).toContain('data-everfreenote-copy')
  })

  it('preserves superscript/subscript and base64 images through the round-trip', () => {
    const source = '<p>x<sup>2</sup> y<sub>1</sub></p><p><img src="data:image/png;base64,iVBORw0KGgo=" alt="p"></p>'
    const payload = NoteClipboardService.buildPayload(source)
    const result = SmartPasteService.resolvePaste({
      html: payload.html,
      text: payload.text,
      types: ['text/html', 'text/plain'],
    })

    expect(result.html).toContain('<sup>2</sup>')
    expect(result.html).toContain('<sub>1</sub>')
    expect(result.html).toContain('data:image/png;base64,iVBORw0KGgo=')
  })

  it('preserves alignment, font-size and color through resolvePaste', () => {
    const source =
      '<h1 style="text-align: center">Centered Title</h1>' +
      '<p style="text-align: right"><span style="font-size: 24px; color: rgb(255, 0, 0)">Big red right</span></p>'
    const payload = NoteClipboardService.buildPayload(source)

    const result = SmartPasteService.resolvePaste({
      html: payload.html,
      text: payload.text,
      types: ['text/html', 'text/plain'],
    })

    expect(result.type).toBe('html')
    expect(result.html).toContain('text-align: center')
    expect(result.html).toContain('text-align: right')
    expect(result.html).toContain('font-size: 24px')
    expect(result.html).toContain('color: rgb(255, 0, 0)')
    expect(result.html).not.toContain('data-everfreenote-copy')
  })

  it('preserves a blank line typed via Enter+Enter through the clipboard payload', () => {
    // Regression guard for the Telegram/Facebook bug: TipTap serializes a blank
    // line as a genuinely empty <p></p> (verified here against the real editor,
    // not a hand-written HTML fixture). Many paste destinations strip fully-empty
    // elements before turning paragraph boundaries into line breaks, which silently
    // ate the blank line — buildPayload() must mark it non-empty before that happens.
    const editor = new Editor({ extensions: editorExtensions, content: '<p>Line one</p>' })
    try {
      editor.commands.focus('end')
      editor.commands.enter()
      editor.commands.enter()
      editor.commands.insertContent('Line two')

      const html = editor.getHTML()
      expect(html).toBe('<p>Line one</p><p></p><p>Line two</p>')

      const payload = NoteClipboardService.buildPayload(html)
      expect(payload.html).toContain('<p>Line one</p><p>&nbsp;</p><p>Line two</p>')
      expect(payload.text).toBe('Line one\n\nLine two')
    } finally {
      editor.destroy()
    }
  })

  it('round-trips alignment and font-size into the editor via insertContent', () => {
    const source =
      '<h1 style="text-align: center">Centered Title</h1>' +
      '<p><span style="font-size: 24px">Big</span></p>'
    const payload = NoteClipboardService.buildPayload(source)
    const result = SmartPasteService.resolvePaste({
      html: payload.html,
      text: payload.text,
      types: ['text/html', 'text/plain'],
    })

    const editor = new Editor({ extensions: editorExtensions, content: '' })
    try {
      editor.commands.insertContent(result.html)
      const out = editor.getHTML()
      expect(out).toContain('text-align: center')
      expect(out).toContain('font-size: 24px')
    } finally {
      editor.destroy()
    }
  })
})
