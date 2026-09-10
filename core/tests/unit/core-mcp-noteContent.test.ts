import { buildExcerpt, htmlToPlainText } from '@core/mcp/noteContent'

describe('core/mcp/noteContent', () => {
  describe('htmlToPlainText', () => {
    it('returns an empty string for empty input', () => {
      expect(htmlToPlainText('')).toBe('')
      expect(htmlToPlainText(null)).toBe('')
      expect(htmlToPlainText(undefined)).toBe('')
    })

    it('turns block boundaries into line breaks and strips tags', () => {
      const html = '<h1>Title</h1><p>First <strong>bold</strong> line.</p><p>Second line.</p>'
      expect(htmlToPlainText(html)).toBe('Title\nFirst bold line.\nSecond line.')
    })

    it('renders list items with bullets', () => {
      const html = '<ul><li>One</li><li>Two</li></ul>'
      expect(htmlToPlainText(html)).toBe('• One\n• Two')
    })

    it('treats <br> and <hr> as line breaks', () => {
      expect(htmlToPlainText('a<br>b<br/>c<hr />d')).toBe('a\nb\nc\nd')
    })

    it('removes script and style blocks entirely', () => {
      const html = '<p>safe</p><script>alert(1)</script><style>p{}</style><p>after</p>'
      expect(htmlToPlainText(html)).toBe('safe\nafter')
    })

    it('decodes named, decimal and hex entities', () => {
      expect(htmlToPlainText('&lt;tag&gt; &amp; &quot;q&quot; &#39;s&#x27; &nbsp;x &unknown;')).toBe(
        '<tag> & "q" \'s\' x &unknown;',
      )
    })

    it('keeps out-of-range numeric entities untouched', () => {
      expect(htmlToPlainText('&#x110000; &#-5;')).toBe('&#x110000; &#-5;')
    })

    it('collapses repeated whitespace', () => {
      expect(htmlToPlainText('<p>a   b\t\tc</p>\n\n<p>  d </p>')).toBe('a b c\nd')
    })
  })

  describe('buildExcerpt', () => {
    it('joins lines into a single line', () => {
      expect(buildExcerpt('<p>one</p><p>two</p>')).toBe('one two')
    })

    it('returns the text unchanged when within the limit', () => {
      expect(buildExcerpt('<p>short</p>', 10)).toBe('short')
    })

    it('truncates with an ellipsis at the limit', () => {
      const excerpt = buildExcerpt(`<p>${'word '.repeat(100)}</p>`, 20)
      expect(excerpt.length).toBeLessThanOrEqual(20)
      expect(excerpt.endsWith('…')).toBe(true)
    })

    it('handles a limit of one', () => {
      expect(buildExcerpt('<p>abc</p>', 1)).toBe('a…')
    })
  })
})
