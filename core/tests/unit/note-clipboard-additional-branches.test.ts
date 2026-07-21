import { NoteClipboardService } from '@core/services/noteClipboard'

describe('core/services/noteClipboard additional edge cases', () => {
  describe('buildPayload', () => {
    it('preserves meaningful text when the input has no paragraph elements', () => {
      const payload = NoteClipboardService.buildPayload('Plain text <span>without paragraphs</span>')

      expect(payload.text).toBe('Plain text without paragraphs')
      expect(payload.html).toContain('Plain text <span>without paragraphs</span>')
    })

    it('does not fabricate a gap for malformed paragraph markup', () => {
      const payload = NoteClipboardService.buildPayload('<p>First</p><p>Second')

      expect(payload.text).toContain('First')
      expect(payload.text).toContain('Second')
      expect(payload.html).not.toContain('data-everfreenote-gap')
    })

    it('treats whitespace-only paragraph content as an existing empty paragraph', () => {
      const payload = NoteClipboardService.buildPayload('<p>First</p><p> \n\t </p><p>Last</p>')

      expect(payload.html).toContain('<p><br></p>')
      expect(payload.html).not.toContain('data-everfreenote-gap')
      expect(payload.text).toBe('First\n\n\nLast')
    })

    it('does not treat a malformed br-like tag as an empty paragraph marker', () => {
      const payload = NoteClipboardService.buildPayload('<p>First</p><p><brx></p><p>Last</p>')

      expect(payload.html).not.toContain('data-everfreenote-gap')
      expect(payload.text).toBe('First\n\nLast')
    })
  })

  describe('restoreEditorHtml', () => {
    it('returns empty input unchanged', () => {
      expect(NoteClipboardService.restoreEditorHtml('')).toBe('')
    })

    it('only removes complete, explicitly marked fabricated gaps', () => {
      const malformedAttributes =
        '<p data-everfreenote-gap></p><p data-everfreenote-gap=""></p><p data-everfreenote-gap="0"></p>'

      expect(NoteClipboardService.restoreEditorHtml(malformedAttributes)).toBe(malformedAttributes)
      expect(NoteClipboardService.restoreEditorHtml('<p data-everfreenote-gap="1">')).toBe(
        '<p data-everfreenote-gap="1">',
      )
    })

    it('restores br-only paragraphs while preserving other attributes', () => {
      expect(NoteClipboardService.restoreEditorHtml('<p class="empty"><br /></p>')).toBe(
        '<p class="empty"></p>',
      )
    })
  })

  describe('htmlToPlainText', () => {
    it('returns empty text for empty input', () => {
      expect(NoteClipboardService.htmlToPlainText('')).toBe('')
    })

    it('uses the image placeholder for empty and whitespace-only alt attributes', () => {
      expect(NoteClipboardService.htmlToPlainText('<img src="empty.png" alt="">')).toBe('[image]')
      expect(NoteClipboardService.htmlToPlainText('<img src="spaces.png" alt="   ">')).toBe('[image]')
    })

    it('reads a single-quoted alt attribute and trims it', () => {
      expect(NoteClipboardService.htmlToPlainText("<img src='chart.png' alt='  Chart  '>")).toBe('Chart')
    })
  })
})
