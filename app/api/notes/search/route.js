/**
 * Search API endpoint for notes
 * Implements FTS with fallback to ILIKE
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { searchNotesFTS, searchNotesILIKE } from '@/lib/supabase/search';

/**
 * GET /api/notes/search
 * 
 * Query parameters:
 * - q: search query (required, min 3 chars, max 1000 chars)
 * - lang: language code (optional, default: 'ru', values: 'ru'|'en'|'uk')
 * - minRank: minimum relevance rank (optional, default: 0.1)
 * - limit: results limit (optional, default: 20, max: 100)
 * - offset: pagination offset (optional, default: 0)
 * 
 * Response:
 * {
 *   results: Array<Note>,
 *   total: number,
 *   query: string,
 *   method: 'fts' | 'ilike',
 *   executionTime: number (ms)
 * }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const language = searchParams.get('lang') || 'ru';
    const minRank = parseFloat(searchParams.get('minRank')) || 0.1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
    const offset = parseInt(searchParams.get('offset')) || 0;
    
    // Validate query parameter
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { 
          results: [], 
          total: 0,
          query: '',
          method: 'none',
          executionTime: 0
        },
        { status: 200 }
      );
    }
    
    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    let results, total, executionTime, method;
    
    try {
      // Try FTS first
      const ftsResult = await searchNotesFTS(query, user.id, {
        language,
        minRank,
        limit,
        offset
      });
      
      results = ftsResult.results;
      total = ftsResult.total;
      executionTime = ftsResult.executionTime;
      method = 'fts';
      
      // Log slow queries
      if (executionTime > 200) {
        console.warn('Slow FTS query detected', {
          query,
          userId: user.id,
          executionTime,
          resultsCount: results.length
        });
      }
      
    } catch (ftsError) {
      // Fallback to ILIKE on FTS error
      console.warn('FTS search failed, falling back to ILIKE:', {
        error: ftsError.message,
        query,
        userId: user.id
      });
      
      try {
        const ilikeResult = await searchNotesILIKE(query, user.id, {
          limit,
          offset
        });
        
        results = ilikeResult.results;
        total = ilikeResult.total;
        executionTime = ilikeResult.executionTime;
        method = 'ilike';
        
      } catch (ilikeError) {
        // Both FTS and ILIKE failed
        console.error('Both FTS and ILIKE search failed:', {
          ftsError: ftsError.message,
          ilikeError: ilikeError.message,
          query,
          userId: user.id
        });
        
        return NextResponse.json(
          { error: 'Search failed' },
          { status: 500 }
        );
      }
    }
    
    // Return unified response
    return NextResponse.json({
      results,
      total,
      query,
      method,
      executionTime
    });
    
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

