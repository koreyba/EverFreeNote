-- Ordinary DELETE remains compatible with older clients, but now archives first.
-- Keep active readers on notes so privileged RPCs and old clients cannot expose Trash.
CREATE SCHEMA IF NOT EXISTS note_trash_private;
REVOKE ALL ON SCHEMA note_trash_private FROM PUBLIC, anon, authenticated;

CREATE TABLE public.notes_trash (
  trash_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_note_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text DEFAULT 'Untitled',
  description text DEFAULT '',
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  body_bytes bigint GENERATED ALWAYS AS (octet_length(description)) STORED
);
CREATE INDEX notes_trash_expiry_idx ON public.notes_trash(deleted_at, trash_id);
CREATE INDEX notes_trash_owner_idx ON public.notes_trash(user_id, deleted_at DESC, trash_id);
CREATE INDEX IF NOT EXISTS note_share_links_note_id_idx ON public.note_share_links(note_id);
ALTER TABLE public.notes_trash ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own Trash" ON public.notes_trash FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
REVOKE ALL ON public.notes_trash FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notes_trash TO authenticated;

-- Content-free receipts prevent an acknowledged offline retry from re-trashing a restored note.
CREATE TABLE note_trash_private.operations(
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_id text NOT NULL CHECK(octet_length(operation_id) BETWEEN 1 AND 200),
  original_note_id uuid NOT NULL,trash_id uuid NOT NULL,
  PRIMARY KEY(user_id,operation_id)
);

CREATE FUNCTION note_trash_private.guard_trashed_note_id() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    RAISE EXCEPTION 'Note identity cannot be changed.' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('note-trash:' || NEW.id::text, 0));
  IF EXISTS (SELECT 1 FROM public.notes_trash WHERE original_note_id = NEW.id) THEN
    RAISE EXCEPTION 'This note is in Trash. Restore it before editing.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_trashed_note_id BEFORE INSERT OR UPDATE OF id,user_id ON public.notes FOR EACH ROW EXECUTE FUNCTION note_trash_private.guard_trashed_note_id();

CREATE FUNCTION note_trash_private.archive_deleted_note() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- During auth.users ON DELETE CASCADE the parent is already gone. Never recreate it.
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.user_id) THEN RETURN OLD; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('note-trash:' || OLD.id::text, 0));
  INSERT INTO public.notes_trash(original_note_id,user_id,title,description,tags,created_at,updated_at)
    VALUES(OLD.id,OLD.user_id,OLD.title,OLD.description,OLD.tags,OLD.created_at,OLD.updated_at);
  RETURN OLD;
END;
$$;
CREATE TRIGGER archive_deleted_note BEFORE DELETE ON public.notes FOR EACH ROW EXECUTE FUNCTION note_trash_private.archive_deleted_note();

