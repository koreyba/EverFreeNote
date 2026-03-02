-- RPC function for cosine similarity search over note embeddings
-- Called by the RAG query script to find notes relevant to a user's question
CREATE OR REPLACE FUNCTION public.match_notes(
  query_embedding vector(3072),
  match_user_id   uuid,
  match_count     int DEFAULT 5  -- matches RAG_CONFIG.matchCount in config.ts
)
RETURNS TABLE (
  note_id    uuid,
  content    text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    note_id,
    content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.note_embeddings
  WHERE user_id = match_user_id
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
