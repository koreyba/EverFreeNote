-- Match the local project's table access while leaving notes RLS policies enabled.
-- This migration is used only in the disposable component-test database.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notes TO authenticated, service_role;