CREATE FUNCTION public.trash_notes(p_notes jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '250ms' AS $$
DECLARE
  actor uuid := auth.uid();
  item jsonb;
  target uuid;
  active public.notes%ROWTYPE;
  archived public.notes_trash%ROWTYPE;
  snapshot jsonb;
  expected timestamptz;
  result jsonb := '[]'::jsonb;
  outcome text;
  operation text;
  receipt note_trash_private.operations%ROWTYPE;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  IF p_notes IS NULL OR jsonb_typeof(p_notes) <> 'array' OR jsonb_array_length(p_notes) > 100
    OR octet_length(p_notes::text) > 33554432 THEN
    RAISE EXCEPTION 'Expected at most 100 notes and 32 MiB per request' USING ERRCODE='22023';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_notes) ORDER BY (value->>'id')::uuid LOOP
    target := (item->>'id')::uuid;
    IF target IS NULL THEN RAISE EXCEPTION 'Missing note ID' USING ERRCODE='22023'; END IF;
    snapshot := item->'snapshot';
    IF snapshot IS NOT NULL THEN
      IF jsonb_typeof(snapshot) IS DISTINCT FROM 'object'
        OR jsonb_typeof(snapshot->'title') IS DISTINCT FROM 'string'
        OR jsonb_typeof(snapshot->'description') IS DISTINCT FROM 'string'
        OR jsonb_typeof(snapshot->'tags') IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'A complete title, description and tags snapshot is required' USING ERRCODE='22023';
      END IF;
      IF EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'tags') tag WHERE jsonb_typeof(tag)<>'string') THEN
        RAISE EXCEPTION 'Snapshot tags must be strings' USING ERRCODE='22023';
      END IF;
    END IF;
    operation := nullif(item->>'operation_id','');
    expected := (item->>'expected_updated_at')::timestamptz;
    SELECT * INTO active FROM public.notes WHERE id=target AND user_id=actor FOR UPDATE;
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('note-trash:' || target::text, 0));
    SELECT * INTO receipt FROM note_trash_private.operations WHERE user_id=actor AND operation_id=operation;
    IF receipt.user_id IS NOT NULL THEN
      result := result || jsonb_build_array(jsonb_build_object('id',target,'trash_id',receipt.trash_id,
        'status',CASE WHEN receipt.original_note_id=target THEN 'already_trashed' ELSE 'conflict' END));
      CONTINUE;
    END IF;
    SELECT * INTO archived FROM public.notes_trash WHERE original_note_id=target AND user_id=actor FOR UPDATE;
    outcome := 'trashed';
    IF active.id IS NOT NULL THEN
      IF expected IS NOT NULL AND active.updated_at IS DISTINCT FROM expected THEN
        outcome := 'conflict';
      ELSIF snapshot IS NOT NULL AND (
        snapshot->>'title' IS DISTINCT FROM active.title OR snapshot->>'description' IS DISTINCT FROM active.description
        OR snapshot->'tags' IS DISTINCT FROM to_jsonb(active.tags)
      ) THEN
        -- An offline edit must prove the server version before replacing it.
        IF expected IS NULL THEN outcome := 'conflict';
        ELSE
          UPDATE public.notes SET title=snapshot->>'title',description=snapshot->>'description',
            tags=ARRAY(SELECT jsonb_array_elements_text(snapshot->'tags')) WHERE id=target AND user_id=actor;
        END IF;
      END IF;
      IF outcome <> 'conflict' THEN
        DELETE FROM public.notes WHERE id=target AND user_id=actor;
        SELECT * INTO archived FROM public.notes_trash WHERE original_note_id=target AND user_id=actor;
      END IF;
    ELSIF archived.trash_id IS NOT NULL THEN
      IF snapshot IS NOT NULL AND (
        snapshot->>'title' IS DISTINCT FROM archived.title OR snapshot->>'description' IS DISTINCT FROM archived.description
        OR snapshot->'tags' IS DISTINCT FROM to_jsonb(archived.tags)
      ) THEN outcome := 'conflict'; ELSE outcome := 'already_trashed'; END IF;
    ELSIF EXISTS (SELECT 1 FROM public.notes WHERE id=target) THEN
      outcome := 'missing';
    ELSIF snapshot IS NOT NULL AND jsonb_typeof(snapshot->'title')='string'
      AND jsonb_typeof(snapshot->'description')='string' AND jsonb_typeof(snapshot->'tags')='array' THEN
      INSERT INTO public.notes_trash(original_note_id,user_id,title,description,tags,created_at,updated_at)
        VALUES(target,actor,snapshot->>'title',snapshot->>'description',ARRAY(SELECT jsonb_array_elements_text(snapshot->'tags')),
          coalesce((snapshot->>'created_at')::timestamptz,now()),coalesce((snapshot->>'updated_at')::timestamptz,now()))
        RETURNING * INTO archived;
    ELSE outcome := 'missing';
    END IF;
    IF operation IS NOT NULL AND outcome IN ('trashed','already_trashed') THEN
      INSERT INTO note_trash_private.operations VALUES(actor,operation,target,archived.trash_id);
    END IF;
    result := result || jsonb_build_array(jsonb_build_object('id',target,'trash_id',archived.trash_id,'status',outcome));
  END LOOP;
  RETURN result;
