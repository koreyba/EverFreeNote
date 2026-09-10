import { NOTE_ALLOWED_TAGS, sanitizeNoteHtml } from '@core/mcp/noteHtml'

describe('core/mcp/noteHtml - sanitizeNoteHtml', () => {
  it('returns an empty string for empty input', () => {
    expect(sanitizeNoteHtml('')).toBe('')
    expect(sanitizeNoteHtml(null)).toBe('')
    expect(sanitizeNoteHtml(undefined)).toBe('')
  })

  it('keeps the markup the editor supports', () => {
    const html =
      '<h1>Title</h1><p>Text with <strong>bold</strong>, <em>italic</em> and <a href="https://example.com">a link</a>.</p>' +
      '<ul><li>one</li></ul><blockquote>quote</blockquote><pre><code>code</code></pre><hr />'
    expect(sanitizeNoteHtml(html)).toBe(html)
  })

  it('removes script elements together with their content', () => {
    expect(sanitizeNoteHtml('<p>safe</p><script>alert(1)</script>')).toBe('<p>safe</p>')
    expect(sanitizeNoteHtml('<style>p{color:red}</style><p>safe</p>')).toBe('<p>safe</p>')
  })

  it('removes event handler attributes', () => {
    expect(sanitizeNoteHtml('<p onclick="steal()">x</p>')).toBe('<p>x</p>')
    expect(sanitizeNoteHtml('<img src="https://e.com/a.png" onerror="steal()" />')).toBe(
      '<img src="https://e.com/a.png" />',
    )
  })

  it('drops script-bearing URLs but keeps safe ones', () => {
    expect(sanitizeNoteHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>')
    expect(sanitizeNoteHtml('<a href="https://example.com">x</a>')).toBe('<a href="https://example.com">x</a>')
    expect(sanitizeNoteHtml('<a href="mailto:a@b.c">x</a>')).toBe('<a href="mailto:a@b.c">x</a>')
  })

  it('allows data URIs for images only', () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgo='
    expect(sanitizeNoteHtml(`<img src="${dataUri}" />`)).toContain(dataUri)
    expect(sanitizeNoteHtml(`<a href="${dataUri}">x</a>`)).toBe('<a>x</a>')
  })

  it('discards elements the editor cannot render', () => {
    expect(sanitizeNoteHtml('<iframe src="https://evil.example"></iframe><p>after</p>')).toBe('<p>after</p>')
    expect(sanitizeNoteHtml('<form><input value="x" /></form><p>after</p>')).toBe('<p>after</p>')
    expect(sanitizeNoteHtml('<object data="x"></object><embed src="x" /><p>after</p>')).toBe('<p>after</p>')
  })

  it('keeps the checkbox and formatting attributes the editor stores', () => {
    const html = '<li data-checked="true" data-type="taskItem" class="task" style="color:red" title="t">x</li>'
    expect(sanitizeNoteHtml(html)).toBe(html)
  })

  it('normalizes whitespace inside style declarations', () => {
    expect(sanitizeNoteHtml('<p style="color: red">x</p>')).toBe('<p style="color:red">x</p>')
  })

  it('exposes the allowlist used by the render-side sanitizer', () => {
    expect(NOTE_ALLOWED_TAGS).toEqual(expect.arrayContaining(['p', 'h1', 'ul', 'li', 'img', 'mark', 'code']))
    expect(NOTE_ALLOWED_TAGS).not.toEqual(expect.arrayContaining(['script', 'iframe', 'form']))
  })
})
