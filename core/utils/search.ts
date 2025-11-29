import type { Tables, FtsSearchResult } from '@/supabase/types'

const FTS_LANGUAGES = {
  ru: 'russian',
  en: 'english',
  uk: 'russian',
} as const

export type LanguageCode = keyof typeof FTS_LANGUAGES

const MAX_QUERY_LENGTH = 1000
const MIN_QUERY_LENGTH = 3

export function buildTsQuery(query: string, _language: LanguageCode = 'ru'): string {
  if (!query || typeof query !== 'string') {
    throw new Error('Query must be a non-empty string')
  }

  if (query.length > MAX_QUERY_LENGTH) {
    throw new Error(`Query exceeds maximum length: ${MAX_QUERY_LENGTH}`)
  }

  const trimmed = query.trim()

  if (trimmed.length < MIN_QUERY_LENGTH) {
    throw new Error(`Query must be at least ${MIN_QUERY_LENGTH} characters`)
  }

  const sanitized = trimmed
    .replace(/[&|!():<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!sanitized) {
    throw new Error('Query is empty after sanitization')
  }

  const words = sanitized.split(' ').filter(Boolean)

  if (words.length === 1) {
    return `${words[0]}:*`
  }

  return words.map((word) => `${word}:*`).join(' & ')
}

export function detectLanguage(query: string): LanguageCode {
  if (!query) return 'ru'

  const hasCyrillic = /[\u0400-\u04FF]/.test(query)
  return hasCyrillic ? 'ru' : 'en'
}

export type SearchOptions = {
  language?: LanguageCode
  minRank?: number
  limit?: number
  offset?: number
  tag?: string | null
}

export type SearchResult = {
  results: FtsSearchResult[]
  total: number
  method: 'fts' | 'fallback'
  error?: string
  executionTime?: number
}

export type NotesTable = Tables<'notes'>

export const mapNotesToFtsResult = (notes: NotesTable[], userId: string): FtsSearchResult[] =>
  notes.map((note) => ({
    ...note,
    user_id: userId,
    rank: 0,
    headline: note.description ? note.description.substring(0, 200) : '',
  }))

export const ftsLanguage = (language: LanguageCode) => FTS_LANGUAGES[language] ?? FTS_LANGUAGES.ru
