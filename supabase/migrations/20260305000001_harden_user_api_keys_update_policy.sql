-- Harden UPDATE policy for user_api_keys to prevent ownership changes.
-- This is a follow-up migration; previously applied migrations are left intact.
SET search_path TO public;

DROP POLICY IF EXISTS "Users can update own api keys" ON public.user_api_keys;

CREATE POLICY "Users can update own api keys"
  ON public.user_api_keys FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

