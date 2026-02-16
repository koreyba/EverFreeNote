-- WordPress integration settings and export preferences
CREATE TABLE IF NOT EXISTS public.wordpress_integrations (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    site_url TEXT NOT NULL,
    wp_username TEXT NOT NULL,
    wp_app_password_encrypted TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wordpress_export_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    remembered_category_ids INTEGER[] NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wordpress_integrations_enabled_idx
    ON public.wordpress_integrations(enabled);

DROP TRIGGER IF EXISTS update_wordpress_integrations_updated_at ON public.wordpress_integrations;
CREATE TRIGGER update_wordpress_integrations_updated_at
    BEFORE UPDATE ON public.wordpress_integrations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_wordpress_export_preferences_updated_at ON public.wordpress_export_preferences;
CREATE TRIGGER update_wordpress_export_preferences_updated_at
    BEFORE UPDATE ON public.wordpress_export_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.wordpress_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wordpress_export_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wordpress_integrations'
      AND policyname = 'Users can view own wordpress integrations'
  ) THEN
    CREATE POLICY "Users can view own wordpress integrations"
      ON public.wordpress_integrations
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wordpress_integrations'
      AND policyname = 'Users can insert own wordpress integrations'
  ) THEN
    CREATE POLICY "Users can insert own wordpress integrations"
      ON public.wordpress_integrations
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wordpress_integrations'
      AND policyname = 'Users can update own wordpress integrations'
  ) THEN
    CREATE POLICY "Users can update own wordpress integrations"
      ON public.wordpress_integrations
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wordpress_integrations'
      AND policyname = 'Users can delete own wordpress integrations'
  ) THEN
    CREATE POLICY "Users can delete own wordpress integrations"
      ON public.wordpress_integrations
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wordpress_export_preferences'
      AND policyname = 'Users can view own wordpress export preferences'
  ) THEN
    CREATE POLICY "Users can view own wordpress export preferences"
      ON public.wordpress_export_preferences
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wordpress_export_preferences'
      AND policyname = 'Users can insert own wordpress export preferences'
  ) THEN
    CREATE POLICY "Users can insert own wordpress export preferences"
      ON public.wordpress_export_preferences
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wordpress_export_preferences'
      AND policyname = 'Users can update own wordpress export preferences'
  ) THEN
    CREATE POLICY "Users can update own wordpress export preferences"
      ON public.wordpress_export_preferences
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wordpress_export_preferences'
      AND policyname = 'Users can delete own wordpress export preferences'
  ) THEN
    CREATE POLICY "Users can delete own wordpress export preferences"
      ON public.wordpress_export_preferences
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wordpress_integrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wordpress_export_preferences TO authenticated;
