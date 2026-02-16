import {
  getPublishedTagForSite,
  normalizeExportTags,
  slugifyLatin,
  validateWordPressSlug,
} from '../../../../../ui/web/lib/wordpress'

describe('ui/web/lib/wordpress', () => {
  it('slugifyLatin transliterates cyrillic to latin slug', () => {
    const slug = slugifyLatin('\u041f\u0440\u0438\u0432\u0435\u0442 \u043c\u0438\u0440')
    expect(slug).to.equal('privet-mir')
  })

  it('slugifyLatin returns fallback for empty/special input', () => {
    const slug = slugifyLatin('!!!')
    expect(slug).to.equal('note')
  })

  it('validateWordPressSlug validates allowed format', () => {
    expect(validateWordPressSlug('valid-slug-123')).to.equal(null)
    expect(validateWordPressSlug('Invalid_Slug')).to.equal('Use lowercase latin letters, digits, and hyphen only.')
  })

  it('normalizeExportTags trims, deduplicates and keeps order', () => {
    const tags = normalizeExportTags([' work ', 'Work', '', 'personal'])
    expect(tags).to.deep.equal(['work', 'personal'])
  })

  it('getPublishedTagForSite builds site published tag from url', () => {
    expect(getPublishedTagForSite('https://stage.dkoreiba.com/')).to.equal('stage.dkoreiba.com_published')
    expect(getPublishedTagForSite('stage.dkoreiba.com')).to.equal('stage.dkoreiba.com_published')
  })

  it('getPublishedTagForSite returns null for invalid url input', () => {
    expect(getPublishedTagForSite('')).to.equal(null)
    expect(getPublishedTagForSite('://bad-url')).to.equal(null)
  })
})
