import { SupabaseClient } from '@supabase/supabase-js';
import { buildTsQuery } from '@/lib/supabase/search';
import { FtsSearchResult } from '@/supabase/types';

export type SearchOptions = {
  language?: 'ru' | 'en' | 'uk';
  minRank?: number;
  limit?: number;
  offset?: number;
};

export type SearchResult = {
  results: FtsSearchResult[];
  total: number;
  method: 'fts' | 'fallback';
  error?: string;
};

export class SearchService {
  constructor(private supabase: SupabaseClient) {}

  async searchNotes(
    userId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    const {
      language = 'ru',
      minRank = 0.01,
      limit = 20,
      offset = 0
    } = options;

    // 1. Try Full Text Search (FTS)
    try {
      const tsQuery = buildTsQuery(query, language);
      const ftsLanguage = language === 'uk' ? 'russian' : language === 'en' ? 'english' : 'russian';

      const { data, error } = await this.supabase.rpc('search_notes_fts', {
        search_query: tsQuery,
        search_language: ftsLanguage,
        min_rank: minRank,
        result_limit: limit,
        result_offset: offset,
        search_user_id: userId
      });

      if (!error && data) {
        return {
          results: data,
          total: data.length,
          method: 'fts'
        };
      }
      
      console.warn('FTS search failed or returned error, falling back to ILIKE:', error?.message);
    } catch (e) {
      console.warn('FTS search exception:', e);
    }

    // 2. Fallback to ILIKE (Simple search)
    try {
      const searchLower = query.toLowerCase();
      const { data, error } = await this.supabase
        .from('notes')
        .select('id, title, description, tags, created_at, updated_at')
        .eq('user_id', userId)
        .or(`title.ilike.%${searchLower}%,description.ilike.%${searchLower}%`)
        .range(offset, offset + limit - 1)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Map simple notes to FTS result structure (missing rank/headline)
      const mappedResults: FtsSearchResult[] = (data || []).map(note => ({
        id: note.id,
        title: note.title,
        description: note.description,
        tags: note.tags,
        created_at: note.created_at,
        updated_at: note.updated_at,
        user_id: userId, // We know the user_id
        rank: 0,
        headline: note.description?.substring(0, 100) || ''
      }));

      return {
        results: mappedResults,
        total: mappedResults.length,
        method: 'fallback'
      };

    } catch (error: any) {
      return {
        results: [],
        total: 0,
        method: 'fallback',
        error: error.message
      };
    }
  }
}
