-- Harden match_notes: guard against NULL match_count to avoid LIMIT NULL (unbounded results).
-- Forward-only fix in a new migration so historical migrations remain unchanged.

CREATE OR REPLACE FUNCTION public.match_notes(
  query_embedding vector(1536),
  match_count     int  DEFAULT 5,
  filter_tag      text DEFAULT NULL
)
RETURNS TABLE (
  note_id      uuid,
  chunk_index  int,
  char_offset  int,
  content      text,
  similarity   float
)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT
    ne.note_id,
    ne.chunk_index,
    ne.char_offset,
    ne.content,
    1 - (ne.embedding <=> query_embedding) AS similarity
  FROM public.note_embeddings ne
  JOIN public.notes n ON ne.note_id = n.id
  WHERE ne.user_id = auth.uid()
    AND (filter_tag IS NULL OR filter_tag = ANY(n.tags))
  ORDER BY ne.embedding <=> query_embedding
  LIMIT GREATEST(1, LEAST(COALESCE(match_count, 5), 100));
$$;
