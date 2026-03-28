CREATE TABLE IF NOT EXISTS public.user_rag_search_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  top_k integer NOT NULL DEFAULT 15,
  similarity_threshold numeric NOT NULL DEFAULT 0.55,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_rag_search_settings_top_k_range CHECK (top_k BETWEEN 1 AND 100),
  CONSTRAINT user_rag_search_settings_similarity_threshold_range CHECK (similarity_threshold >= 0 AND similarity_threshold <= 1)
);

ALTER TABLE public.user_rag_search_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_rag_search_settings' AND policyname = 'Users can view own rag search settings'
  ) THEN
    CREATE POLICY "Users can view own rag search settings"
      ON public.user_rag_search_settings FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_rag_search_settings' AND policyname = 'Users can insert own rag search settings'
  ) THEN
    CREATE POLICY "Users can insert own rag search settings"
      ON public.user_rag_search_settings FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_rag_search_settings' AND policyname = 'Users can update own rag search settings'
  ) THEN
    CREATE POLICY "Users can update own rag search settings"
      ON public.user_rag_search_settings FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_rag_search_settings' AND policyname = 'Users can delete own rag search settings'
  ) THEN
    CREATE POLICY "Users can delete own rag search settings"
      ON public.user_rag_search_settings FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;
