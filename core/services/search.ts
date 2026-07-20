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
  constructor(private supabase: SupabaseClient) { }

  // Sanitize for PostgREST OR syntax
  private sanitizeOrValue(value: string) {
    // Remove double quotes to avoid breaking PostgREST quoted values
    // We will wrap the value in double quotes in the query
    return value.replace(/"/g, '')
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as { message: unknown }).message)
    }
    return 'Unknown error occurred'
  }

  private async executeFtsSearch(
    userId: string,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult | null> {
    const { language = detectLanguage(query), minRank = 0.01, limit = 50, offset = 0, tag = null } = options
    const tsQuery = buildTsQuery(query)
    if (!tsQuery) return null

    const ftsLang = ftsLanguage(language as LanguageCode)
    const { data, error } = await this.supabase.rpc('search_notes_fts', {
      search_query: tsQuery,
      search_language: ftsLang,
      min_rank: minRank,
      result_limit: limit,
      result_offset: offset,
      search_user_id: userId,
      filter_tag: tag ?? null,
    })

    if (error || !data) return null

    type FtsRow = FtsSearchResult & { total_count?: number }
    const rows = data as FtsRow[]
    if (rows.length === 0) return null

    const normalizedRows: FtsSearchResult[] = rows.map((row) => ({
      ...(row as unknown as Tables<'notes'>),
      user_id: userId,
      description:
        (row as unknown as { description?: string | null }).description ??
        (row as unknown as { content?: string | null }).content ??
        '',
      rank: row.rank,
      headline: row.headline ?? null,
      content: (row as unknown as { content?: string | null }).content ?? null,
    }))

    const totalFromDb = rows[0]?.total_count
    const inferredTotal = typeof totalFromDb === 'number' ? totalFromDb : rows.length + offset

    return {
      results: normalizedRows,
      total: inferredTotal,
      method: 'fts',
    }
  }

  private async executeFallbackSearch(
    userId: string,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult> {
    const { limit = 50, offset = 0, tag = null } = options
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
  }

  async searchNotes(
    userId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    try {
      const ftsResult = await this.executeFtsSearch(userId, query, options)
      if (ftsResult) return ftsResult
    } catch (e) {
      console.warn('FTS search exception:', e)
    }

    try {
      return await this.executeFallbackSearch(userId, query, options)
    } catch (error: unknown) {
      return {
        results: [],
        total: 0,
        method: 'fallback',
        error: this.extractErrorMessage(error),
      }
    }
  }
}

export type { SearchOptions, SearchResult, LanguageCode } from '../utils/search'
