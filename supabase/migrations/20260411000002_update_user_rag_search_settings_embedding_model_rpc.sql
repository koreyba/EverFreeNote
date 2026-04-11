CREATE OR REPLACE FUNCTION public.upsert_user_rag_search_settings_partial(
  p_user_id uuid,
  p_top_k integer DEFAULT NULL,
  p_similarity_threshold numeric DEFAULT NULL,
  p_embedding_model text DEFAULT NULL
)
RETURNS public.user_rag_search_settings
LANGUAGE plpgsql
AS $$
DECLARE
  result public.user_rag_search_settings;
BEGIN
  INSERT INTO public.user_rag_search_settings (
    user_id,
    top_k,
    similarity_threshold,
    embedding_model,
    updated_at
  )
  VALUES (
    p_user_id,
    COALESCE(p_top_k, 15),
    COALESCE(p_similarity_threshold, 0.55),
    COALESCE(p_embedding_model, 'models/gemini-embedding-001'),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    top_k = COALESCE(p_top_k, public.user_rag_search_settings.top_k),
    similarity_threshold = COALESCE(
      p_similarity_threshold,
      public.user_rag_search_settings.similarity_threshold
    ),
    embedding_model = COALESCE(
      p_embedding_model,
      public.user_rag_search_settings.embedding_model
    ),
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_rag_search_settings_partial(uuid, integer, numeric, text)
  TO authenticated, service_role;
