import { NoteClipboardService } from '@core/services/noteClipboard'
import { NoteCopyService } from '@core/services/noteCopy'
import { SmartPasteService } from '@core/services/smartPaste'

describe('core/services/noteClipboard', () => {
  describe('buildPayload', () => {
    it('wraps rich HTML in the self-copy marker and round-trips via NoteCopyService', () => {
      const payload = NoteClipboardService.buildPayload('<p>Hello <strong>world</strong></p>')

      expect(NoteCopyService.isSelfCopyHtml(payload.html)).toBe(true)
      expect(NoteCopyService.unwrapSelfCopyHtml(payload.html)).toContain('<strong>world</strong>')
    })

    it('returns empty payload for empty/whitespace body', () => {
      expect(NoteClipboardService.buildPayload('')).toEqual({ html: '', text: '' })
      expect(NoteClipboardService.buildPayload('   ')).toEqual({ html: '', text: '' })
    })

    it('preserves superscript/subscript on the self-copy path', () => {
      const payload = NoteClipboardService.buildPayload('<p>x<sup>2</sup> and y<sub>1</sub></p>')

      expect(payload.html).toContain('<sup>2</sup>')
      expect(payload.html).toContain('<sub>1</sub>')
    })

    it('preserves base64 (data:) images on the self-copy path', () => {
      const payload = NoteClipboardService.buildPayload(
        '<p><img src="data:image/png;base64,iVBORw0KGgo=" alt="pic"></p>',
      )

      expect(payload.html).toContain('data:image/png;base64,iVBORw0KGgo=')
    })

    it('marks blank-line paragraphs with a non-breaking space so paste targets that strip empty tags keep the gap', () => {
      const emptyParagraph = NoteClipboardService.buildPayload('<p>Line one</p><p></p><p>Line two</p>')
      expect(emptyParagraph.html).toContain('<p>Line one</p><p>&nbsp;</p><p>Line two</p>')
      expect(emptyParagraph.text).toBe('Line one\n\nLine two')

      const brOnlyParagraph = NoteClipboardService.buildPayload('<p>Line one</p><p><br></p><p>Line two</p>')
      expect(brOnlyParagraph.html).toContain('<p>Line one</p><p>&nbsp;</p><p>Line two</p>')

      // Non-empty paragraphs (including ones with only an image) are left untouched.
      const withImage = NoteClipboardService.buildPayload('<p><img src="x.png" alt="pic"></p>')
      expect(withImage.html).not.toContain('&nbsp;')
    })

    it('marks each blank line independently across multiple consecutive gaps', () => {
      const payload = NoteClipboardService.buildPayload('<p>A</p><p></p><p></p><p>B</p>')

      expect(payload.html).toContain('<p>A</p><p>&nbsp;</p><p>&nbsp;</p><p>B</p>')
      expect(payload.text).toBe('A\n\nB')
    })

    it('preserves a blank paragraph\'s own attributes (e.g. alignment) when marking it', () => {
      const payload = NoteClipboardService.buildPayload('<p>A</p><p style="text-align: center"></p><p>B</p>')

      expect(payload.html).toContain('<p style="text-align: center">&nbsp;</p>')
    })

    it('leaves a leading or trailing empty paragraph untouched (nothing to separate)', () => {
      // Regression guard: a trailing empty paragraph — e.g. the cursor's resting spot
      // after the user's last Enter — isn't a blank line "between" two things, so
      // marking it would needlessly change notes that round-trip through copy/paste
      // without a genuine mid-document gap (see notes.copy.spec.ts in EverFreeNote-e2e).
      const trailing = NoteClipboardService.buildPayload(
        '<h1>Title</h1><ol><li>One</li><li>Two</li></ol><p></p>',
      )
      expect(trailing.html).toContain('</ol><p></p></div>')

      const leading = NoteClipboardService.buildPayload('<p></p><p>A</p>')
      expect(leading.html).toContain('<div data-everfreenote-copy="note-body"><p></p><p>A</p>')
    })
  })

  describe('htmlToPlainText', () => {
    it('renders list items as plain text without markdown markers', () => {
      const text = NoteClipboardService.htmlToPlainText('<ul><li>One</li><li>Two</li></ul>')

      expect(text).toBe('One\nTwo')
      expect(text).not.toContain('- ')
    })

    it('renders task items without checkbox markdown markers', () => {
      const text = NoteClipboardService.htmlToPlainText(
        '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><div><p>Done</p></div></li></ul>',
      )

      expect(text).toContain('Done')
      expect(text).not.toContain('[ ]')
      expect(text).not.toContain('[x]')
    })

    it('degrades links to their visible text only', () => {
      const text = NoteClipboardService.htmlToPlainText('<p>See <a href="https://example.com">our site</a></p>')

      expect(text).toBe('See our site')
      expect(text).not.toContain('https://example.com')
      expect(text).not.toContain('(')
    })

    it('separates blocks and <br> with newlines', () => {
      const text = NoteClipboardService.htmlToPlainText('<h1>Title</h1><p>a<br>b</p>')

      expect(text).toBe('Title\na\nb')
    })

    it('degrades images to alt text, or a placeholder when alt is missing', () => {
      expect(NoteClipboardService.htmlToPlainText('<p><img src="x.png" alt="A diagram"></p>')).toBe('A diagram')
      expect(NoteClipboardService.htmlToPlainText('<p><img src="x.png"></p>')).toBe('[image]')
    })

    it('produces non-empty plain text for an image-only note', () => {
      const payload = NoteClipboardService.buildPayload('<p><img src="data:image/png;base64,abc" alt="Chart"></p>')
      expect(payload.text).toBe('Chart')
      expect(payload.text.length).toBeGreaterThan(0)
    })

    it('never emits bold/emphasis markdown markers', () => {
      const text = NoteClipboardService.htmlToPlainText('<p><strong>Bold</strong> and <em>italic</em></p>')

      expect(text).toBe('Bold and italic')
      expect(text).not.toContain('**')
      expect(text).not.toContain('_')
    })

    it('decodes a blank-line &nbsp; marker back into a blank line instead of literal text', () => {
      expect(NoteClipboardService.htmlToPlainText('<p>Line one</p><p>&nbsp;</p><p>Line two</p>'))
        .toBe('Line one\n\nLine two')
    })

    it('decodes common HTML entities instead of leaving them literal', () => {
      const text = NoteClipboardService.htmlToPlainText('<p>AT&amp;T &lt;div&gt; &quot;quoted&quot; &#39;single&#39;</p>')

      expect(text).toBe('AT&T <div> "quoted" \'single\'')
    })
  })

  describe('isBodyEmpty', () => {
    it('treats empty and whitespace-only bodies as empty', () => {
      expect(NoteClipboardService.isBodyEmpty('')).toBe(true)
      expect(NoteClipboardService.isBodyEmpty('   ')).toBe(true)
      expect(NoteClipboardService.isBodyEmpty('<p></p>')).toBe(true)
      expect(NoteClipboardService.isBodyEmpty('<p><br></p>')).toBe(true)
    })

    it('treats text or image content as non-empty', () => {
      expect(NoteClipboardService.isBodyEmpty('<p>Hello</p>')).toBe(false)
      expect(NoteClipboardService.isBodyEmpty('<p><img src="data:image/png;base64,abc"></p>')).toBe(false)
    })
  })

  describe('zero-loss round-trip through smartPaste', () => {
    it('preserves superscript/subscript when pasted back into EverFreeNote', () => {
      const payload = NoteClipboardService.buildPayload('<p>x<sup>2</sup> y<sub>1</sub></p>')

      const result = SmartPasteService.resolvePaste({
        html: payload.html,
        text: payload.text,
        types: ['text/html', 'text/plain'],
      })

      expect(result.type).toBe('html')
      expect(result.html).toContain('<sup>2</sup>')
      expect(result.html).toContain('<sub>1</sub>')
      expect(result.html).not.toContain('data-everfreenote-copy')
    })

    it('preserves base64 images when pasted back into EverFreeNote', () => {
      const payload = NoteClipboardService.buildPayload(
        '<p><img src="data:image/png;base64,iVBORw0KGgo=" alt="pic"></p>',
      )

      const result = SmartPasteService.resolvePaste({
        html: payload.html,
        text: payload.text,
        types: ['text/html', 'text/plain'],
      })

      expect(result.type).toBe('html')
      expect(result.html).toContain('data:image/png;base64,iVBORw0KGgo=')
    })

    it('preserves the blank line between paragraphs when pasted back into EverFreeNote', () => {
      const payload = NoteClipboardService.buildPayload('<p>Line one</p><p></p><p>Line two</p>')

      const result = SmartPasteService.resolvePaste({
        html: payload.html,
        text: payload.text,
        types: ['text/html', 'text/plain'],
      })

      expect(result.type).toBe('html')
      expect(NoteClipboardService.htmlToPlainText(result.html)).toBe('Line one\n\nLine two')
    })

    it('leaves a trailing empty paragraph in a mixed-formatting note untouched through copy and paste-back (EverFreeNote-e2e notes.copy.spec.ts)', () => {
      const richHtmlDescription =
        '<h1>Header formatting</h1>' +
        '<p style="text-align: center;"><span style="font-size: 18px;"><span style="font-family: serif;">Serif text, size 18px, centered alignment</span></span></p>' +
        '<p style="text-align: right;"><span style="font-family: monospace;">Monospace text, standard size, right alignment</span></p>' +
        '<ol><li>First element of numbered list</li><li>Second element of numbered list</li></ol>' +
        '<p></p>'

      const payload = NoteClipboardService.buildPayload(richHtmlDescription)
      // The trailing empty paragraph must stay untouched — it isn't separating anything.
      expect(payload.html).toContain('</ol><p></p></div>')
      expect(payload.html).not.toContain('&nbsp;')

      const result = SmartPasteService.resolvePaste({
        html: payload.html,
        text: payload.text,
        types: ['text/html', 'text/plain'],
      })

      // Content, formatting and structure all survive; the trailing empty
      // paragraph is still a plain <p></p>, not <p>&nbsp;</p>.
      expect(result.type).toBe('html')
      expect(result.html).toContain('Header formatting')
      expect(result.html).toContain('text-align: center')
      expect(result.html).toContain('font-family: serif')
      expect(result.html).toContain('text-align: right')
      expect(result.html).toContain('font-family: monospace')
      expect(result.html).toContain('First element of numbered list')
      expect(result.html).toContain('Second element of numbered list')
      expect(result.html.endsWith('<p></p>')).toBe(true)
      expect(result.html).not.toContain('&nbsp;')
    })
  })
})
