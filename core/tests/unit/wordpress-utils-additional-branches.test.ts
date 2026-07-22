import {
  getPublishedTagForSite,
  normalizeExportTags,
  slugifyLatin,
  validateWordPressSlug,
} from '../../utils/wordpress'

describe('WordPress utility additional branches', () => {
  it('normalizes accents, transliterates Cyrillic, ignores unsupported symbols and collapses separators', () => {
    expect(slugifyLatin('  Caf\u00e9 \u2014 \u0442\u0435\u0441\u0442 / foo__bar\\baz...  '))
      .toBe('cafe-test-foo-bar-baz')
    expect(slugifyLatin('\u044a\u044c')).toBe('note')
  })

  it('trims a hyphen at the truncation boundary and preserves the maximum-length boundary', () => {
    const valueEndingWithHyphenAtBoundary = `${'a'.repeat(95)} b`

    expect(slugifyLatin(valueEndingWithHyphenAtBoundary)).toBe('a'.repeat(95))
    expect(slugifyLatin('a'.repeat(96))).toBe('a'.repeat(96))
  })

  it('keeps the first non-empty tag spelling and removes case-insensitive duplicates', () => {
    expect(normalizeExportTags([
      '  Work  ',
      'work',
      'WORK',
      '   ',
      '\t',
      ' Personal ',
      'personal',
      '  work  ',
    ])).toEqual(['Work', 'Personal'])
  })

  it('validates whitespace, boundary length and slug characters', () => {
    expect(validateWordPressSlug('  valid-slug-123  ')).toBeNull()
    expect(validateWordPressSlug('a'.repeat(96))).toBeNull()
    expect(validateWordPressSlug('a--b')).toBe('Use lowercase latin letters, digits, and hyphen only.')
    expect(validateWordPressSlug('A-b')).toBe('Use lowercase latin letters, digits, and hyphen only.')
  })

  it('derives published tags from host-style and dotted URLs and falls back for malformed URLs', () => {
    expect(getPublishedTagForSite(' example.com/path ')).toBe('example.com_published')
    expect(getPublishedTagForSite('https://Example.COM...:443/path')).toBe('example.com_published')
    expect(getPublishedTagForSite('/relative/path')).toBe('relative_published')
    expect(getPublishedTagForSite('http://[malformed')).toBeNull()
  })
})
