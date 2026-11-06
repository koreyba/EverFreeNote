BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

INSERT INTO auth.users (id) VALUES
  ('00000000-0000-4000-8000-000000000101'),
  ('00000000-0000-4000-8000-000000000102');

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '00000000-0000-4000-8000-000000000101';

SELECT plan(21);

INSERT INTO public.notes (id, user_id, title, description, tags) VALUES
  ('00000000-0000-4000-8000-000000000103', auth.uid(), 'Draft', '<p>Original <b>HTML</b></p>', ARRAY['draft']);

SELECT results_eq(
  $$ SELECT version, title, description, tags FROM public.note_versions
     WHERE note_id = '00000000-0000-4000-8000-000000000103' $$,
  $$ VALUES (1, 'Draft'::text, '<p>Original <b>HTML</b></p>'::text, ARRAY['draft']) $$,
  'creation captures the full version 1'
);

UPDATE public.notes SET title = 'Draft', description = '<p>Original <b>HTML</b></p>', tags = ARRAY['draft']
WHERE id = '00000000-0000-4000-8000-000000000103';

SELECT is(
  (SELECT count(*) FROM public.note_versions WHERE note_id = '00000000-0000-4000-8000-000000000103'),
  1::bigint,
  'an unchanged autosave leaves one version'
);

UPDATE public.notes SET title = 'Published', description = '<p>New HTML</p>', tags = ARRAY['ready']
WHERE id = '00000000-0000-4000-8000-000000000103';

SELECT results_eq(
  $$ SELECT version, title FROM public.note_versions
     WHERE note_id = '00000000-0000-4000-8000-000000000103' ORDER BY version $$,
  $$ VALUES (1, 'Draft'::text), (2, 'Published'::text) $$,
  'an edit appends version 2 and preserves version 1'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.note_versions', 'INSERT, UPDATE, DELETE, TRUNCATE'),
  'authenticated users cannot modify history directly'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.note_versions', 'SELECT')
    AND NOT has_function_privilege('anon', 'public.restore_note_version(uuid,integer,integer)', 'EXECUTE'),
  'anonymous callers cannot read or restore history'
);

SET LOCAL request.jwt.claim.sub = '00000000-0000-4000-8000-000000000102';

SELECT is_empty(
  $$ SELECT version FROM public.note_versions WHERE note_id = '00000000-0000-4000-8000-000000000103' $$,
  'another authenticated user cannot see the history'
);
SELECT throws_ok(
  $$ SELECT public.restore_note_version('00000000-0000-4000-8000-000000000103', 1, 2) $$,
  'PT404', NULL,
  'another authenticated user cannot restore the note'
);

SET LOCAL request.jwt.claim.sub = '00000000-0000-4000-8000-000000000101';

SELECT throws_ok(
  $$ SELECT public.restore_note_version('00000000-0000-4000-8000-000000000103', 1, 1) $$,
  'PT409', NULL,
  'a stale restore cannot overwrite a newer version'
);
SELECT throws_ok(
  $$ SELECT public.restore_note_version('00000000-0000-4000-8000-000000000103', 3, 2) $$,
  'PT404', NULL,
  'restoring a missing version reports not found'
);
SELECT results_eq(
  $$ SELECT title, description, tags
     FROM public.restore_note_version('00000000-0000-4000-8000-000000000103', 1, 2) $$,
  $$ VALUES ('Draft'::text, '<p>Original <b>HTML</b></p>'::text, ARRAY['draft']) $$,
  'restore returns the original title, formatted body, and tags'
);
SELECT results_eq(
  $$ SELECT version, title FROM public.note_versions
     WHERE note_id = '00000000-0000-4000-8000-000000000103' ORDER BY version $$,
  $$ VALUES (1, 'Draft'::text), (2, 'Published'::text), (3, 'Draft'::text) $$,
  'restore appends a new version and keeps the pre-restore state'
);

DELETE FROM public.notes WHERE id = '00000000-0000-4000-8000-000000000103';

SELECT is_empty(
  $$ SELECT version FROM public.note_versions WHERE note_id = '00000000-0000-4000-8000-000000000103' $$,
  'the owner cannot read history while a note is in Trash'
);
SELECT throws_ok(
  $$ SELECT public.restore_note_version('00000000-0000-4000-8000-000000000103', 1, 3) $$,
  'PT404', NULL,
  'the owner cannot restore a version while the note is in Trash'
);
SELECT results_eq(
  $$ SELECT entry->>'id', entry->>'status'
     FROM jsonb_array_elements(public.restore_notes(ARRAY(
       SELECT trash_id FROM public.notes_trash WHERE original_note_id = '00000000-0000-4000-8000-000000000103'
     ))) AS restored(entry) $$,
  $$ VALUES ('00000000-0000-4000-8000-000000000103'::text, 'restored'::text) $$,
  'Trash recovery restores the original note ID'
);

SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;

SELECT results_eq(
  $$ SELECT version, title, description, tags FROM public.note_versions
     WHERE note_id = '00000000-0000-4000-8000-000000000103' ORDER BY version $$,
  $$ VALUES
       (1, 'Draft'::text, '<p>Original <b>HTML</b></p>'::text, ARRAY['draft']),
       (2, 'Published'::text, '<p>New HTML</p>'::text, ARRAY['ready']),
       (3, 'Draft'::text, '<p>Original <b>HTML</b></p>'::text, ARRAY['draft']) $$,
  'Trash recovery keeps every original version without appending a duplicate'
);

RESET ROLE;

-- This legacy path is outside the note's directory, so purge must find it through its reference.
INSERT INTO storage.objects (bucket_id, name)
VALUES ('note-images', '00000000-0000-4000-8000-000000000101/history-only.png');

SET LOCAL ROLE authenticated;

INSERT INTO public.notes (id, user_id, title, description)
VALUES (
  '00000000-0000-4000-8000-000000000104', auth.uid(), 'Image note',
  '<img src="https://example.supabase.co/storage/v1/object/public/note-images/00000000-0000-4000-8000-000000000101/history-only.png">'
);
UPDATE public.notes SET description = '<p>Current body without the image</p>'
WHERE id = '00000000-0000-4000-8000-000000000104';

RESET ROLE;

SELECT is(
  (SELECT count(*) FROM public.note_image_refs
   WHERE note_id = '00000000-0000-4000-8000-000000000104'
     AND object_path = '00000000-0000-4000-8000-000000000101/history-only.png'),
  1::bigint,
  'editing keeps the reference to an image used only by a previous version'
);

SET LOCAL ROLE authenticated;

DELETE FROM public.notes WHERE id = '00000000-0000-4000-8000-000000000104';

RESET ROLE;

SELECT is(
  (SELECT count(*) FROM public.note_image_refs
   WHERE note_id = '00000000-0000-4000-8000-000000000104'
     AND object_path = '00000000-0000-4000-8000-000000000101/history-only.png'),
  1::bigint,
  'moving a note to Trash keeps the image reference from its history'
);

SET LOCAL ROLE authenticated;

DO $$
BEGIN
  PERFORM public.restore_notes(ARRAY(
    SELECT trash_id FROM public.notes_trash WHERE original_note_id = '00000000-0000-4000-8000-000000000104'
  ));
END;
$$;

RESET ROLE;
SET CONSTRAINTS ALL IMMEDIATE;
SET CONSTRAINTS ALL DEFERRED;

SELECT ok(
  EXISTS (SELECT 1 FROM public.notes WHERE id = '00000000-0000-4000-8000-000000000104'
    AND description = '<p>Current body without the image</p>')
  AND EXISTS (SELECT 1 FROM public.note_image_refs WHERE note_id = '00000000-0000-4000-8000-000000000104'
    AND object_path = '00000000-0000-4000-8000-000000000101/history-only.png')
  AND NOT EXISTS (SELECT 1 FROM note_trash_private.trash_media_cleanup
    WHERE object_path = '00000000-0000-4000-8000-000000000101/history-only.png'),
  'Trash recovery keeps the previous-version image available and leaves it out of the cleanup queue'
);

SET LOCAL ROLE authenticated;

DELETE FROM public.notes WHERE id = '00000000-0000-4000-8000-000000000104';
SELECT results_eq(
  $$ SELECT entry->>'status'
     FROM jsonb_array_elements(public.purge_notes(ARRAY(
       SELECT trash_id FROM public.notes_trash WHERE original_note_id = '00000000-0000-4000-8000-000000000104'
     ))) AS purged(entry) $$,
  $$ VALUES ('purged'::text) $$,
  'the owner can permanently purge a note with previous versions'
);

RESET ROLE;
SET CONSTRAINTS ALL IMMEDIATE;

SELECT is_empty(
  $$ SELECT version FROM public.note_versions WHERE note_id = '00000000-0000-4000-8000-000000000104' $$,
  'permanent purge removes the note history'
);
SELECT results_eq(
  $$ SELECT user_id, state FROM note_trash_private.trash_media_cleanup
     WHERE object_path = '00000000-0000-4000-8000-000000000101/history-only.png' $$,
  $$ VALUES ('00000000-0000-4000-8000-000000000101'::uuid, 'pending'::text) $$,
  'permanent purge queues the owned image used only by a previous version'
);

SELECT * FROM finish();
ROLLBACK;
