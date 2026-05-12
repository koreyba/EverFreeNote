import { SanitizationService } from '@core/services/sanitizer'

describe('core/services/sanitizer', () => {
  describe('sanitize', () => {
    it('allows safe HTML tags', () => {
      const html = '<p>Hello <b>world</b></p>'
      const result = SanitizationService.sanitize(html)
      expect(result).toBe('<p>Hello <b>world</b></p>')
    })

    it('removes script tags', () => {
      const html = '<p>Text</p><script>alert("XSS")</script>'
      const result = SanitizationService.sanitize(html)
      expect(result).not.toContain('<script>')
      expect(result).toContain('<p>Text</p>')
    })

    it('removes iframe tags', () => {
      const html = '<p>Text</p><iframe src="evil.com"></iframe>'
      const result = SanitizationService.sanitize(html)
      expect(result).not.toContain('<iframe>')
      expect(result).toContain('<p>Text</p>')
    })

    it('removes dangerous event handlers', () => {
      const html = '<p onclick="alert(\'XSS\')">Click me</p>'
      const result = SanitizationService.sanitize(html)
      expect(result).not.toContain('onclick')
      expect(result).toContain('Click me')
    })

    it('allows safe attributes', () => {
      const html = '<a href="https://example.com" target="_blank">Link</a>'
      const result = SanitizationService.sanitize(html)
      expect(result).toContain('href')
      expect(result).toContain('target')
      expect(result).toContain('https://example.com')
    })

    it('allows images with src and alt', () => {
      const html = '<img src="image.jpg" alt="Description" />'
      const result = SanitizationService.sanitize(html)
      expect(result).toContain('<img')
      expect(result).toContain('src="image.jpg"')
      expect(result).toContain('alt="Description"')
    })

    it('removes object and embed tags', () => {
      const html = '<object data="file.swf"></object><embed src="file.swf">'
      const result = SanitizationService.sanitize(html)
      expect(result).not.toContain('<object')
      expect(result).not.toContain('<embed')
    })

    it('removes form and input tags', () => {
      const html = '<form><input type="text" name="field"></form>'
      const result = SanitizationService.sanitize(html)
      expect(result).not.toContain('<form')
      expect(result).not.toContain('<input')
    })

    it('allows heading tags', () => {
      const html = '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>'
      const result = SanitizationService.sanitize(html)
      expect(result).toContain('<h1>Title</h1>')
      expect(result).toContain('<h2>Subtitle</h2>')
      expect(result).toContain('<h3>Section</h3>')
    })

    it('allows lists', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
      const result = SanitizationService.sanitize(html)
      expect(result).toContain('<ul>')
      expect(result).toContain('<li>Item 1</li>')
      expect(result).toContain('</ul>')
    })

    it('allows blockquote and code', () => {
      const html = '<blockquote>Quote</blockquote><code>code</code><pre>preformatted</pre>'
      const result = SanitizationService.sanitize(html)
      expect(result).toContain('<blockquote>Quote</blockquote>')
      expect(result).toContain('<code>code</code>')
      expect(result).toContain('<pre>preformatted</pre>')
    })

    it('allows horizontal rule', () => {
      const html = '<hr />'
      const result = SanitizationService.sanitize(html)
      expect(result).toContain('<hr')
    })

    it('allows text formatting tags', () => {
      const html = '<em>Emphasis</em> <strong>Strong</strong> <mark>Marked</mark> <u>Underline</u>'
      const result = SanitizationService.sanitize(html)
      expect(result).toContain('<em>Emphasis</em>')
      expect(result).toContain('<strong>Strong</strong>')
      expect(result).toContain('<mark>Marked</mark>')
      expect(result).toContain('<u>Underline</u>')
    })

    it('removes onerror attribute from img', () => {
      const html = '<img src="x" onerror="alert(\'XSS\')" />'
      const result = SanitizationService.sanitize(html)
      expect(result).not.toContain('onerror')
    })

    it('removes onload attribute', () => {
      const html = '<body onload="alert(\'XSS\')">Content</body>'
      const result = SanitizationService.sanitize(html)
      expect(result).not.toContain('onload')
    })

    it('removes onmouseover attribute', () => {
      const html = '<div onmouseover="alert(\'XSS\')">Hover</div>'
      const result = SanitizationService.sanitize(html)
      expect(result).not.toContain('onmouseover')
    })

    it('handles empty string', () => {
      const result = SanitizationService.sanitize('')
      expect(result).toBe('')
    })

    it('handles plain text without tags', () => {
      const html = 'Just plain text'
      const result = SanitizationService.sanitize(html)
      expect(result).toBe('Just plain text')
    })

    it('handles complex nested structure', () => {
      const html = `
        <div>
          <h1>Title</h1>
          <p>Paragraph with <strong>bold</strong> and <em>italic</em></p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      `
      const result = SanitizationService.sanitize(html)
      expect(result).toContain('<h1>Title</h1>')
      expect(result).toContain('<strong>bold</strong>')
      expect(result).toContain('<em>italic</em>')
      expect(result).toContain('<li>Item 1</li>')
    })

    it('preserves allowed style attribute', () => {
      const html = '<span style="color: red;">Red text</span>'
      const result = SanitizationService.sanitize(html)
      expect(result).toContain('style')
      expect(result).toContain('Red text')
    })

    it('removes javascript: protocol from links', () => {
      const html = '<a href="javascript:alert(\'XSS\')">Click</a>'
      const result = SanitizationService.sanitize(html)
      expect(result).not.toContain('javascript:')
    })

    it('allows data URIs in images (if DOMPurify config permits)', () => {
      const html = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" />'
      const result = SanitizationService.sanitize(html)
      // DOMPurify may allow or block data URIs based on config
      // This test verifies that sanitization doesn't crash with data URIs
      expect(result).toBeTruthy()
    })
  })

  describe('stripHtml', () => {
    it('removes all HTML tags', () => {
      const html = '<p>Hello <b>world</b></p>'
      const result = SanitizationService.stripHtml(html)
      expect(result).toBe('Hello world')
    })

    it('removes nested tags', () => {
      const html = '<div><h1>Title</h1><p>Text with <strong>bold</strong></p></div>'
      const result = SanitizationService.stripHtml(html)
      expect(result).toBe('TitleText with bold')
    })

    it('removes scripts and their content', () => {
      const html = '<p>Text</p><script>alert("XSS")</script><p>More text</p>'
      const result = SanitizationService.stripHtml(html)
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert("XSS")')
      expect(result).toContain('Text')
      expect(result).toContain('More text')
    })

    it('removes styles and their content', () => {
      const html = '<p>Text</p><style>body{color:red}</style><p>More text</p>'
      const result = SanitizationService.stripHtml(html)
      expect(result).not.toContain('<style>')
      expect(result).not.toContain('color:red')
      expect(result).toContain('Text')
      expect(result).toContain('More text')
    })

    it('handles plain text', () => {
      const html = 'Just plain text'
      const result = SanitizationService.stripHtml(html)
      expect(result).toBe('Just plain text')
    })

    it('handles empty string', () => {
      const result = SanitizationService.stripHtml('')
      expect(result).toBe('')
    })

    it('removes links but keeps text', () => {
      const html = '<a href="https://example.com">Click here</a>'
      const result = SanitizationService.stripHtml(html)
      expect(result).toBe('Click here')
      expect(result).not.toContain('<a')
      expect(result).not.toContain('href')
    })

    it('removes lists but keeps content', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
      const result = SanitizationService.stripHtml(html)
      expect(result).toBe('Item 1Item 2')
      expect(result).not.toContain('<ul>')
      expect(result).not.toContain('<li>')
    })

    it('handles HTML entities', () => {
      const html = '<p>&lt;div&gt; &amp; &quot;test&quot;</p>'
      const result = SanitizationService.stripHtml(html)
      // Mock doesn't decode entities, just removes tags
      expect(result).toContain('&lt;div&gt;')
      expect(result).toContain('&amp;')
      expect(result).toContain('&quot;test&quot;')
    })

    it('removes images', () => {
      const html = '<p>Text before</p><img src="image.jpg" alt="Description" /><p>Text after</p>'
      const result = SanitizationService.stripHtml(html)
      expect(result).not.toContain('<img')
      expect(result).toContain('Text before')
      expect(result).toContain('Text after')
    })

    it('handles multiple paragraphs', () => {
      const html = '<p>First paragraph</p><p>Second paragraph</p><p>Third paragraph</p>'
      const result = SanitizationService.stripHtml(html)
      expect(result).toContain('First paragraph')
      expect(result).toContain('Second paragraph')
      expect(result).toContain('Third paragraph')
      expect(result).not.toContain('<p>')
    })
  })
})
