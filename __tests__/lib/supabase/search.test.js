/**
 * Unit tests for FTS search functions
 */

import { buildTsQuery, detectLanguage } from '@/lib/supabase/search'

describe('buildTsQuery', () => {
  describe('Valid queries', () => {
    test('should handle single word query', () => {
      const result = buildTsQuery('hello')
      expect(result).toBe('hello:*')
    })

    test('should handle multi-word query', () => {
      const result = buildTsQuery('hello world')
      expect(result).toBe('hello:* & world:*')
    })

    test('should handle query with extra whitespace', () => {
      const result = buildTsQuery('  hello   world  ')
      expect(result).toBe('hello:* & world:*')
    })

    test('should handle query with special FTS characters', () => {
      const result = buildTsQuery('test & query | special')
      expect(result).toBe('test:* & query:* & special:*')
    })

    test('should handle query with punctuation', () => {
      const result = buildTsQuery('hello! world?')
      expect(result).toBe('hello:* & world:*')
    })

    test('should handle Russian text', () => {
      const result = buildTsQuery('привет мир')
      expect(result).toBe('привет:* & мир:*')
    })

    test('should handle Ukrainian text', () => {
      const result = buildTsQuery('привіт світ')
      expect(result).toBe('привіт:* & світ:*')
    })

    test('should handle mixed language text', () => {
      const result = buildTsQuery('hello привет')
      expect(result).toBe('hello:* & привет:*')
    })
  })

  describe('Invalid queries', () => {
    test('should throw error for empty string', () => {
      expect(() => buildTsQuery('')).toThrow('Query too short')
    })

    test('should throw error for whitespace only', () => {
      expect(() => buildTsQuery('   ')).toThrow('Query too short')
    })

    test('should throw error for null', () => {
      expect(() => buildTsQuery(null)).toThrow('Invalid search query')
    })

    test('should throw error for undefined', () => {
      expect(() => buildTsQuery(undefined)).toThrow('Invalid search query')
    })

    test('should throw error for non-string', () => {
      expect(() => buildTsQuery(123)).toThrow('Invalid search query')
    })

    test('should throw error for query too long', () => {
      const longQuery = 'a'.repeat(1001)
      expect(() => buildTsQuery(longQuery)).toThrow('Query too long')
    })

    test('should throw error for query too short (< 3 chars)', () => {
      expect(() => buildTsQuery('ab')).toThrow('Query too short')
    })

    test('should throw error for query with only special characters', () => {
      expect(() => buildTsQuery('!@#$%')).toThrow('Empty search query after sanitization')
    })
  })

  describe('Edge cases', () => {
    test('should handle exactly 3 characters', () => {
      const result = buildTsQuery('abc')
      expect(result).toBe('abc:*')
    })

    test('should handle exactly 1000 characters', () => {
      const query = 'a'.repeat(1000)
      const result = buildTsQuery(query)
      expect(result).toContain(':*')
    })

    test('should handle numbers', () => {
      const result = buildTsQuery('test 123')
      expect(result).toBe('test:* & 123:*')
    })

    test('should handle hyphenated words', () => {
      const result = buildTsQuery('full-text search')
      expect(result).toBe('full-text:* & search:*')
    })

    test('should handle underscores', () => {
      const result = buildTsQuery('test_query')
      expect(result).toBe('test_query:*')
    })
  })

  describe('Sanitization', () => {
    test('should remove & operator', () => {
      const result = buildTsQuery('word1 & word2')
      expect(result).toBe('word1:* & word2:*')
      expect(result).not.toContain(' & &')
    })

    test('should remove | operator', () => {
      const result = buildTsQuery('word1 | word2')
      expect(result).toBe('word1:* & word2:*')
    })

    test('should remove ! operator', () => {
      const result = buildTsQuery('word1 ! word2')
      expect(result).toBe('word1:* & word2:*')
    })

    test('should remove parentheses', () => {
      const result = buildTsQuery('(word1) (word2)')
      expect(result).toBe('word1:* & word2:*')
    })

    test('should remove colons', () => {
      const result = buildTsQuery('word1:word2')
      expect(result).toBe('word1word2:*')
    })

    test('should remove angle brackets', () => {
      const result = buildTsQuery('<word1> <word2>')
      expect(result).toBe('word1:* & word2:*')
    })
  })
})

describe('detectLanguage', () => {
  test('should detect Russian Cyrillic', () => {
    expect(detectLanguage('привет')).toBe('ru')
  })

  test('should detect Ukrainian Cyrillic', () => {
    expect(detectLanguage('привіт')).toBe('ru') // Both use 'ru' config
  })

  test('should detect English Latin', () => {
    expect(detectLanguage('hello')).toBe('en')
  })

  test('should detect mixed as Cyrillic if present', () => {
    expect(detectLanguage('hello привет')).toBe('ru')
  })

  test('should default to Russian for empty string', () => {
    expect(detectLanguage('')).toBe('ru')
  })

  test('should default to Russian for null', () => {
    expect(detectLanguage(null)).toBe('ru')
  })

  test('should detect numbers as English', () => {
    expect(detectLanguage('12345')).toBe('en')
  })
})

// Note: searchNotesFTS and searchNotesILIKE tests require mocking Supabase client
// These are better tested in integration tests with real database
describe('searchNotesFTS (integration)', () => {
  test.skip('should be tested in integration tests', () => {
    // Integration tests in cypress/e2e/search.cy.js
  })
})

describe('searchNotesILIKE (integration)', () => {
  test.skip('should be tested in integration tests', () => {
    // Integration tests in cypress/e2e/search.cy.js
  })
})

