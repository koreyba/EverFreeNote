import { normalizeHtml, plainTextToHtml, escapeHtml } from '@core/utils/normalize-html'

describe('core/utils/normalize-html', () => {
  describe('normalizeHtml', () => {
    it('removes en-note wrappers', () => {
      const input = '<en-note><div>Content</div></en-note>'
      const output = normalizeHtml(input)
      expect(output).toBe('<p>Content</p>')
    })

    it('converts simple divs to paragraphs', () => {
      const input = '<div>Line 1</div><div>Line 2</div>'
      const output = normalizeHtml(input)
      expect(output).toBe('<p>Line 1</p><p>Line 2</p>')
    })

    it('preserves divs that contain block elements', () => {
      const input = '<div><p>Paragraph inside</p></div>'
      const output = normalizeHtml(input)
      expect(output).toBe('<div><p>Paragraph inside</p></div>')
    })
  })

  describe('escapeHtml', () => {
    it('escapes special HTML characters', () => {
      const input = '<div class="test"> & \'single\''
      const output = escapeHtml(input)
      expect(output).toBe('&lt;div class=&quot;test&quot;&gt; &amp; &#39;single&#39;')
    })
  })

  describe('plainTextToHtml', () => {
    it('converts newlines to breaks and paragraphs', () => {
      const input = 'Line 1\nLine 2\n\nNew Paragraph'
      const output = plainTextToHtml(input)
      expect(output).toBe('<p>Line 1<br />Line 2</p><p>New Paragraph</p>')
    })

    it('escapes html tags in the text', () => {
      const input = '<script>alert(1)</script>'
      const output = plainTextToHtml(input)
      expect(output).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
    })

    it('handles multiple newlines as paragraph breaks', () => {
      const input = 'P1\n\n\n\nP2'
      const output = plainTextToHtml(input)
      expect(output).toBe('<p>P1</p><p>P2</p>')
    })
  })
})
