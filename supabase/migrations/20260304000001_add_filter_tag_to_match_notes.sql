-- Add filter_tag parameter to match_notes for server-side tag filtering.
-- Consistent with search_notes_fts approach: (filter_tag IS NULL OR filter_tag = ANY(n.tags))
-- Requires JOIN with notes table to access tags column.

SET search_path TO public, extensions;

-- DROP required because signature changes (adding filter_tag parameter)
DROP FUNCTION IF EXISTS public.match_notes(vector, int);

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
  LIMIT GREATEST(1, LEAST(match_count, 100));
$$;

-- Rollback: restore previous signature without filter_tag
-- DROP FUNCTION IF EXISTS public.match_notes(vector, int, text);
-- CREATE OR REPLACE FUNCTION public.match_notes(query_embedding vector(1536), match_count int DEFAULT 5) ...
