import { SmartPasteService } from '@core/services/smartPaste'
import { SanitizationService } from '@core/services/sanitizer'

const payload = (html: string | null, text: string | null = null) => ({
  html,
  text,
  types: ['text/html', 'text/plain'],
})

describe('smart paste additional branch behavior', () => {
  const originalDOMParser = globalThis.DOMParser

  beforeEach(() => {
    // Exercise the non-browser implementation used by environments such as React Native.
    globalThis.DOMParser = undefined as unknown as typeof DOMParser
  })

  afterEach(() => {
    jest.restoreAllMocks()
    globalThis.DOMParser = originalDOMParser
  })

  it('filters protocols and styles in the regex fallback while preserving safe values', () => {
    jest.spyOn(SanitizationService, 'sanitize').mockImplementation(value => value)

    const result = SmartPasteService.resolvePaste(
      payload(
        '<p><span style=\'font-style: italic; color: red; : malformed; font-weight: \'>Styled</span>' +
          '<a href=\'mailto:test@example.com\'>Mail</a>' +
          '<a href=\'../notes\'>Relative</a>' +
          '<a href=\'javascript:alert(1)\'>Unsafe link</a>' +
          '<a href=\'//remote.test\'>Protocol-relative link</a>' +
          '<img src=\'https://cdn.test/image.png\'>' +
          '<img src=\'data:image/png;base64,abc\'>' +
          '<img src=\'not-a-url\'>' +
          '<img src=\'//remote.test/image.png\'>' +
        '</p>',
      ),
    )

    expect(result.type).toBe('html')
    expect(result.html).toContain("<span style=\"font-style: italic\">Styled</span>")
    expect(result.html).toContain("href='mailto:test@example.com'")
    expect(result.html).toContain("href='../notes'")
    expect(result.html).toContain("src='https://cdn.test/image.png'")
    expect(result.html).not.toContain('color: red')
    expect(result.html).not.toContain('javascript:')
    expect(result.html).not.toContain('//remote.test')
    expect(result.html).not.toContain('data:image/png')
    expect(result.html).not.toContain("src='not-a-url'")
  })

  it('keeps markdown when a malformed table separator is rejected and falls back for a valid table', () => {
    const malformed = SmartPasteService.resolvePaste(
      payload(null, '# Data\n\nName | Value\n| : | --- |\nAlice | 1'),
    )

    expect(malformed.type).toBe('markdown')
    expect(malformed.warnings).not.toContain('plain:unsupported-markdown')

    const supportedTable = SmartPasteService.resolvePaste(
      payload(null, '# Data\n\nName | Value\n| :--- | ---: |\nAlice | 1'),
    )

    expect(supportedTable.type).toBe('plain')
    expect(supportedTable.warnings).toContain('plain:unsupported-markdown')
    expect(supportedTable.html).toContain('| :--- | ---: |')
  })

  it('honors a forced plain type for HTML-only input', () => {
    const result = SmartPasteService.resolvePaste(payload('<p>Forced content</p>'), {}, 'plain')

    expect(result.type).toBe('plain')
    expect(result.detection.reasons).toEqual(['forced-by-user'])
    expect(result.html).toContain('<p>Forced content</p>')
  })

  it('returns text-first fallback output when parsing throws', () => {
    jest.spyOn(SanitizationService, 'sanitize').mockImplementation(() => {
      throw new Error('sanitizer failure')
    })

    const result = SmartPasteService.resolvePaste(payload('<p>HTML content</p>', 'Fallback <text>'), {}, 'html')

    expect(result.type).toBe('plain')
    expect(result.warnings).toContain('plain:parse-failed')
    expect(result.html).toBe('<p>Fallback &lt;text&gt;</p>')
  })

  it('returns an empty paragraph when both sanitization and safe HTML stripping fail', () => {
    jest.spyOn(SanitizationService, 'sanitize').mockImplementation(() => {
      throw new Error('sanitizer failure')
    })
    jest.spyOn(SanitizationService, 'stripHtml').mockImplementation(() => {
      throw new Error('strip failure')
    })

    const result = SmartPasteService.resolvePaste(payload('<p>Unreadable</p>'), {}, 'html')

    expect(result.type).toBe('plain')
    expect(result.warnings).toContain('plain:parse-failed')
    expect(result.html).toBe('<p></p>')
  })
})
