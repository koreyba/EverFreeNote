import { buildTsQuery, detectLanguage, ftsLanguage } from '@core/utils/search'

describe('buildTsQuery', () => {
  it('returns null for empty or short input', () => {
    expect(buildTsQuery('')).toBeNull()
    expect(buildTsQuery('  ')).toBeNull()
    expect(buildTsQuery('ab')).toBeNull()
  })

  it('returns null for overly long input', () => {
    const longQuery = 'a'.repeat(1001)
    expect(buildTsQuery(longQuery)).toBeNull()
  })

  it('builds a single-word query', () => {
    expect(buildTsQuery('hello')).toBe('hello:*')
  })

  it('builds a multi-word query with sanitization', () => {
    expect(buildTsQuery('hello & world')).toBe('hello:* & world:*')
  })
})

describe('detectLanguage', () => {
  it('defaults to ru for empty input', () => {
    expect(detectLanguage('')).toBe('ru')
  })

  it('detects cyrillic as ru', () => {
    expect(detectLanguage('привет')).toBe('ru')
  })

  it('detects latin as en', () => {
    expect(detectLanguage('hello')).toBe('en')
  })
})

describe('ftsLanguage', () => {
  it('maps known language codes', () => {
    expect(ftsLanguage('ru')).toBe('russian')
    expect(ftsLanguage('en')).toBe('english')
    expect(ftsLanguage('uk')).toBe('russian')
  })
})
