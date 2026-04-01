DROP FUNCTION IF EXISTS public.get_ai_index_notes(text, integer, integer);
DROP FUNCTION IF EXISTS public.get_ai_index_notes(text, integer, integer, text, text, text);

CREATE OR REPLACE FUNCTION public.get_ai_index_notes(
  filter_status text DEFAULT 'all',
  page_number integer DEFAULT 0,
  page_size integer DEFAULT 50,
  search_query text DEFAULT NULL,
  search_ts_query text DEFAULT NULL,
  search_language text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  updated_at timestamptz,
  last_indexed_at timestamptz,
  status text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  default_search_language_text constant text := 'english';
  normalized_search_query text := NULLIF(BTRIM(search_query), '');
  normalized_search_ts_query text := NULLIF(BTRIM(search_ts_query), '');
  normalized_search_language_text text := NULLIF(BTRIM(search_language), '');
  normalized_search_language regconfig := default_search_language_text::regconfig;
  parsed_search_ts_query tsquery := NULL;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF filter_status NOT IN ('all', 'indexed', 'not_indexed', 'outdated') THEN
    RAISE EXCEPTION 'Invalid filter_status';
  END IF;

  IF page_number < 0 THEN
    RAISE EXCEPTION 'page_number must be >= 0';
  END IF;

  IF page_size < 1 OR page_size > 100 THEN
    RAISE EXCEPTION 'page_size must be between 1 and 100';
  END IF;

  IF normalized_search_language_text IS NOT NULL AND normalized_search_language_text NOT IN ('english', 'russian') THEN
    RAISE EXCEPTION 'Invalid search_language';
  END IF;

  normalized_search_language := COALESCE(normalized_search_language_text, default_search_language_text)::regconfig;

  IF normalized_search_ts_query IS NOT NULL THEN
    BEGIN
      parsed_search_ts_query := to_tsquery(normalized_search_language, normalized_search_ts_query);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid search_ts_query syntax';
    END;
  END IF;

  RETURN QUERY
  WITH latest_embedding AS (
    SELECT
      ne.note_id,
      MAX(ne.indexed_at) AS last_indexed_at
    FROM public.note_embeddings ne
    WHERE ne.user_id = auth.uid()
    GROUP BY ne.note_id
  ),
  note_states AS (
    SELECT
      n.id,
      n.title,
      n.updated_at,
      n.description,
      n.tags,
      le.last_indexed_at,
      CASE
        WHEN le.last_indexed_at IS NULL THEN 'not_indexed'
        WHEN le.last_indexed_at < n.updated_at THEN 'outdated'
        ELSE 'indexed'
      END AS status
    FROM public.notes n
    LEFT JOIN latest_embedding le
      ON le.note_id = n.id
    WHERE n.user_id = auth.uid()
  ),
  fts_matches AS (
    SELECT
      ns.id,
      ts_rank(
        to_tsvector(
          normalized_search_language,
          COALESCE(ns.title, '') || ' ' ||
          COALESCE(ns.description, '') || ' ' ||
          COALESCE(array_to_string(ns.tags, ' '), '')
        ),
        parsed_search_ts_query
      )::real AS search_rank
    FROM note_states ns
    WHERE normalized_search_ts_query IS NOT NULL
      AND (filter_status = 'all' OR ns.status = filter_status)
      AND to_tsvector(
            normalized_search_language,
            COALESCE(ns.title, '') || ' ' ||
            COALESCE(ns.description, '') || ' ' ||
            COALESCE(array_to_string(ns.tags, ' '), '')
          ) @@ parsed_search_ts_query
      AND ts_rank(
            to_tsvector(
              normalized_search_language,
              COALESCE(ns.title, '') || ' ' ||
              COALESCE(ns.description, '') || ' ' ||
              COALESCE(array_to_string(ns.tags, ' '), '')
            ),
            parsed_search_ts_query
          ) >= 0.01
  ),
  has_fts_matches AS (
    SELECT EXISTS(SELECT 1 FROM fts_matches) AS has_results
  ),
  fallback_matches AS (
    SELECT
      ns.id,
      0::real AS search_rank
    FROM note_states ns
    CROSS JOIN has_fts_matches h
    WHERE normalized_search_query IS NOT NULL
      AND NOT h.has_results
      AND (
        COALESCE(ns.title, '') ILIKE '%' || normalized_search_query || '%'
        OR COALESCE(ns.description, '') ILIKE '%' || normalized_search_query || '%'
        OR COALESCE(array_to_string(ns.tags, ' '), '') ILIKE '%' || normalized_search_query || '%'
      )
  ),
  search_matches AS (
    SELECT
      fm.id,
      fm.search_rank,
      0 AS search_mode
    FROM fts_matches fm
    UNION ALL
    SELECT
      fb.id,
      fb.search_rank,
      1 AS search_mode
    FROM fallback_matches fb
  ),
  filtered AS (
    SELECT
      ns.id,
      ns.title,
      ns.updated_at,
      ns.last_indexed_at,
      ns.status,
      sm.search_rank,
      sm.search_mode
    FROM note_states ns
    LEFT JOIN search_matches sm
      ON sm.id = ns.id
    WHERE (filter_status = 'all' OR ns.status = filter_status)
      AND (normalized_search_query IS NULL OR sm.id IS NOT NULL)
  ),
  counted AS (
    SELECT
      filtered.id,
      filtered.title,
      filtered.updated_at,
      filtered.last_indexed_at,
      filtered.status,
      filtered.search_rank,
      filtered.search_mode,
      COUNT(*) OVER () AS total_count
    FROM filtered
  )
  SELECT
    counted.id,
    counted.title,
    counted.updated_at,
    counted.last_indexed_at,
    counted.status,
    counted.total_count
  FROM counted
  ORDER BY
    counted.search_mode ASC NULLS LAST,
    counted.search_rank DESC NULLS LAST,
    counted.updated_at DESC
  OFFSET page_number * page_size
  LIMIT page_size;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_index_notes(text, integer, integer, text, text, text) TO authenticated;
