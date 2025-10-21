/**
 * Full-Text Search functions for notes
 * Implements PostgreSQL FTS with ranking, highlighting, and fallback to ILIKE
 */

import { createClient } from './client';

// Language mapping: user-friendly codes to PostgreSQL FTS configs
const FTS_LANGUAGES = {
  'ru': 'russian',
  'en': 'english',
  'uk': 'russian', // PostgreSQL doesn't have ukrainian, use russian as closest
  // TODO: Consider custom ukrainian dictionary in future
};

// Query validation constants
const MAX_QUERY_LENGTH = 1000;
const MIN_QUERY_LENGTH = 3;

/**
 * Build sanitized ts_query string for PostgreSQL FTS
 * Uses simple prefix matching for better compatibility
 *
 * @param {string} query - User search input
 * @param {string} language - Language code (ru, en, uk)
 * @returns {string} Sanitized ts_query string
 * @throws {Error} If query is invalid
 *
 * @example
 * buildTsQuery('hello world', 'en') // => 'hello:* & world:*'
 * buildTsQuery('test!', 'ru') // => 'test:*'
 */
export function buildTsQuery(query, language = 'ru') {
  // Validate input type
  if (!query || typeof query !== 'string') {
    throw new Error('Invalid search query: must be a non-empty string');
  }

  // Validate length
  if (query.length > MAX_QUERY_LENGTH) {
    throw new Error(`Query too long: maximum ${MAX_QUERY_LENGTH} characters`);
  }

  const trimmed = query.trim();

  if (trimmed.length < MIN_QUERY_LENGTH) {
    throw new Error(`Query too short: minimum ${MIN_QUERY_LENGTH} characters`);
  }

  // Simple approach: remove special chars and add prefix to whole query
  // This is more compatible than splitting into words for short queries
  const sanitized = trimmed
    .replace(/[&|!():<>]/g, ' ')  // Remove FTS operators
    .replace(/\s+/g, ' ')          // Normalize whitespace
    .trim();

  if (!sanitized) {
    throw new Error('Empty search query after sanitization');
  }

  // Split query into words to handle multi-word queries properly
  const words = sanitized.split(' ').filter(word => word.length > 0);

  // For single word queries, use simple prefix matching
  // For multi-word queries, combine with AND
  if (words.length === 1) {
    // Single word: 'тест:*'
    return `${words[0]}:*`;
  } else {
    // Multiple words: 'hello:* & world:*'
    return words
      .map(word => `${word}:*`)
      .join(' & ');
  }
}

/**
 * Search notes using PostgreSQL Full-Text Search
 * Uses RPC function for complex FTS queries with ranking and highlighting
 * 
 * @param {string} query - Search query
 * @param {string} userId - User ID for RLS
 * @param {Object} options - Search options
 * @param {string} options.language - Language code (ru, en, uk) - default 'ru'
 * @param {number} options.minRank - Minimum ts_rank threshold - default 0.1
 * @param {number} options.limit - Results limit - default 20
 * @param {number} options.offset - Pagination offset - default 0
 * @returns {Promise<{results: Array, total: number, executionTime: number}>}
 * @throws {Error} If FTS query fails
 */
export async function searchNotesFTS(query, userId, options = {}) {
  const startTime = Date.now();
  
  const {
    language = 'ru',
    minRank = 0.1,
    limit = 20,
    offset = 0
  } = options;
  
  // Map language code to PostgreSQL FTS config
  const ftsLanguage = FTS_LANGUAGES[language] || 'russian';
  
  // Build sanitized ts_query
  const tsQuery = buildTsQuery(query, language);
  
  // Get Supabase client
  const supabase = createClient();
  
  // Execute FTS RPC function
  const { data, error, count } = await supabase
    .rpc('search_notes_fts', {
      search_query: tsQuery,
      search_language: ftsLanguage,
      min_rank: minRank,
      result_limit: limit,
      result_offset: offset,
      search_user_id: userId
    });
  
  if (error) {
    throw new Error(`FTS search failed: ${error.message}`);
  }
  
  const executionTime = Date.now() - startTime;
  
  return {
    results: data || [],
    total: count || data?.length || 0,
    executionTime
  };
}

/**
 * Fallback search using ILIKE
 * Used when FTS fails or for edge cases
 * 
 * @param {string} query - Search query
 * @param {string} userId - User ID for RLS
 * @param {Object} options - Search options
 * @param {number} options.limit - Results limit - default 20
 * @param {number} options.offset - Pagination offset - default 0
 * @returns {Promise<{results: Array, total: number, executionTime: number}>}
 * @throws {Error} If ILIKE query fails
 */
export async function searchNotesILIKE(query, userId, options = {}) {
  const startTime = Date.now();
  
  const { limit = 20, offset = 0 } = options;
  
  // Simple ILIKE pattern
  const pattern = `%${query}%`;
  
  // Get Supabase client
  const supabase = createClient();
  
  // Execute ILIKE query
  const { data, error, count } = await supabase
    .from('notes')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .or(`title.ilike.${pattern},content.ilike.${pattern}`)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) {
    throw new Error(`ILIKE search failed: ${error.message}`);
  }
  
  const executionTime = Date.now() - startTime;
  
  // Add empty headline field for consistency with FTS results
  const resultsWithHeadline = (data || []).map(note => ({
    ...note,
    rank: 0, // No ranking for ILIKE
    headline: note.content ? note.content.substring(0, 200) : ''
  }));
  
  return {
    results: resultsWithHeadline,
    total: count || 0,
    executionTime
  };
}

/**
 * Detect language from query text
 * Simple heuristic based on character sets
 * 
 * @param {string} query - Search query
 * @returns {string} Language code (ru, en, uk)
 */
export function detectLanguage(query) {
  if (!query) return 'ru';
  
  // Check for Cyrillic characters
  const hasCyrillic = /[\u0400-\u04FF]/.test(query);
  
  if (hasCyrillic) {
    // Could be Russian or Ukrainian
    // For now, default to Russian (both use same FTS config anyway)
    return 'ru';
  }
  
  // Default to English for Latin characters
  return 'en';
}

