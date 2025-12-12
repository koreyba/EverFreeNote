import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables, FtsSearchResult } from '@/supabase/types'
import {
  buildTsQuery,
  detectLanguage,
  ftsLanguage,
  mapNotesToFtsResult,
  type LanguageCode,
  type SearchOptions,
  type SearchResult,
} from '../utils/search'

export class SearchService {
  constructor(private supabase: SupabaseClient) {}

  // Sanitize for PostgREST OR syntax
  private sanitizeOrValue(value: string) {
    // Remove double quotes to avoid breaking PostgREST quoted values
    // We will wrap the value in double quotes in the query
    return value.replace(/"/g, '')
  }

  async searchNotes(
    userId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    const {
      language = detectLanguage(query),
      minRank = 0.01,
      limit = 50,
      offset = 0,
      tag = null,
    } = options

    // 1. Try Full Text Search (FTS)
    try {
      const tsQuery = buildTsQuery(query)
      
      if (tsQuery) {
        const ftsLang = ftsLanguage(language as LanguageCode)

        const { data, error } = await this.supabase.rpc('search_notes_fts', {
          search_query: tsQuery,
          search_language: ftsLang,
          min_rank: minRank,
          result_limit: limit,
          result_offset: offset,
          search_user_id: userId,
        })

        if (!error && data) {
          type FtsRow = FtsSearchResult & { total_count?: number }
          const rows = data as FtsRow[]
          const filtered = tag
            ? rows.filter((note) => (note.tags ?? []).includes(tag))
            : rows

          // If FTS found results, return them.
          // If FTS found nothing (0 results), fall through to ILIKE fallback to support substring search
          if (filtered.length > 0) {
            const totalFromDb = filtered[0]?.total_count ?? rows[0]?.total_count
            const inferredTotal = typeof totalFromDb === 'number'
              ? totalFromDb
              : filtered.length + offset

            return {
              results: filtered,
              total: inferredTotal,
              method: 'fts',
            }
          }
        }
      }
    } catch (e) {
      console.warn('FTS search exception:', e)
    }

    // 2. Fallback to ILIKE (Simple search)
    try {
      const searchLower = query.toLowerCase()
      const safeSearch = this.sanitizeOrValue(searchLower)
      let supabaseQuery = this.supabase
        .from('notes')
        .select('id, title, description, tags, created_at, updated_at')
        .eq('user_id', userId)
        .or(`title.ilike."%${safeSearch}%",description.ilike."%${safeSearch}%"`)

      if (tag) {
        supabaseQuery = supabaseQuery.contains('tags', [tag])
      }

      const { data, error } = await supabaseQuery
        .range(offset, offset + limit - 1)
        .order('updated_at', { ascending: false })

      if (error) throw error

      const mappedResults: FtsSearchResult[] = mapNotesToFtsResult((data as Tables<'notes'>[]) || [], userId)

      return {
        results: mappedResults,
        total: mappedResults.length,
        method: 'fallback',
      }
    } catch (error: unknown) {
      let errorMessage = 'Unknown error occurred'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String((error as { message: unknown }).message)
      }

      return {
        results: [],
        total: 0,
        method: 'fallback',
        error: errorMessage,
      }
    }
  }
}

export type { SearchOptions, SearchResult, LanguageCode } from '../utils/search'
