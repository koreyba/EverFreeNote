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

    it('inserts a <br> gap between directly-adjacent paragraphs (single Enter)', () => {
      // A single Enter is only a ~20px CSS gap in the editor (.note-content p in
      // globals.css), not a blank line, but paste destinations only see the raw
      // HTML/text — the CSS gap is invisible to them. Every paragraph boundary is
      // normalized to a real blank line on copy so it still looks the same way it
      // does in the editor once pasted elsewhere.
      const payload = NoteClipboardService.buildPayload('<p>Line one</p><p>Line two</p>')

      expect(payload.html).toContain('<p>Line one</p><p><br></p><p>Line two</p>')
      expect(payload.text).toBe('Line one\n\nLine two')
    })

    it('marks an existing blank line (a real empty paragraph) with a <br>', () => {
      // Verified against Telegram Desktop's own HTML tokenizer (desktop-app/lib_ui
      // ui/text/text_html_tags.cpp): paragraph-boundary newlines are deliberately
      // deduplicated to one ("Structural", repeat=false), but a literal <br> is a
      // "Visible" line break (repeat=true) that is never deduplicated. An invisible
      // marker (nbsp, zero-width space) doesn't survive that dedup; a real <br> does.
      const emptyParagraph = NoteClipboardService.buildPayload('<p>Line one</p><p></p><p>Line two</p>')
      expect(emptyParagraph.html).toContain('<p>Line one</p><p><br></p><p>Line two</p>')
      expect(emptyParagraph.text).toBe('Line one\n\nLine two')

      const brOnlyParagraph = NoteClipboardService.buildPayload('<p>Line one</p><p><br></p><p>Line two</p>')
      expect(brOnlyParagraph.html).toContain('<p>Line one</p><p><br></p><p>Line two</p>')

      // Non-empty paragraphs (including ones with only an image) are left untouched.
      const withImage = NoteClipboardService.buildPayload('<p><img src="x.png" alt="pic"></p>')
      expect(withImage.html).not.toContain('<br>')
    })

    it('never collapses multiple consecutive blank lines — each stays its own <br>-marked paragraph', () => {
      // Explicit product decision: we don't flatten intentional multi-line gaps.
      // If a paste destination collapses them itself, that's outside our control.
      const payload = NoteClipboardService.buildPayload('<p>A</p><p></p><p></p><p>B</p>')

      expect(payload.html).toContain('<p>A</p><p><br></p><p><br></p><p>B</p>')
      expect(payload.text).toBe('A\n\n\nB')
    })

    it('preserves a blank paragraph\'s own attributes (e.g. alignment) when marking it', () => {
      const payload = NoteClipboardService.buildPayload('<p>A</p><p style="text-align: center"></p><p>B</p>')

      expect(payload.html).toContain('<p style="text-align: center"><br></p>')
    })

    it('leaves a leading or trailing empty paragraph untouched (nothing to separate)', () => {
      // Regression guard: a trailing empty paragraph — e.g. the cursor's resting
      // spot after the user's last Enter — isn't a blank line "between" two
      // things, so it's left as-is rather than marked or gap-inserted around.
      const trailing = NoteClipboardService.buildPayload(
        '<h1>Title</h1><ol><li>One</li><li>Two</li></ol><p></p>',
      )
      expect(trailing.html).toContain('</ol><p></p></div>')
      expect(trailing.html).not.toContain('<br>')

      const leading = NoteClipboardService.buildPayload('<p></p><p>A</p>')
      expect(leading.html).toContain('<div data-everfreenote-copy="note-body"><p></p><p>A</p>')
      expect(leading.html).not.toContain('<br>')

      // A single trailing empty paragraph directly after content stays untouched
      // too — it must not gain a gap inserted in front of it.
      const contentThenTrailing = NoteClipboardService.buildPayload('<p>A</p><p></p>')
      expect(contentThenTrailing.html).toContain('<div data-everfreenote-copy="note-body"><p>A</p><p></p></div>')
    })

    it('does not insert a gap across a list boundary (regression: EverFreeNote-e2e notes.copy.spec.ts)', () => {
      // Regression guard: a <p> right before a list and the <p> inside that
      // list's first <li> are next to each other in match order (P_BLOCK_PATTERN
      // only matches <p> tags), but <ol><li> sits between them in the actual
      // HTML, so they are not a single-Enter paragraph boundary. Inserting a gap
      // there previously fabricated a phantom blank line *inside* the <li>.
      const payload = NoteClipboardService.buildPayload(
        '<p>Before the list</p><ol><li><p>First</p></li><li><p>Second</p></li></ol><p>After</p>',
      )

      expect(payload.html).not.toContain('<li><p><br></p>')
      expect(payload.html).not.toContain('<li><p></p>')
      expect(payload.html).toContain('<ol><li><p>First</p></li><li><p>Second</p></li></ol>')
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

    it('round-trips a mixed-formatting note (EverFreeNote-e2e notes.copy.spec.ts fixture)', () => {
      // Verbatim shape of what TipTap actually produces for this note (list items
      // wrap their text in <p>, adjacent marks merge into one <span>) — captured
      // from a real EverFreeNote-e2e failure, not hand-typed, so this test would
      // have caught the list-boundary regression below.
      //
      // Note: as of the "every paragraph boundary gets a blank line" product decision,
      // this fixture's two directly-adjacent paragraphs (center-aligned, right-aligned)
      // now gain an inserted gap between them too. The external e2e test that asserts
      // byte-for-byte equality against the original needs updating to match.
      const richHtmlDescription =
        '<h1>Header formatting</h1>' +
        '<p></p>' +
        '<p style="text-align: center;"><span style="font-family: serif; font-size: 18px;">Serif text, size 18px, centered alignment</span></p>' +
        '<p style="text-align: right;"><span style="font-family: monospace;">Monospace text, standard size, right alignment</span></p>' +
        '<ol><li><p>First element of numbered list</p></li><li><p>Second element of numbered list</p></li></ol>' +
        '<p></p>'

      const payload = NoteClipboardService.buildPayload(richHtmlDescription)
      // The two adjacent paragraphs gain a gap between them...
      expect(payload.html).toContain('centered alignment</span></p><p><br></p><p style="text-align: right;">')
      // ...but the blank line right after the heading and the trailing empty
      // paragraph are both left untouched — headings aren't tracked, and a
      // trailing paragraph isn't separating anything.
      expect(payload.html).toContain('<h1>Header formatting</h1><p></p><p style="text-align: center;">')
      expect(payload.html).toContain('</ol><p></p></div>')
      // Regression guard: a list directly after a paragraph must never gain a
      // gap fabricated *inside* its first <li> (see insertMissingParagraphGaps).
      expect(payload.html).not.toContain('<li><p><br></p>')
      expect(payload.html).not.toContain('<li><p></p>')
      expect(payload.html).toContain('<ol><li><p>First element of numbered list</p></li>')

      const result = SmartPasteService.resolvePaste({
        html: payload.html,
        text: payload.text,
        types: ['text/html', 'text/plain'],
      })

      // Content and formatting all survive.
      expect(result.type).toBe('html')
      expect(result.html).toContain('Header formatting')
      expect(result.html).toContain('text-align: center')
      expect(result.html).toContain('font-family: serif')
      expect(result.html).toContain('text-align: right')
      expect(result.html).toContain('font-family: monospace')
      expect(result.html).toContain('First element of numbered list')
      expect(result.html).toContain('Second element of numbered list')
      expect(result.html.endsWith('<p></p>')).toBe(true)
    })
  })
})
