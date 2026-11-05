-- Reuse the Notes cards without transferring full bodies or copying the table.
CREATE VIEW public.notes_trash_list
WITH (security_invoker = true)
AS
SELECT trash_id, original_note_id, user_id, title, tags, created_at, updated_at,
       deleted_at, body_bytes, coalesce(substring(description FOR 2048), '') AS preview_html
FROM public.notes_trash;

REVOKE ALL ON public.notes_trash_list FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notes_trash_list TO authenticated;
