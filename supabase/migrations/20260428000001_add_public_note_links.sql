-- Public note links: one read-only share token per active note link.
CREATE TABLE IF NOT EXISTS public.note_share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
    permission TEXT NOT NULL DEFAULT 'view',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT note_share_links_permission_check CHECK (permission = 'view')
);

CREATE UNIQUE INDEX IF NOT EXISTS note_share_links_active_view_note_idx
    ON public.note_share_links(note_id)
    WHERE permission = 'view' AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS note_share_links_owner_note_idx
    ON public.note_share_links(user_id, note_id);

DROP TRIGGER IF EXISTS update_note_share_links_updated_at ON public.note_share_links;
CREATE TRIGGER update_note_share_links_updated_at
    BEFORE UPDATE ON public.note_share_links
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.note_share_links ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  target_schema CONSTANT TEXT := 'public';
  target_table CONSTANT TEXT := 'note_share_links';
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = target_schema
      AND tablename = target_table
      AND policyname = 'Users can view own note share links'
  ) THEN
    CREATE POLICY "Users can view own note share links"
      ON public.note_share_links
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = target_schema
      AND tablename = target_table
      AND policyname = 'Users can insert own note share links'
  ) THEN
    CREATE POLICY "Users can insert own note share links"
      ON public.note_share_links
      FOR INSERT
      WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1
          FROM public.notes n
          WHERE n.id = note_id
            AND n.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = target_schema
      AND tablename = target_table
      AND policyname = 'Users can update own note share links'
  ) THEN
    CREATE POLICY "Users can update own note share links"
      ON public.note_share_links
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1
          FROM public.notes n
          WHERE n.id = note_id
            AND n.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = target_schema
      AND tablename = target_table
      AND policyname = 'Users can delete own note share links'
  ) THEN
    CREATE POLICY "Users can delete own note share links"
      ON public.note_share_links
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_note_by_token(share_token TEXT)
RETURNS TABLE (
  token TEXT,
  title TEXT,
  description TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    nsl.token,
    n.title,
    n.description,
    COALESCE(n.tags, '{}'::TEXT[]) AS tags,
    n.created_at,
    n.updated_at
  FROM public.note_share_links nsl
  INNER JOIN public.notes n
    ON n.id = nsl.note_id
  WHERE nsl.token = share_token
    AND nsl.permission = 'view'
    AND nsl.is_active = TRUE
  LIMIT 1;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_share_links TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_note_by_token(TEXT) TO anon, authenticated;
