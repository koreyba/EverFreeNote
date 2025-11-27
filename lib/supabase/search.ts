/**
 * Полнотекстовый поиск заметок с fallback на ILIKE.
 */

import { createClient } from './client'

import type { FtsSearchResult, Tables } from '@/supabase/types'

const FTS_LANGUAGES = {
  ru: 'russian',
  en: 'english',
  uk: 'russian', // PostgreSQL не имеет украинской конфигурации
} as const

type LanguageCode = keyof typeof FTS_LANGUAGES

const MAX_QUERY_LENGTH = 1000
const MIN_QUERY_LENGTH = 3

type SearchOptions = {
  language?: LanguageCode
  minRank?: number
  limit?: number
  offset?: number
}

type SearchResult = {
  results: FtsSearchResult[]
  total: number
  executionTime: number
}

/**
 * Формирует безопасный ts_query для PostgreSQL FTS.
 */
export function buildTsQuery(query: string, language: LanguageCode = 'ru'): string {
  if (!query || typeof query !== 'string') {
    throw new Error('Некорректный поисковый запрос: нужна непустая строка')
  }

  if (query.length > MAX_QUERY_LENGTH) {
    throw new Error(`Запрос слишком длинный: максимум ${MAX_QUERY_LENGTH} символов`)
  }

  const trimmed = query.trim()

  if (trimmed.length < MIN_QUERY_LENGTH) {
    throw new Error(`Запрос слишком короткий: минимум ${MIN_QUERY_LENGTH} символа`)
  }

  const sanitized = trimmed
    .replace(/[&|!():<>]/g, ' ') // убираем спецсимволы FTS
    .replace(/\s+/g, ' ')
    .trim()

  if (!sanitized) {
    throw new Error('Пустой запрос после очистки')
  }

  const words = sanitized.split(' ').filter(Boolean)

  if (words.length === 1) {
    return `${words[0]}:*`
  }

  return words.map((word) => `${word}:*`).join(' & ')
}

/**
 * FTS-поиск через RPC-функцию с ранжированием.
 */
export async function searchNotesFTS(
  query: string,
  userId: string,
  options: SearchOptions = {},
): Promise<SearchResult> {
  const startTime = Date.now()
  const {
    language = 'ru',
    minRank = 0.1,
    limit = 20,
    offset = 0,
  } = options

  const ftsLanguage = FTS_LANGUAGES[language] ?? FTS_LANGUAGES.ru
  const tsQuery = buildTsQuery(query, language)

  const supabase = createClient()
  const { data, error } = await supabase.rpc('search_notes_fts', {
    search_query: tsQuery,
    search_language: ftsLanguage,
    min_rank: minRank,
    result_limit: limit,
    result_offset: offset,
    search_user_id: userId,
  })

  if (error) {
    throw new Error(`FTS search failed: ${error.message}`)
  }

  const results = (data ?? []) as FtsSearchResult[]

  return {
    results,
    total: results.length,
    executionTime: Date.now() - startTime,
  }
}

/**
 * Фоллбек на ILIKE при ошибках FTS.
 */
export async function searchNotesILIKE(
  query: string,
  userId: string,
  options: Pick<SearchOptions, 'limit' | 'offset'> = {},
): Promise<SearchResult> {
  const startTime = Date.now()
  const { limit = 20, offset = 0 } = options
  const pattern = `%${query}%`

  const supabase = createClient()
  const { data, error, count } = await supabase
    .from('notes')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .or(`title.ilike.${pattern},description.ilike.${pattern}`)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`ILIKE search failed: ${error.message}`)
  }

  const baseResults = (data ?? []) as Tables<'notes'>[]
  const results: FtsSearchResult[] = baseResults.map((note) => ({
    ...note,
    rank: 0,
    headline: note.description ? note.description.substring(0, 200) : '',
  }))

  return {
    results,
    total: count ?? results.length,
    executionTime: Date.now() - startTime,
  }
}

/**
 * Простое определение языка по символам.
 */
export function detectLanguage(query: string): LanguageCode {
  if (!query) return 'ru'

  const hasCyrillic = /[\u0400-\u04FF]/.test(query)
  return hasCyrillic ? 'ru' : 'en'
}
