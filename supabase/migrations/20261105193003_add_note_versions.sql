CREATE TABLE public.note_versions (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL,
    version INTEGER NOT NULL CHECK (version > 0),
    title TEXT,
    description TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, note_id, version)
);

ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.note_versions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.note_versions TO authenticated;

CREATE POLICY "Users can read own note versions"
    ON public.note_versions
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid()) AND EXISTS (
            SELECT 1 FROM public.notes AS note
            WHERE note.id = note_versions.note_id AND note.user_id = note_versions.user_id
        )
    );

CREATE FUNCTION public.record_note_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    latest public.note_versions;
BEGIN
    -- Updates to the same note serialize on the parent row, so each gets the next version.
    SELECT * INTO latest FROM public.note_versions
    WHERE user_id = NEW.user_id AND note_id = NEW.id
    ORDER BY version DESC LIMIT 1;

    -- Trash recovery inserts the same note and content again.
    IF TG_OP = 'INSERT' AND FOUND AND
        ROW(latest.title, latest.description, latest.tags) IS NOT DISTINCT FROM ROW(NEW.title, NEW.description, NEW.tags)
    THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.note_versions (user_id, note_id, version, title, description, tags)
    VALUES (NEW.user_id, NEW.id, COALESCE(latest.version, 0) + 1, NEW.title, NEW.description, NEW.tags);

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_note_version() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER record_initial_note_version
    AFTER INSERT ON public.notes
    FOR EACH ROW EXECUTE FUNCTION public.record_note_version();

CREATE TRIGGER record_changed_note_version
    AFTER UPDATE ON public.notes
    FOR EACH ROW
    WHEN (ROW(OLD.title, OLD.description, OLD.tags) IS DISTINCT FROM ROW(NEW.title, NEW.description, NEW.tags))
    EXECUTE FUNCTION public.record_note_version();

CREATE FUNCTION public.restore_note_version(
    p_note_id UUID,
    p_version INTEGER,
    p_expected_version INTEGER
)
RETURNS public.notes
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    actor UUID := auth.uid();
    current_version INTEGER;
    selected_version public.note_versions;
    restored_note public.notes;
BEGIN
    PERFORM 1 FROM public.notes
    WHERE id = p_note_id AND user_id = actor
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Note not found' USING ERRCODE = 'PT404';
    END IF;

    SELECT MAX(version) INTO current_version
    FROM public.note_versions
    WHERE user_id = actor AND note_id = p_note_id;

    IF current_version IS DISTINCT FROM p_expected_version THEN
        RAISE EXCEPTION 'Note changed since history was loaded' USING ERRCODE = 'PT409';
    END IF;

    SELECT * INTO selected_version
    FROM public.note_versions
    WHERE user_id = actor AND note_id = p_note_id AND version = p_version;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Note version not found' USING ERRCODE = 'PT404';
    END IF;

    UPDATE public.notes
    SET title = selected_version.title,
        description = selected_version.description,
        tags = selected_version.tags
    WHERE id = p_note_id AND user_id = actor
    RETURNING * INTO restored_note;

    RETURN restored_note;
END;
$$;

REVOKE ALL ON FUNCTION public.restore_note_version(UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_note_version(UUID, INTEGER, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION note_trash_private.record_note_images(p_id uuid,p_user uuid,p_body text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE paths text[] := note_trash_private.note_image_paths(p_body); path text;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock_shared(pg_catalog.hashtextextended('note-media:inventory',0));
  FOR path IN SELECT DISTINCT unnest(paths) ORDER BY 1 LOOP
    IF path IS NULL THEN CONTINUE; END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('note-media:'||path,0));
    IF EXISTS(SELECT 1 FROM note_trash_private.trash_media_cleanup WHERE object_path=path AND state='deleting') THEN
      RAISE EXCEPTION 'An image is being permanently deleted. Keep your draft and retry.' USING ERRCODE='P0001';
    END IF;
  END LOOP;
  -- Older versions still reference these images, so keep the inventory until permanent deletion.
  INSERT INTO public.note_image_refs(note_id,user_id,object_path)
    SELECT p_id,p_user,p.path FROM (SELECT DISTINCT unnest(paths) path) p WHERE p.path IS NOT NULL
    ON CONFLICT(note_id,object_path) DO NOTHING;
  -- Unknown URL encodings block file GC conservatively, never note recovery or note purge.
  IF regexp_replace(coalesce(p_body,''),'/storage/v1/object/(?:public|sign)/note-images/([^"''<>[:space:]?#]+)','','g') LIKE '%/note-images/%'
    OR array_position(paths,NULL) IS NOT NULL THEN
    IF EXISTS(SELECT 1 FROM note_trash_private.trash_media_cleanup WHERE state='deleting') THEN
      RAISE EXCEPTION 'Image cleanup is in progress. Keep your draft and retry.' USING ERRCODE='P0001';
    END IF;
    INSERT INTO note_trash_private.unverified_note_images VALUES(p_id,p_user) ON CONFLICT(note_id) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION note_trash_private.track_note_images() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE body text := NEW.description;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW.description IS NOT DISTINCT FROM OLD.description THEN RETURN NEW; END IF;
    -- The previous body might still be waiting for the initial image inventory scan.
    body := concat_ws(E'\n',OLD.description,NEW.description);
  END IF;
  IF TG_TABLE_NAME='notes' THEN PERFORM note_trash_private.record_note_images(NEW.id,NEW.user_id,body);
  ELSE PERFORM note_trash_private.record_note_images(NEW.original_note_id,NEW.user_id,body); END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION note_trash_private.queue_purged_note_images() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target uuid;
BEGIN
  IF TG_TABLE_NAME='notes' THEN target := OLD.id;
  ELSE target := OLD.original_note_id;
  END IF;
  IF EXISTS(SELECT 1 FROM public.notes WHERE id=target AND user_id=OLD.user_id)
    OR EXISTS(SELECT 1 FROM public.notes_trash WHERE original_note_id=target AND user_id=OLD.user_id)
  THEN
    RETURN OLD;
  END IF;

  DELETE FROM public.note_versions WHERE user_id=OLD.user_id AND note_id=target;
  -- Queue only this owner's files. Shared references delay the worker, not note deletion.
  INSERT INTO note_trash_private.trash_media_cleanup(object_path,user_id)
    SELECT object_path,OLD.user_id FROM public.note_image_refs
    WHERE note_id=target AND user_id=OLD.user_id AND object_path LIKE OLD.user_id::text||'/%'
    UNION
    SELECT name,OLD.user_id FROM storage.objects WHERE bucket_id='note-images' AND name LIKE OLD.user_id::text||'/'||target::text||'/%'
    ON CONFLICT(object_path) DO NOTHING;
  DELETE FROM public.note_image_refs WHERE note_id=target AND user_id=OLD.user_id;
  DELETE FROM note_trash_private.unverified_note_images WHERE note_id=target AND user_id=OLD.user_id;
  RETURN OLD;
END;
$$;

-- Recovery deletes the archived row before recreating the active row in the same transaction.
DROP TRIGGER queue_purged_note_images ON public.notes_trash;
CREATE CONSTRAINT TRIGGER queue_purged_note_images
    AFTER DELETE ON public.notes_trash DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION note_trash_private.queue_purged_note_images();

INSERT INTO public.note_versions (user_id, note_id, version, title, description, tags, created_at)
SELECT user_id, id, 1, title, description, tags, COALESCE(updated_at, created_at, NOW())
FROM public.notes
UNION ALL
SELECT user_id, original_note_id, 1, title, description, tags, COALESCE(updated_at, created_at, deleted_at)
FROM public.notes_trash;
