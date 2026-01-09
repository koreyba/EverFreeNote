import { SmartPasteService } from '@core/services/smartPaste'

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
      expect(result.html).not.toContain('|')
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
      expect(result.html).not.toContain('[ ]')
      expect(result.html).not.toContain('[x]')
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
})
