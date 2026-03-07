import {
  buildTsQuery,
  detectLanguage,
  shouldUpdateTagFilter,
  mapNotesToFtsResult,
  ftsLanguage,
} from '@core/utils/search'
import type { Tables } from '@/supabase/types'

describe('core/utils/search', () => {
  describe('buildTsQuery', () => {
    it('returns null for empty string', () => {
      expect(buildTsQuery('')).toBeNull()
    })

    it('returns null for whitespace-only string', () => {
      expect(buildTsQuery('   ')).toBeNull()
    })

    it('returns null for non-string input', () => {
      expect(buildTsQuery(null as unknown as string)).toBeNull()
      expect(buildTsQuery(undefined as unknown as string)).toBeNull()
      expect(buildTsQuery(123 as unknown as string)).toBeNull()
    })

    it('returns null for query shorter than minimum length', () => {
      expect(buildTsQuery('a')).toBeNull()
      expect(buildTsQuery('ab')).toBeNull()
    })

    it('returns null for query exceeding maximum length', () => {
      const longQuery = 'a'.repeat(1001)
      expect(buildTsQuery(longQuery)).toBeNull()
    })

    it('builds prefix query for single word', () => {
      expect(buildTsQuery('test')).toBe('test:*')
      expect(buildTsQuery('hello')).toBe('hello:*')
      expect(buildTsQuery('заметка')).toBe('заметка:*')
    })

    it('builds AND query for multiple words', () => {
      expect(buildTsQuery('hello world')).toBe('hello:* & world:*')
      expect(buildTsQuery('test query search')).toBe('test:* & query:* & search:*')
    })

    it('sanitizes special characters', () => {
      expect(buildTsQuery('test & query')).toBe('test:* & query:*')
      expect(buildTsQuery('hello|world')).toBe('hello:* & world:*')
      expect(buildTsQuery('foo!bar')).toBe('foo:* & bar:*')
      expect(buildTsQuery('test(with)brackets')).toBe('test:* & with:* & brackets:*')
    })

    it('removes extra whitespace', () => {
      expect(buildTsQuery('  hello   world  ')).toBe('hello:* & world:*')
      expect(buildTsQuery('test\t\nquery')).toBe('test:* & query:*')
    })

    it('handles mixed language queries', () => {
      expect(buildTsQuery('test тест')).toBe('test:* & тест:*')
    })

    it('filters out empty words after sanitization', () => {
      expect(buildTsQuery('hello && world')).toBe('hello:* & world:*')
      expect(buildTsQuery('test  |  query')).toBe('test:* & query:*')
    })

    it('handles minimum valid query (3 characters)', () => {
      expect(buildTsQuery('abc')).toBe('abc:*')
      expect(buildTsQuery('тест')).toBe('тест:*')
    })
  })

  describe('detectLanguage', () => {
    it('returns "ru" for empty string', () => {
      expect(detectLanguage('')).toBe('ru')
    })

    it('returns "ru" for cyrillic text', () => {
      expect(detectLanguage('привет')).toBe('ru')
      expect(detectLanguage('тест')).toBe('ru')
      expect(detectLanguage('заметка')).toBe('ru')
    })

    it('returns "en" for latin text', () => {
      expect(detectLanguage('hello')).toBe('en')
      expect(detectLanguage('test')).toBe('en')
      expect(detectLanguage('note')).toBe('en')
    })

    it('returns "ru" for mixed text with cyrillic', () => {
      expect(detectLanguage('hello мир')).toBe('ru')
      expect(detectLanguage('test тест')).toBe('ru')
    })

    it('returns "en" for numbers only', () => {
      expect(detectLanguage('12345')).toBe('en')
    })

    it('returns "en" for special characters only', () => {
      expect(detectLanguage('@#$%')).toBe('en')
    })

    it('handles ukrainian characters as russian', () => {
      expect(detectLanguage('привіт')).toBe('ru')
    })
  })

  describe('shouldUpdateTagFilter', () => {
    it('returns true when tags differ', () => {
      expect(shouldUpdateTagFilter('work', 'personal')).toBe(true)
      expect(shouldUpdateTagFilter(null, 'work')).toBe(true)
      expect(shouldUpdateTagFilter('work', null)).toBe(true)
    })

    it('returns false when tags are the same', () => {
      expect(shouldUpdateTagFilter('work', 'work')).toBe(false)
      expect(shouldUpdateTagFilter(null, null)).toBe(false)
    })

    it('treats empty string and null as different', () => {
      expect(shouldUpdateTagFilter('', null)).toBe(true)
      expect(shouldUpdateTagFilter(null, '')).toBe(true)
    })
  })

  describe('mapNotesToFtsResult', () => {
    const userId = 'test-user-123'

    it('maps empty array to empty array', () => {
      expect(mapNotesToFtsResult([], userId)).toEqual([])
    })

    it('maps single note with description', () => {
      const note: Tables<'notes'> = {
        id: 'note-1',
        user_id: userId,
        title: 'Test Note',
        description: 'This is a test note with some content',
        tags: ['test'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const result = mapNotesToFtsResult([note], userId)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'note-1',
        user_id: userId,
        title: 'Test Note',
        description: 'This is a test note with some content',
        rank: 0,
        headline: 'This is a test note with some content',
      })
    })

    it('maps note without description (null)', () => {
      const note: Tables<'notes'> = {
        id: 'note-2',
        user_id: userId,
        title: 'Note without description',
        description: '',
        tags: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const result = mapNotesToFtsResult([note], userId)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'note-2',
        rank: 0,
        headline: '',
      })
    })

    it('truncates long descriptions to 200 characters', () => {
      const longDescription = 'a'.repeat(300)
      const note: Tables<'notes'> = {
        id: 'note-3',
        user_id: userId,
        title: 'Long Note',
        description: longDescription,
        tags: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const result = mapNotesToFtsResult([note], userId)

      expect(result[0].headline).toHaveLength(200)
      expect(result[0].headline).toBe('a'.repeat(200))
    })

    it('maps multiple notes', () => {
      const notes: Tables<'notes'>[] = [
        {
          id: 'note-1',
          user_id: userId,
          title: 'Note 1',
          description: 'First note',
          tags: ['tag1'],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'note-2',
          user_id: userId,
          title: 'Note 2',
          description: 'Second note',
          tags: ['tag2'],
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]

      const result = mapNotesToFtsResult(notes, userId)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('note-1')
      expect(result[1].id).toBe('note-2')
      expect(result[0].rank).toBe(0)
      expect(result[1].rank).toBe(0)
    })

    it('preserves all note properties', () => {
      const note: Tables<'notes'> = {
        id: 'note-1',
        user_id: userId,
        title: 'Test',
        description: 'Desc',
        tags: ['tag1', 'tag2'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T12:00:00Z',
      }

      const result = mapNotesToFtsResult([note], userId)

      expect(result[0]).toMatchObject({
        id: note.id,
        user_id: userId,
        title: note.title,
        description: note.description,
        tags: note.tags,
        created_at: note.created_at,
        updated_at: note.updated_at,
      })
    })
  })

  describe('ftsLanguage', () => {
    it('maps "ru" to "russian"', () => {
      expect(ftsLanguage('ru')).toBe('russian')
    })

    it('maps "en" to "english"', () => {
      expect(ftsLanguage('en')).toBe('english')
    })

    it('maps "uk" to "russian"', () => {
      expect(ftsLanguage('uk')).toBe('russian')
    })

    it('falls back to "russian" for unknown language', () => {
      expect(ftsLanguage('fr' as unknown as 'ru' | 'en')).toBe('russian')
      expect(ftsLanguage('de' as unknown as 'ru' | 'en')).toBe('russian')
    })
  })
})

