CREATE TABLE public.note_versions (
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    version INTEGER NOT NULL CHECK (version > 0),
    title TEXT,
    description TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (note_id, version)
);

ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.note_versions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.note_versions TO authenticated;

CREATE POLICY "Users can read own note versions"
    ON public.note_versions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.notes AS note
            WHERE note.id = note_versions.note_id AND note.user_id = (SELECT auth.uid())
        )
    );

CREATE FUNCTION public.record_note_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Updates to the same note serialize on the parent row, so each gets the next version.
    INSERT INTO public.note_versions (note_id, version, title, description, tags)
    SELECT NEW.id, COALESCE(MAX(version), 0) + 1, NEW.title, NEW.description, NEW.tags
    FROM public.note_versions
    WHERE note_id = NEW.id;

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

INSERT INTO public.note_versions (note_id, version, title, description, tags, created_at)
SELECT id, 1, title, description, tags, COALESCE(updated_at, created_at, NOW())
FROM public.notes;

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
    current_version INTEGER;
    selected_version public.note_versions;
    restored_note public.notes;
BEGIN
    PERFORM 1 FROM public.notes
    WHERE id = p_note_id AND user_id = (SELECT auth.uid())
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Note not found' USING ERRCODE = 'PT404';
    END IF;

    SELECT MAX(version) INTO current_version
    FROM public.note_versions
    WHERE note_id = p_note_id;

    IF current_version IS DISTINCT FROM p_expected_version THEN
        RAISE EXCEPTION 'Note changed since history was loaded' USING ERRCODE = 'PT409';
    END IF;

    SELECT * INTO selected_version
    FROM public.note_versions
    WHERE note_id = p_note_id AND version = p_version;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Note version not found' USING ERRCODE = 'PT404';
    END IF;

    UPDATE public.notes
    SET title = selected_version.title,
        description = selected_version.description,
        tags = selected_version.tags
    WHERE id = p_note_id
    RETURNING * INTO restored_note;

    RETURN restored_note;
END;
$$;

REVOKE ALL ON FUNCTION public.restore_note_version(UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_note_version(UUID, INTEGER, INTEGER) TO authenticated;
