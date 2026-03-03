-- Updated match_notes RPC for chunked embeddings
-- Returns individual chunks ranked by cosine similarity.
-- Aggregation (deduplication to note level) is handled in application layer.
SET search_path TO public, extensions;

-- DROP required because return type changed (added chunk_index, char_offset)
DROP FUNCTION IF EXISTS public.match_notes(vector, uuid, int);

CREATE OR REPLACE FUNCTION public.match_notes(
  query_embedding vector(1536),
  match_user_id   uuid DEFAULT NULL,
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
    AND (match_user_id IS NULL OR match_user_id = auth.uid())
  ORDER BY embedding <=> query_embedding
  LIMIT GREATEST(1, LEAST(match_count, 100));
$$;
