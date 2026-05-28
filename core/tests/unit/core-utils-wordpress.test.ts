import {
  getPublishedTagForSite,
  normalizeExportTags,
  slugifyLatin,
  validateWordPressSlug,
} from '@core/utils/wordpress'

describe('core/utils/wordpress', () => {
  it('transliterates cyrillic text into a deterministic latin slug', () => {
    expect(slugifyLatin('Привет мир')).toBe('privet-mir')
  })

  it('returns the fallback slug for empty or unsupported input', () => {
    expect(slugifyLatin('!!!')).toBe('note')
  })

  it('validates slug format rules', () => {
    expect(validateWordPressSlug('valid-slug-123')).toBeNull()
    expect(validateWordPressSlug('Invalid_Slug')).toBe('Use lowercase latin letters, digits, and hyphen only.')
  })

  it('normalizes export tags without changing user-facing order', () => {
    expect(normalizeExportTags([' work ', 'Work', '', 'personal'])).toEqual(['work', 'personal'])
  })

  it('derives a published tag from the site hostname', () => {
    expect(getPublishedTagForSite('https://stage.dkoreiba.com/')).toBe('stage.dkoreiba.com_published')
    expect(getPublishedTagForSite('stage.dkoreiba.com')).toBe('stage.dkoreiba.com_published')
  })

  it('returns null when the site url cannot produce a hostname', () => {
    expect(getPublishedTagForSite('')).toBeNull()
    expect(getPublishedTagForSite('://bad-url')).toBeNull()
  })
})
