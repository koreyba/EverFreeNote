-- Add filter_tag parameter to search_notes_fts for server-side tag filtering
-- This fixes infinite loop bug when client-side filtering results in empty pages

DROP FUNCTION IF EXISTS search_notes_fts(text, regconfig, float, int, int, uuid);
DROP FUNCTION IF EXISTS search_notes_fts(text, regconfig, float, int, int, uuid, text);

CREATE OR REPLACE FUNCTION search_notes_fts(
  search_query text,
  search_language regconfig DEFAULT 'russian'::regconfig,
  min_rank float DEFAULT 0.1,
  result_limit int DEFAULT 20,
  result_offset int DEFAULT 0,
  search_user_id uuid DEFAULT NULL,
  filter_tag text DEFAULT NULL
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
  IF search_query IS NULL OR search_query = '' THEN
    RAISE EXCEPTION 'search_query cannot be empty';
  END IF;

  IF search_user_id IS NULL THEN
    RAISE EXCEPTION 'search_user_id cannot be NULL';
  END IF;

  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.description as content,
    n.tags,
    ts_rank(
      to_tsvector(search_language,
        coalesce(n.title, '') || ' ' ||
        coalesce(n.description, '') || ' ' ||
        coalesce(array_to_string(n.tags, ' '), '')
      ),
      to_tsquery(search_language, search_query)
    )::real as rank,
    CASE
      WHEN n.description IS NOT NULL AND n.description != '' THEN
        ts_headline(
          search_language,
          n.description,
          to_tsquery(search_language, search_query),
          'MaxWords=50, MinWords=25, MaxFragments=3, StartSel=<mark>, StopSel=</mark>'
        )
      ELSE
        substring(coalesce(n.description, ''), 1, 200)
    END as headline,
    n.created_at,
    n.updated_at,
    COUNT(*) OVER()::int AS total_count
  FROM notes n
  WHERE
    n.user_id = search_user_id
    AND to_tsvector(search_language,
          coalesce(n.title, '') || ' ' ||
          coalesce(n.description, '') || ' ' ||
          coalesce(array_to_string(n.tags, ' '), '')
        ) @@ to_tsquery(search_language, search_query)
    AND ts_rank(
          to_tsvector(search_language,
            coalesce(n.title, '') || ' ' ||
            coalesce(n.description, '') || ' ' ||
            coalesce(array_to_string(n.tags, ' '), '')
          ),
          to_tsquery(search_language, search_query)
        ) >= min_rank
    AND (filter_tag IS NULL OR filter_tag = ANY(n.tags))
  ORDER BY rank DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- Grant both old (6 params) and new (7 params) signatures
GRANT EXECUTE ON FUNCTION search_notes_fts(text, regconfig, float, int, int, uuid, text) TO authenticated;

COMMENT ON FUNCTION search_notes_fts IS
  'Full-text search for notes with tag filtering. Supports Russian, English, Ukrainian.
   filter_tag param added to fix infinite loop when filtering search results by tag.';

-- Rollback: DROP FUNCTION IF EXISTS search_notes_fts(text, regconfig, float, int, int, uuid, text);