END;
$$;

CREATE FUNCTION public.restore_notes(p_ids uuid[]) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '250ms' AS $$
DECLARE
  actor uuid := auth.uid();
  target uuid;
  archived public.notes_trash%ROWTYPE;
  result jsonb := '[]'::jsonb;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  IF p_ids IS NULL OR cardinality(p_ids)>100 THEN RAISE EXCEPTION 'Expected at most 100 entries' USING ERRCODE='22023'; END IF;
  FOR target IN SELECT DISTINCT unnest(p_ids) ORDER BY 1 LOOP
    SELECT * INTO archived FROM public.notes_trash WHERE trash_id=target AND user_id=actor FOR UPDATE;
    IF archived.trash_id IS NULL THEN
      result := result || jsonb_build_array(jsonb_build_object('trash_id',target,'status','missing'));
      CONTINUE;
    END IF;
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('note-trash:' || archived.original_note_id::text,0));
    IF EXISTS (SELECT 1 FROM public.notes WHERE id=archived.original_note_id) THEN
      result := result || jsonb_build_array(jsonb_build_object('trash_id',target,'status','conflict'));
      CONTINUE;
    END IF;
    DELETE FROM public.notes_trash WHERE trash_id=target;
    INSERT INTO public.notes(id,user_id,title,description,tags,created_at,updated_at)
      VALUES(archived.original_note_id,actor,archived.title,archived.description,archived.tags,archived.created_at,clock_timestamp());
    result := result || jsonb_build_array(jsonb_build_object('trash_id',target,'id',archived.original_note_id,'status','restored'));
  END LOOP;
  RETURN result;
END;
$$;

CREATE FUNCTION public.purge_notes(p_ids uuid[]) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '250ms' AS $$
DECLARE
  actor uuid := auth.uid();
  target uuid;
  removed uuid;
  result jsonb := '[]'::jsonb;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  IF p_ids IS NULL OR cardinality(p_ids)>100 THEN RAISE EXCEPTION 'Expected at most 100 entries' USING ERRCODE='22023'; END IF;
  FOR target IN SELECT DISTINCT unnest(p_ids) ORDER BY 1 LOOP
    removed := NULL;
    DELETE FROM public.notes_trash WHERE trash_id=target AND user_id=actor RETURNING trash_id INTO removed;
    result := result || jsonb_build_array(jsonb_build_object('trash_id',target,'status',CASE WHEN removed IS NULL THEN 'missing' ELSE 'purged' END));
  END LOOP;
  RETURN result;
END;
$$;

