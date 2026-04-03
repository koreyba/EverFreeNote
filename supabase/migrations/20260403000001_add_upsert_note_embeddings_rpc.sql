-- Atomic upsert of note embeddings: deletes all existing chunks for the note
-- and inserts new ones in a single transaction. indexed_at uses the database
-- clock (now()) so it stays consistent with notes.updated_at.
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
BEGIN
  DELETE FROM public.note_embeddings
  WHERE note_id = p_note_id AND user_id = p_user_id;

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
  FROM jsonb_array_elements(p_rows) AS row_value;
END;
$$;
