-- Remove the vestigial match_user_id parameter from match_notes.
-- The function already enforces auth.uid() in the WHERE clause, making the
-- parameter redundant and misleading: passing any value other than auth.uid()
-- would always return empty results due to the primary user_id filter.
SET search_path TO public, extensions;

DROP FUNCTION IF EXISTS public.match_notes(vector, uuid, int);

CREATE OR REPLACE FUNCTION public.match_notes(
  query_embedding vector(1536),
  match_count     int DEFAULT 5
)
RETURNS TABLE (
  note_id      uuid,
  chunk_index  int,
  char_offset  int,
  content      text,
  similarity   float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    note_id,
    chunk_index,
    char_offset,
    content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.note_embeddings
  WHERE user_id = auth.uid()
  ORDER BY embedding <=> query_embedding
  LIMIT GREATEST(1, LEAST(match_count, 100));
$$;
