BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

INSERT INTO auth.users (id) VALUES
  ('00000000-0000-4000-8000-000000000101'),
  ('00000000-0000-4000-8000-000000000102');

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '00000000-0000-4000-8000-000000000101';

SELECT plan(12);

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
RESET ROLE;

SELECT is_empty(
  $$ SELECT version FROM public.note_versions WHERE note_id = '00000000-0000-4000-8000-000000000103' $$,
  'deleting the note deletes its history'
);

SELECT * FROM finish();
ROLLBACK;
