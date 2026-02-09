import { SmartPasteService } from '@core/services/smartPaste'
import { SanitizationService } from '@core/services/sanitizer'

type AttributeMap = Record<string, string>

const parseAttributes = (tag: string): AttributeMap => {
  const attributes: AttributeMap = {}
  const pattern = /([a-zA-Z0-9:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(tag))) {
    const value = match[2] ?? match[3] ?? match[4] ?? ''
    attributes[match[1].toLowerCase()] = value
  }

  return attributes
}

const buildTag = (tag: string, attributes: AttributeMap): string => {
  const entries = Object.entries(attributes)
  if (entries.length === 0) {
    return `<${tag}>`
  }
  const attrs = entries.map(([key, value]) => `${key}="${value}"`).join(' ')
  return `<${tag} ${attrs}>`
}

class FakeElement {
  private attributes: AttributeMap

  constructor(
    private tag: string,
    private original: string,
    private doc: FakeDocument
  ) {
    this.attributes = parseAttributes(original)
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value
    const updated = buildTag(this.tag, this.attributes)
    this.doc.replaceTag(this.original, updated)
    this.original = updated
  }

  removeAttribute(name: string): void {
    delete this.attributes[name]
    const updated = buildTag(this.tag, this.attributes)
    this.doc.replaceTag(this.original, updated)
    this.original = updated
  }

  remove(): void {
    this.doc.removeTag(this.original)
  }
}

class FakeDocument {
  body: { innerHTML: string }

  constructor(html: string) {
    this.body = { innerHTML: html }
  }

  querySelectorAll(selector: string): FakeElement[] {
    if (selector === 'a[href]') {
      return this.buildElements('a', 'href')
    }
    if (selector === 'img[src]') {
      return this.buildElements('img', 'src')
    }
    if (selector === '[style]') {
      return this.buildAllElementsWithAttribute('style')
    }
    return []
  }

  replaceTag(original: string, updated: string): void {
    this.body.innerHTML = this.body.innerHTML.replace(original, updated)
  }

  removeTag(original: string): void {
    this.body.innerHTML = this.body.innerHTML.replace(original, '')
  }

  private buildElements(tag: string, attribute: string): FakeElement[] {
    const pattern = new RegExp(`<${tag}\\b[^>]*>`, 'gi')
    const matches = Array.from(this.body.innerHTML.matchAll(pattern))
    return matches
      .map(match => match[0])
      .filter(match => Object.prototype.hasOwnProperty.call(parseAttributes(match), attribute))
      .map(match => new FakeElement(tag, match, this))
  }

  private buildAllElementsWithAttribute(attribute: string): FakeElement[] {
    const pattern = /<([a-zA-Z0-9:-]+)\b[^>]*>/g
    const matches = Array.from(this.body.innerHTML.matchAll(pattern))
    return matches
      .map(match => ({ tag: match[1], full: match[0] }))
      .filter(item => Object.prototype.hasOwnProperty.call(parseAttributes(item.full), attribute))
      .map(item => new FakeElement(item.tag, item.full, this))
  }
}

class FakeDOMParser {
  parseFromString(html: string): FakeDocument {
    return new FakeDocument(html)
  }
}

