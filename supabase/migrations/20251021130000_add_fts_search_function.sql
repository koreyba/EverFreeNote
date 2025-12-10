-- Migration: Add Full-Text Search RPC function
-- Description: Create search_notes_fts() function for FTS with ranking and highlighting
-- Date: 2025-10-21

-- Drop function if exists (for idempotency)
DROP FUNCTION IF EXISTS search_notes_fts(text, regconfig, float, int, int, uuid);

-- Create RPC function for FTS search with highlighting
CREATE OR REPLACE FUNCTION search_notes_fts(
  search_query text,
  search_language regconfig DEFAULT 'russian'::regconfig,
  min_rank float DEFAULT 0.1,
  result_limit int DEFAULT 20,
  result_offset int DEFAULT 0,
  search_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  tags text[],
  rank real,
  headline text,
  created_at timestamptz,
  updated_at timestamptz,
  total_count int
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate inputs
  IF search_query IS NULL OR search_query = '' THEN
    RAISE EXCEPTION 'search_query cannot be empty';
  END IF;
  
  IF search_user_id IS NULL THEN
    RAISE EXCEPTION 'search_user_id cannot be NULL';
  END IF;
  
  -- Return FTS results with ranking and highlighting
  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.description as content,
    n.tags,
    -- Calculate relevance rank
    ts_rank(
      to_tsvector(search_language,
        coalesce(n.title, '') || ' ' ||
        coalesce(n.description, '') || ' ' ||
        coalesce(array_to_string(n.tags, ' '), '')
      ),
      to_tsquery(search_language, search_query)
    )::real as rank,
    -- Generate highlighted headline
    CASE
      WHEN n.description IS NOT NULL AND n.description != '' THEN
        ts_headline(
          search_language,
          n.description,
          to_tsquery(search_language, search_query),
          'MaxWords=50, MinWords=25, MaxFragments=3, StartSel=<mark>, StopSel=</mark>'
        )
      ELSE
        -- Fallback: return first 200 chars of description if no headline
        substring(coalesce(n.description, ''), 1, 200)
    END as headline,
    n.created_at,
    n.updated_at,
    COUNT(*) OVER() AS total_count
  FROM notes n
  WHERE
    -- Security: only return notes for the specified user
    n.user_id = search_user_id
    -- FTS match condition
    AND to_tsvector(search_language,
          coalesce(n.title, '') || ' ' ||
          coalesce(n.description, '') || ' ' ||
          coalesce(array_to_string(n.tags, ' '), '')
        ) @@ to_tsquery(search_language, search_query)
    -- Filter by minimum rank threshold
    AND ts_rank(
          to_tsvector(search_language,
            coalesce(n.title, '') || ' ' ||
            coalesce(n.description, '') || ' ' ||
            coalesce(array_to_string(n.tags, ' '), '')
          ),
          to_tsquery(search_language, search_query)
        ) >= min_rank
  -- Order by relevance (highest rank first)
  ORDER BY rank DESC
  -- Pagination
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_notes_fts(text, regconfig, float, int, int, uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION search_notes_fts IS
'Full-Text Search function for notes with ranking and highlighting.
Uses PostgreSQL FTS (to_tsvector, to_tsquery, ts_rank, ts_headline).
Supports multiple languages (russian, english) and returns highlighted fragments.
Security: SECURITY DEFINER but checks user_id to enforce RLS.';

-- Migration is safely rollbackable: DROP FUNCTION IF EXISTS search_notes_fts(text, regconfig, float, int, int, uuid);

