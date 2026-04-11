-- Atomic upsert of note embeddings in a single transaction. Existing chunks are
-- inserted/updated via ON CONFLICT and stale tail chunks are deleted afterward.
-- indexed_at uses the database clock (now()) so it stays consistent with
-- notes.updated_at.
CREATE OR REPLACE FUNCTION public.upsert_note_embeddings(
  p_note_id uuid,
  p_user_id uuid,
  p_rows jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb := COALESCE(p_rows, '[]'::jsonb);
  v_chunk_count integer := jsonb_array_length(v_rows);
  v_max_index integer;
BEGIN
  IF p_rows IS NULL OR v_chunk_count = 0 THEN
    DELETE FROM public.note_embeddings
    WHERE note_id = p_note_id;
    RETURN;
  END IF;

  SELECT MAX((row_value->>'chunk_index')::integer)
  INTO v_max_index
  FROM jsonb_array_elements(v_rows) AS row_value;

  INSERT INTO public.note_embeddings (
    note_id, user_id, chunk_index, char_offset,
    content, body_content, overlap_prefix, embedding
  )
  SELECT
    p_note_id,
    p_user_id,
    (row_value->>'chunk_index')::int,
    (row_value->>'char_offset')::int,
    row_value->>'content',
    row_value->>'body_content',
    row_value->>'overlap_prefix',
    (row_value->>'embedding')::vector(1536)
  FROM jsonb_array_elements(v_rows) AS row_value
  ON CONFLICT (note_id, chunk_index) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    char_offset = EXCLUDED.char_offset,
    content = EXCLUDED.content,
    body_content = EXCLUDED.body_content,
    overlap_prefix = EXCLUDED.overlap_prefix,
    embedding = EXCLUDED.embedding,
    indexed_at = now();

  DELETE FROM public.note_embeddings
  WHERE note_id = p_note_id
    AND chunk_index > v_max_index;
END;
$$;