describe('core/services/smartPaste', () => {
  describe('detectPasteType', () => {
    it('prefers meaningful HTML over markdown text', () => {
      const payload = {
        html: '<p>HTML content</p>',
        text: '# Markdown title',
        types: ['text/html', 'text/plain'],
      }

      const detection = SmartPasteService.detectPasteType(payload)
      expect(detection.type).toBe('html')
      expect(detection.reasons).toContain('html:meaningful-structure')
    })

    it('detects markdown when score passes threshold', () => {
      const payload = {
        html: null,
        text: '# Title\n\n- Item\n\n> Quote\n\n`code`',
        types: ['text/plain'],
      }

      const detection = SmartPasteService.detectPasteType(payload)
      expect(detection.type).toBe('markdown')
    })

    it('ignores non-structural HTML when markdown text is present', () => {
      const payload = {
        html: '<span>Title</span>',
        text: '# Markdown title',
        types: ['text/html', 'text/plain'],
      }

      const detection = SmartPasteService.detectPasteType(payload)
      expect(detection.type).toBe('markdown')
    })

    it('falls back to plain text when markdown score is low', () => {
      const payload = {
        html: null,
        text: 'Just plain text without formatting.',
        types: ['text/plain'],
      }

      const detection = SmartPasteService.detectPasteType(payload)
      expect(detection.type).toBe('plain')
    })

    it('forces plain text when content exceeds size threshold', () => {
      const payload = {
        html: null,
        text: 'a'.repeat(50),
        types: ['text/plain'],
      }

      const detection = SmartPasteService.detectPasteType(payload, { maxLength: 10 })
      expect(detection.type).toBe('plain')
      expect(detection.warnings).toContain('plain:oversized-text')
    })
  })

  describe('resolvePaste', () => {
    it('converts markdown to sanitized HTML', () => {
      const payload = {
        html: null,
        text: '# Heading\n\n- Item 1\n- Item 2',
        types: ['text/plain'],
      }

      const result = SmartPasteService.resolvePaste(payload)
      expect(result.type).toBe('markdown')
      expect(result.html).toContain('<h1>')
      expect(result.html).toContain('<li>Item 1')
    })

    it('converts markdown horizontal rule to hr', () => {
      const payload = {
        html: null,
        text: '---',
        types: ['text/plain'],
      }

      const result = SmartPasteService.resolvePaste(payload)
      expect(result.type).toBe('markdown')
      expect(result.html).toContain('<hr')
    })

    it('downgrades unsupported markdown to plain text with line breaks', () => {
      const payload = {
        html: null,
        text: '# Title\n\n- Item\n\n| Col A | Col B |\n| --- | --- |\n| 1 | 2 |',
        types: ['text/plain'],
      }

      const result = SmartPasteService.resolvePaste(payload)
      expect(result.type).toBe('plain')
      expect(result.html).toContain('<p>')
      expect(result.html).toContain('|')
      expect(result.warnings).toContain('plain:unsupported-markdown')
    })

    it('downgrades task lists to plain text', () => {
      const payload = {
        html: null,
        text: '# Tasks\n\n- [ ] Task one\n- [x] Task two',
        types: ['text/plain'],
      }

      const result = SmartPasteService.resolvePaste(payload)
      expect(result.type).toBe('plain')
      expect(result.html).toContain('[ ]')
      expect(result.html).toContain('[x]')
    })

    it('filters inline styles using allowlist when DOMParser is present', () => {
      const previous = globalThis.DOMParser
      globalThis.DOMParser = FakeDOMParser as unknown as typeof DOMParser

      const payload = {
        html: '<p><span style="color: red; font-weight: bold; unknown: value;">Styled</span></p>',
        text: null,
        types: ['text/html'],
      }

      try {
        const result = SmartPasteService.resolvePaste(payload)
        expect(result.type).toBe('html')
        expect(result.html).toContain('font-weight: bold')
        expect(result.html).not.toContain('color: red')
        expect(result.html).not.toContain('unknown:')
      } finally {
        globalThis.DOMParser = previous
      }
    })

    it('removes disallowed styles when DOMParser is unavailable', () => {
      const payload = {
        html: '<p><span style="color: red; font-size: 12px">Styled</span></p>',
        text: null,
        types: ['text/html'],
      }

      const result = SmartPasteService.resolvePaste(payload)
      expect(result.type).toBe('html')
      expect(result.html).not.toContain('style=')
      expect(result.html).toContain('Styled')
    })

    it('falls back to plain text when sanitization throws', () => {
      const payload = {
        html: '<p>Safe text</p>',
        text: null,
        types: ['text/html'],
      }

      const spy = jest.spyOn(SanitizationService, 'sanitize').mockImplementation(() => {
        throw new Error('boom')
      })

      const result = SmartPasteService.resolvePaste(payload)
      spy.mockRestore()

      expect(result.type).toBe('plain')
      expect(result.warnings).toContain('plain:parse-failed')
      expect(result.html).toContain('<p>Safe text</p>')
    })

    it('keeps allowed link protocols and strips unsafe ones', () => {
      const previous = globalThis.DOMParser
      globalThis.DOMParser = FakeDOMParser as unknown as typeof DOMParser

      const payload = {
        html: '<p><a href="#section">Anchor</a><a href="/docs">Docs</a><a href="./local">Local</a><a href="../up">Up</a><a href="?q=1">Query</a><a href="https://example.com">Https</a><a href="http://example.com">Http</a><a href="mailto:test@example.com">Mail</a><a href="//example.com">Protocol</a><a href="javascript:alert(1)">Bad</a></p>',
        text: null,
        types: ['text/html'],
      }

      try {
        const result = SmartPasteService.resolvePaste(payload)

        expect(result.type).toBe('html')
        expect(result.html).toContain('href="#section"')
        expect(result.html).toContain('href="/docs"')
        expect(result.html).toContain('href="./local"')
        expect(result.html).toContain('href="../up"')
        expect(result.html).toContain('href="?q=1"')
        expect(result.html).toContain('href="https://example.com"')
        expect(result.html).toContain('href="http://example.com"')
        expect(result.html).toContain('href="mailto:test@example.com"')
        expect(result.html).not.toContain('href="//example.com"')
        expect(result.html).not.toContain('javascript:')
      } finally {
        globalThis.DOMParser = previous
      }
    })

    it('keeps only http/https images and removes others', () => {
      const previous = globalThis.DOMParser
      globalThis.DOMParser = FakeDOMParser as unknown as typeof DOMParser

      const payload = {
        html: '<p><img src="/local.png" alt="Local" /><img src="https://example.com/ok.png" alt="Ok" /><img src="http://example.com/ok2.png" alt="Ok2" /><img src="data:image/png;base64,abc" alt="Data" /><img src="mailto:test@example.com" alt="Mail" /></p>',
        text: null,
        types: ['text/html'],
      }

      try {
        const result = SmartPasteService.resolvePaste(payload)

        expect(result.type).toBe('html')
        expect(result.html).toContain('https://example.com/ok.png')
        expect(result.html).toContain('http://example.com/ok2.png')
        expect(result.html).not.toContain('/local.png')
        expect(result.html).not.toContain('data:image/png')
        expect(result.html).not.toContain('mailto:test@example.com')
      } finally {
        globalThis.DOMParser = previous
      }
    })

    it('filters unsafe URLs using regex when DOMParser is unavailable', () => {
      // Simulate environment without DOMParser
      const originalDOMParser = globalThis.DOMParser
      globalThis.DOMParser = undefined as unknown as typeof DOMParser

      const payload = {
        html: '<a href="javascript:alert(1)">Bad Link</a><img src="file:///etc/passwd" /><a href="https://good.com">Good</a>',
        text: null,
        types: ['text/html'],
      }

      try {
        const result = SmartPasteService.resolvePaste(payload)
        expect(result.type).toBe('html')
        expect(result.html).toContain('href="https://good.com"')
        expect(result.html).not.toContain('javascript:')
        expect(result.html).not.toContain('file:')
      } finally {
        globalThis.DOMParser = originalDOMParser
      }
    })

    it('preserves supported heading levels up to h6', () => {
      const payload = {
        html: null,
        text: '#### Title\n\n- Item',
        types: ['text/plain'],
      }

      const result = SmartPasteService.resolvePaste(payload)
      expect(result.html).toContain('<h4>')
      expect(result.html).toContain('Title')
    })

    it('renders all markdown heading levels', () => {
      const payload = {
        html: null,
        text: '# H1\n\n## H2\n\n### H3\n\n#### H4\n\n##### H5\n\n###### H6',
        types: ['text/plain'],
      }

      const result = SmartPasteService.resolvePaste(payload)
      expect(result.type).toBe('markdown')
      expect(result.html).toContain('<h1>')
      expect(result.html).toContain('<h2>')
      expect(result.html).toContain('<h3>')
      expect(result.html).toContain('<h4>')
      expect(result.html).toContain('<h5>')
      expect(result.html).toContain('<h6>')
    })

    it('treats non-structural HTML as plain text when no markdown is present', () => {
      const payload = {
        html: '<span>Loose text</span>',
        text: 'Just text',
        types: ['text/html', 'text/plain'],
      }

      const result = SmartPasteService.resolvePaste(payload)
      expect(result.type).toBe('plain')
      expect(result.html).toContain('<p>Just text</p>')
    })
  })

  describe('ProseMirror clipboard HTML (editor copy-paste)', () => {
    it('unwraps single-paragraph HTML to inline content for inline-safe pasting', () => {
      // When copying a word from ProseMirror, clipboard wraps it in <p>.
      // Pasting <p>word</p> inside an existing paragraph splits it.
      // The service should return content without wrapping <p>.
      const payload = {
        html: '<p>copied word</p>',
        text: 'copied word',
        types: ['text/html', 'text/plain'],
      }

      const result = SmartPasteService.resolvePaste(payload)
      expect(result.html).not.toMatch(/<p>/)
      expect(result.html).toContain('copied word')
    })

    it('preserves inline formatting when unwrapping single-paragraph HTML', () => {
      const payload = {
        html: '<p><strong>bold</strong> text</p>',
        text: 'bold text',
        types: ['text/html', 'text/plain'],
      }

      const result = SmartPasteService.resolvePaste(payload)
      expect(result.html).toContain('<strong>')
      expect(result.html).toContain('bold')
      expect(result.html).toContain('text')
      expect(result.html).not.toMatch(/^<p>/)
    })

    it('preserves italic formatting when unwrapping single-paragraph HTML', () => {
      const payload = {
        html: '<p><em>italic</em> word</p>',
        text: 'italic word',
        types: ['text/html', 'text/plain'],
      }

      const result = SmartPasteService.resolvePaste(payload)
      expect(result.html).toContain('<em>')
      expect(result.html).not.toMatch(/^<p>/)
    })

    it('preserves mixed inline formatting when unwrapping single-paragraph HTML', () => {
      const payload = {
        html: '<p>Normal <strong>bold</strong> and <em>italic</em> text</p>',
        text: 'Normal bold and italic text',
        types: ['text/html', 'text/plain'],
      }

      const result = SmartPasteService.resolvePaste(payload)
      expect(result.html).toContain('<strong>')
      expect(result.html).toContain('<em>')
      expect(result.html).not.toMatch(/^<p>/)
    })

    it('keeps multi-paragraph HTML structure intact', () => {
      const payload = {
        html: '<p>First</p><p>Second</p>',
        text: 'First\nSecond',
        types: ['text/html', 'text/plain'],
      }

      const result = SmartPasteService.resolvePaste(payload)
      expect(result.type).toBe('html')
      expect(result.html).toContain('<p>')
    })

    it('keeps list structure intact', () => {
      const payload = {
        html: '<ul><li>Item 1</li><li>Item 2</li></ul>',
        text: 'Item 1\nItem 2',
        types: ['text/html', 'text/plain'],
      }

      const result = SmartPasteService.resolvePaste(payload)
      expect(result.type).toBe('html')
      expect(result.html).toContain('<ul>')
      expect(result.html).toContain('<li>')
    })

    it('keeps heading structure intact', () => {
      const payload = {
        html: '<h1>Title</h1><p>Content</p>',
        text: 'Title\nContent',
        types: ['text/html', 'text/plain'],
      }

      const result = SmartPasteService.resolvePaste(payload)
      expect(result.type).toBe('html')
      expect(result.html).toContain('<h1>')
    })
  })
})
