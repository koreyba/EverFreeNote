-- Updated match_notes RPC for chunked embeddings
-- Returns individual chunks ranked by cosine similarity.
-- Aggregation (deduplication to note level) is handled in application layer.

-- DROP required because return type changed (added chunk_index, char_offset)
DROP FUNCTION IF EXISTS public.match_notes(vector, uuid, int);

CREATE OR REPLACE FUNCTION public.match_notes(
  query_embedding vector(1536),
  match_user_id   uuid,
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
  WHERE user_id = match_user_id
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
