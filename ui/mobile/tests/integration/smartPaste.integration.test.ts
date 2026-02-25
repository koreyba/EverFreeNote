import fs from 'fs'
import path from 'path'
import { SmartPasteService } from '@core/services/smartPaste'

const fixturesDir = path.resolve(__dirname, '../../../../core/tests/fixtures/clipboard')

const readFixture = (name: string) =>
  fs.readFileSync(path.join(fixturesDir, name), 'utf8')

describe('smartPaste integration', () => {
  it('converts AI chat markdown fixture to formatted HTML', () => {
    const text = readFixture('ai-chat-markdown.md')
    const result = SmartPasteService.resolvePaste({ html: null, text, types: ['text/plain'] })

    expect(result.type).toBe('markdown')
    expect(result.html).toContain('<h1>')
    expect(result.html).toContain('<ul>')
    expect(result.html).toContain('<blockquote>')
  })

  it('sanitizes Google Docs HTML fixture', () => {
    const html = readFixture('google-docs.html')
    const result = SmartPasteService.resolvePaste({ html, text: null, types: ['text/html'] })

    expect(result.type).toBe('html')
    expect(result.html).toContain('<h1>')
    expect(result.html).toContain('Project Update')
    expect(result.html).toContain('<a href=')
    expect(result.html).toContain('Dark text')
    expect(result.html).not.toContain('color:')
    expect(result.html).not.toContain('background-color:')
  })

  it('keeps http images from web article HTML fixture', () => {
    const html = readFixture('web-article.html')
    const result = SmartPasteService.resolvePaste({ html, text: null, types: ['text/html'] })

    expect(result.type).toBe('html')
    expect(result.html).toContain('<img')
    expect(result.html).toContain('https://example.com/image.png')
  })

  it('converts plain text fixture to paragraphs and line breaks', () => {
    const text = readFixture('plain.txt')
    const result = SmartPasteService.resolvePaste({ html: null, text, types: ['text/plain'] })

    expect(result.type).toBe('plain')
    expect(result.html).toContain('<p>This is plain text.<br />It has multiple lines.</p>')
    expect(result.html).toContain('<p>New paragraph starts here.<br /></p>')
  })

  it('falls back to plain text and strips scripts from non-structural HTML', () => {
    const html = '<div onclick="alert(1)">Safe</div><script>alert(1)</script>'
    const result = SmartPasteService.resolvePaste({ html, text: null, types: ['text/html'] })

    expect(result.type).toBe('plain')
    expect(result.html).toContain('<p>Safe</p>')
    expect(result.html).not.toContain('alert(1)')
    expect(result.html).not.toContain('<script')
    expect(result.html).not.toContain('onclick=')
  })

  it('wraps non-structural HTML content into paragraphs', () => {
    const html = '<div>Loose text</div>'
    const result = SmartPasteService.resolvePaste({ html, text: null, types: ['text/html'] })

    expect(result.type).toBe('plain')
    expect(result.html).toContain('<p>Loose text</p>')
  })

  it('escapes raw HTML when content is treated as plain text', () => {
    const text = '<script>alert(1)</script>\nLine two'
    const result = SmartPasteService.resolvePaste({ html: null, text, types: ['text/plain'] })

    expect(result.type).toBe('plain')
    expect(result.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;<br />Line two')
  })

  it('keeps mixed markdown lists and headings', () => {
    const text = '## Title\n\n- One\n* Two\n\n1. First\n2. Second'
    const result = SmartPasteService.resolvePaste({ html: null, text, types: ['text/plain'] })

    expect(result.type).toBe('markdown')
    expect(result.html).toContain('<h2>')
    expect(result.html).toContain('<ul>')
    expect(result.html).toContain('<ol>')
  })

  it('handles unclosed fenced code blocks without crashing', () => {
    const text = '```js\nconst value = 1'
    const result = SmartPasteService.resolvePaste({ html: null, text, types: ['text/plain'] })

    expect(result.type).toBe('markdown')
    expect(result.html).toContain('<pre><code')
    expect(result.html).toContain('const value = 1')
  })

  it('renders markdown horizontal rule as hr', () => {
    const result = SmartPasteService.resolvePaste({ html: null, text: '---', types: ['text/plain'] })

    expect(result.type).toBe('markdown')
    expect(result.html).toContain('<hr')
  })

  describe('forced markdown — force-markdown.txt fixture', () => {
    it('auto-detects fixture as plain (confirms low markdown score)', () => {
      const text = readFixture('force-markdown.txt')
      const result = SmartPasteService.resolvePaste({ html: null, text, types: ['text/plain'] })

      expect(result.type).toBe('plain')
    })

    it('renders fixture as markdown when forcedType is provided', () => {
      const text = readFixture('force-markdown.txt')
      const result = SmartPasteService.resolvePaste({ html: null, text, types: ['text/plain'] }, undefined, 'markdown')

      expect(result.type).toBe('markdown')
      expect(result.html).toContain('<ul>')
      expect(result.html).toContain('<li>')
      expect(result.html).toContain('Buy milk')
    })
  })
})
