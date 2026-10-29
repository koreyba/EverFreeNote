-- Remove broad default grants, then grant only the operations used by this fixture.
-- This migration is used only in the disposable component-test database; notes RLS remains enabled.
REVOKE ALL PRIVILEGES ON TABLE public.notes FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notes TO authenticated, service_role;