-- Only trusted scheduler/worker roles may choose an owner or run globally.
CREATE FUNCTION public.purge_expired_note_trash(p_owner uuid DEFAULT NULL) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '250ms' SET statement_timeout = '2s' AS $$
DECLARE removed integer;
BEGIN
  IF NOT pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended('note-trash:expiry',0)) THEN RETURN 0; END IF;
  WITH candidates AS (
    SELECT trash_id FROM public.notes_trash
    WHERE deleted_at <= now()-interval '720 hours' AND (p_owner IS NULL OR user_id=p_owner)
    ORDER BY deleted_at,trash_id LIMIT 100 FOR UPDATE SKIP LOCKED
  ), deleted AS (
    DELETE FROM public.notes_trash t USING candidates c WHERE t.trash_id=c.trash_id RETURNING t.trash_id
  ) SELECT count(*) INTO removed FROM deleted;
  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION note_trash_private.guard_trashed_note_id(), note_trash_private.archive_deleted_note() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.trash_notes(jsonb),public.restore_notes(uuid[]),public.purge_notes(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.trash_notes(jsonb),public.restore_notes(uuid[]),public.purge_notes(uuid[]) TO authenticated;
REVOKE ALL ON FUNCTION public.purge_expired_note_trash(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_note_trash(uuid) TO service_role;

CREATE TABLE note_trash_private.trash_activity (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id uuid NOT NULL, started_at timestamptz NOT NULL, batches integer NOT NULL
);
CREATE FUNCTION public.cleanup_my_trash(p_run uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET lock_timeout='250ms' SET statement_timeout='2s' AS $$
DECLARE actor uuid := auth.uid(); gate note_trash_private.trash_activity%ROWTYPE;
BEGIN
  IF actor IS NULL OR p_run IS NULL THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  IF NOT pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended('note-trash:activity:'||actor::text,0)) THEN RETURN 0; END IF;
  SELECT * INTO gate FROM note_trash_private.trash_activity WHERE user_id=actor FOR UPDATE;
  IF gate.user_id IS NULL OR gate.started_at < clock_timestamp()-interval '1 hour' THEN
    INSERT INTO note_trash_private.trash_activity VALUES(actor,p_run,clock_timestamp(),1)
      ON CONFLICT(user_id) DO UPDATE SET run_id=p_run,started_at=clock_timestamp(),batches=1;
  ELSIF gate.run_id=p_run AND gate.batches<5 AND gate.started_at > clock_timestamp()-interval '2 seconds' THEN
    UPDATE note_trash_private.trash_activity SET batches=batches+1 WHERE user_id=actor;
  ELSE RETURN 0;
  END IF;
  RETURN public.purge_expired_note_trash(actor);
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_my_trash(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cleanup_my_trash(uuid) TO authenticated;

-- Reference inventory survives the active -> Trash transition. Clients cannot edit it.
CREATE TABLE public.note_image_refs (
  note_id uuid NOT NULL, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  object_path text NOT NULL, PRIMARY KEY(note_id,object_path)
);
CREATE INDEX note_image_refs_path_idx ON public.note_image_refs(object_path);
ALTER TABLE public.note_image_refs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.note_image_refs FROM PUBLIC,anon,authenticated;
CREATE TABLE note_trash_private.unverified_note_images(note_id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE);
CREATE TABLE note_trash_private.trash_media_inventory(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),last_id uuid,complete boolean NOT NULL DEFAULT false);
INSERT INTO note_trash_private.trash_media_inventory(singleton,complete)
  SELECT true,NOT EXISTS(SELECT 1 FROM public.notes UNION ALL SELECT 1 FROM public.notes_trash);
CREATE TABLE note_trash_private.trash_media_cleanup (
  object_path text PRIMARY KEY, user_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','deleting')),
  lease_id uuid, attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trash_media_cleanup_due_idx ON note_trash_private.trash_media_cleanup(next_attempt_at,object_path);
CREATE TABLE note_trash_private.media_activity(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,last_run timestamptz NOT NULL);

CREATE FUNCTION note_trash_private.note_image_paths(body text) RETURNS text[]
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE part text[]; raw text; decoded text; paths text[] := '{}';
BEGIN
  FOR part IN SELECT regexp_matches(coalesce(body,''),'/storage/v1/object/(?:public|sign)/note-images/([^"''<>[:space:]?#]+)','g') LOOP
    raw := replace(part[1],'&amp;','&');
    BEGIN
      SELECT convert_from(decode(string_agg(CASE WHEN t[1] LIKE '\%%' THEN substr(t[1],2)
        ELSE encode(convert_to(t[1],'UTF8'),'hex') END,''),'hex'),'UTF8') INTO decoded
        FROM regexp_matches(raw,'(%[a-fA-F0-9]{2}|.)','g') t;
    EXCEPTION WHEN OTHERS THEN decoded := NULL;
    END;
    paths := array_append(paths,decoded);
  END LOOP;
  RETURN paths;
END;
$$;

CREATE FUNCTION note_trash_private.record_note_images(p_id uuid,p_user uuid,p_body text) RETURNS void
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
  DELETE FROM public.note_image_refs WHERE note_id=p_id;
  INSERT INTO public.note_image_refs SELECT p_id,p_user,p.path FROM (SELECT DISTINCT unnest(paths) path) p WHERE p.path IS NOT NULL;
  DELETE FROM note_trash_private.unverified_note_images WHERE note_id=p_id;
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
CREATE FUNCTION note_trash_private.track_note_images() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.description IS NOT DISTINCT FROM OLD.description THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME='notes' THEN PERFORM note_trash_private.record_note_images(NEW.id,NEW.user_id,NEW.description);
  ELSE PERFORM note_trash_private.record_note_images(NEW.original_note_id,NEW.user_id,NEW.description); END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER track_note_images AFTER INSERT OR UPDATE OF description ON public.notes FOR EACH ROW EXECUTE FUNCTION note_trash_private.track_note_images();
CREATE TRIGGER track_trashed_note_images AFTER INSERT ON public.notes_trash FOR EACH ROW EXECUTE FUNCTION note_trash_private.track_note_images();

CREATE FUNCTION note_trash_private.queue_purged_note_images() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target uuid;
BEGIN
  IF TG_TABLE_NAME='notes' THEN
    target := OLD.id;
    IF EXISTS(SELECT 1 FROM public.notes_trash WHERE original_note_id=target) THEN RETURN OLD; END IF;
  ELSE target := OLD.original_note_id;
  END IF;
  -- Queue only this owner's files. Shared references delay the worker, not note deletion.
  INSERT INTO note_trash_private.trash_media_cleanup(object_path,user_id)
    SELECT object_path,OLD.user_id FROM public.note_image_refs
    WHERE note_id=target AND object_path LIKE OLD.user_id::text||'/%'
    UNION
    SELECT name,OLD.user_id FROM storage.objects WHERE bucket_id='note-images' AND name LIKE OLD.user_id::text||'/'||target::text||'/%'
    ON CONFLICT(object_path) DO NOTHING;
  DELETE FROM public.note_image_refs WHERE note_id=target;
  DELETE FROM note_trash_private.unverified_note_images WHERE note_id=target;
  RETURN OLD;
END;
$$;
CREATE TRIGGER queue_purged_note_images AFTER DELETE ON public.notes_trash FOR EACH ROW EXECUTE FUNCTION note_trash_private.queue_purged_note_images();
CREATE TRIGGER queue_deleted_account_images AFTER DELETE ON public.notes FOR EACH ROW EXECUTE FUNCTION note_trash_private.queue_purged_note_images();

CREATE FUNCTION note_trash_private.backfill_note_image_refs() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE inventory note_trash_private.trash_media_inventory%ROWTYPE; item record; target uuid;
  processed integer := 0; deadline timestamptz := clock_timestamp()+interval '1 second'; finished boolean;
BEGIN
  SELECT * INTO inventory FROM note_trash_private.trash_media_inventory WHERE singleton FOR UPDATE;
  IF inventory.complete THEN RETURN true; END IF;
  FOR target IN SELECT id FROM (
    SELECT id FROM public.notes WHERE inventory.last_id IS NULL OR id>inventory.last_id
    UNION
    SELECT original_note_id FROM public.notes_trash WHERE inventory.last_id IS NULL OR original_note_id>inventory.last_id
  ) n ORDER BY id LIMIT 100 LOOP
    EXIT WHEN processed>0 AND clock_timestamp()>deadline;
    -- Re-read under a row lock: an old body must never replace references from a newer edit.
    SELECT id,user_id,description INTO item FROM public.notes WHERE id=target FOR UPDATE;
    IF NOT FOUND THEN SELECT original_note_id AS id,user_id,description INTO item FROM public.notes_trash WHERE original_note_id=target FOR UPDATE; END IF;
    IF FOUND THEN PERFORM note_trash_private.record_note_images(item.id,item.user_id,item.description); END IF;
    inventory.last_id := target; processed := processed+1;
  END LOOP;
  SELECT NOT EXISTS(SELECT 1 FROM public.notes WHERE id>inventory.last_id
    UNION ALL SELECT 1 FROM public.notes_trash WHERE original_note_id>inventory.last_id) INTO finished;
  UPDATE note_trash_private.trash_media_inventory SET last_id=inventory.last_id,complete=finished WHERE singleton;
  RETURN finished;
END;
$$;

CREATE FUNCTION public.claim_trash_media_cleanup(p_owner uuid DEFAULT NULL)
RETURNS TABLE(object_path text,lease_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET lock_timeout='250ms' SET statement_timeout='2s' AS $$
DECLARE item note_trash_private.trash_media_cleanup%ROWTYPE; allowed integer;
BEGIN
  IF p_owner IS NOT NULL THEN
    INSERT INTO note_trash_private.media_activity VALUES(p_owner,clock_timestamp())
      ON CONFLICT(user_id) DO UPDATE SET last_run=clock_timestamp()
      WHERE note_trash_private.media_activity.last_run < clock_timestamp()-interval '1 hour';
    GET DIAGNOSTICS allowed=ROW_COUNT;
    IF allowed=0 THEN RETURN; END IF;
  END IF;
  IF NOT pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended('note-trash:media-claim',0)) THEN RETURN; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('note-media:inventory',0));
  IF NOT note_trash_private.backfill_note_image_refs() OR EXISTS(SELECT 1 FROM note_trash_private.unverified_note_images) THEN RETURN; END IF;
  FOR item IN SELECT * FROM note_trash_private.trash_media_cleanup c
    WHERE c.next_attempt_at<=now() AND (p_owner IS NULL OR c.user_id=p_owner)
      AND NOT EXISTS(SELECT 1 FROM public.note_image_refs r WHERE r.object_path=c.object_path)
    ORDER BY c.next_attempt_at,c.object_path LIMIT 100 FOR UPDATE SKIP LOCKED LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('note-media:'||item.object_path,0));
    IF EXISTS(SELECT 1 FROM public.note_image_refs r WHERE r.object_path=item.object_path) THEN CONTINUE; END IF;
    object_path := item.object_path; lease_id := gen_random_uuid();
    UPDATE note_trash_private.trash_media_cleanup c SET state='deleting',lease_id=claim_trash_media_cleanup.lease_id,
      attempts=c.attempts+1,next_attempt_at=now()+interval '5 minutes' WHERE c.object_path=item.object_path;
    RETURN NEXT;
  END LOOP;
END;
$$;
CREATE FUNCTION public.complete_trash_media_cleanup(p_path text,p_lease uuid,p_success boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_success THEN DELETE FROM note_trash_private.trash_media_cleanup WHERE object_path=p_path AND lease_id=p_lease;
  -- A timed-out Storage request may still finish. Keep references blocked until a
  -- later successful removal, rather than treating an uncertain failure as safe.
  ELSE UPDATE note_trash_private.trash_media_cleanup SET state='deleting',lease_id=NULL,
    next_attempt_at=now()+make_interval(secs=>least(3600,60*power(2,least(attempts,6)))::double precision)
    WHERE object_path=p_path AND lease_id=p_lease;
  END IF;
END;
$$;
REVOKE ALL ON ALL TABLES IN SCHEMA note_trash_private FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA note_trash_private FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.claim_trash_media_cleanup(uuid),public.complete_trash_media_cleanup(text,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_trash_media_cleanup(uuid),public.complete_trash_media_cleanup(text,uuid,boolean) TO service_role;

CREATE FUNCTION public.complete_trash_media_cleanup_batch(p_claims jsonb,p_success boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item jsonb;
BEGIN
  IF p_claims IS NULL OR jsonb_typeof(p_claims)<>'array' OR jsonb_array_length(p_claims)>100 THEN
    RAISE EXCEPTION 'Expected at most 100 cleanup claims' USING ERRCODE='22023';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_claims) LOOP
    PERFORM public.complete_trash_media_cleanup(item->>'object_path',(item->>'lease_id')::uuid,p_success);
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_trash_media_cleanup_batch(jsonb,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_trash_media_cleanup_batch(jsonb,boolean) TO service_role;
