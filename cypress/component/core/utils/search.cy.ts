import { buildTsQuery, detectLanguage, ftsLanguage, mapNotesToFtsResult } from '@/core/utils/search'
import type { Tables } from '@/supabase/types'

describe('core/utils/search', () => {
  describe('buildTsQuery', () => {
    it('builds simple query', () => {
      expect(buildTsQuery('test')).to.equal('test:*')
    })

    it('builds query with multiple words', () => {
      expect(buildTsQuery('test query')).to.equal('test:* & query:*')
    })

    it('trims whitespace', () => {
      expect(buildTsQuery('  test  ')).to.equal('test:*')
    })

    it('removes special characters', () => {
      expect(buildTsQuery('test! & query|')).to.equal('test:* & query:*')
    })

    it('throws error for empty query', () => {
      expect(() => buildTsQuery('')).to.throw('Query must be a non-empty string')
    })

    it('throws error for short query', () => {
      expect(() => buildTsQuery('ab')).to.throw('Query must be at least 3 characters')
    })

    it('throws error for long query', () => {
      const longQuery = 'a'.repeat(1001)
      expect(() => buildTsQuery(longQuery)).to.throw('Query exceeds maximum length')
    })

    it('throws error if query becomes empty after sanitization', () => {
      expect(() => buildTsQuery('!!!')).to.throw('Query is empty after sanitization')
    })
  })

  describe('detectLanguage', () => {
    it('detects russian for cyrillic', () => {
      expect(detectLanguage('тест')).to.equal('ru')
    })

    it('detects english for latin', () => {
      expect(detectLanguage('test')).to.equal('en')
    })

    it('defaults to ru for empty', () => {
      expect(detectLanguage('')).to.equal('ru')
    })

    it('detects russian if mixed', () => {
      expect(detectLanguage('test тест')).to.equal('ru')
    })
  })

  describe('ftsLanguage', () => {
    it('returns russian for ru', () => {
      expect(ftsLanguage('ru')).to.equal('russian')
    })

    it('returns english for en', () => {
      expect(ftsLanguage('en')).to.equal('english')
    })

    it('returns russian for uk', () => {
      expect(ftsLanguage('uk')).to.equal('russian')
    })
  })

  describe('mapNotesToFtsResult', () => {
    it('maps notes correctly', () => {
      const notes: Tables<'notes'>[] = [
        {
          id: '1',
          title: 'Test',
          description: 'Description',
          tags: [],
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
          user_id: 'old-user',
          is_archived: false,
          is_favorite: false
        }
      ]
      const userId = 'new-user'
      const result = mapNotesToFtsResult(notes, userId)

      expect(result).to.have.length(1)
      expect(result[0].user_id).to.equal(userId)
      expect(result[0].rank).to.equal(0)
      expect(result[0].headline).to.equal('Description')
    })

    it('truncates headline', () => {
      const longDesc = 'a'.repeat(300)
      const notes: Tables<'notes'>[] = [
        {
          id: '1',
          title: 'Test',
          description: longDesc,
          tags: [],
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
          user_id: 'user',
          is_archived: false,
          is_favorite: false
        }
      ]
      const result = mapNotesToFtsResult(notes, 'user')
      expect(result[0].headline).to.have.length(200)
    })
  })
})
