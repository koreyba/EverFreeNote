import { normalizeExportTags, slugifyLatin, validateWordPressSlug } from '../../../../../ui/web/lib/wordpress'

describe('ui/web/lib/wordpress', () => {
  it('slugifyLatin transliterates cyrillic to latin slug', () => {
    const slug = slugifyLatin('?????? ???')
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
})
