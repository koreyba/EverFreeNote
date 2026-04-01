CREATE OR REPLACE FUNCTION public.get_ai_index_notes(
  filter_status text DEFAULT 'all',
  page_number integer DEFAULT 0,
  page_size integer DEFAULT 50
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
  filtered AS (
    SELECT *
    FROM note_states
    WHERE filter_status = 'all' OR note_states.status = filter_status
  ),
  counted AS (
    SELECT
      filtered.id,
      filtered.title,
      filtered.updated_at,
      filtered.last_indexed_at,
      filtered.status,
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
  ORDER BY counted.updated_at DESC
  OFFSET page_number * page_size
  LIMIT page_size;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_index_notes(text, integer, integer) TO authenticated;
