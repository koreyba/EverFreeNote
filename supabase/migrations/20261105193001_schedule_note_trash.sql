-- pg_cron is optional locally; the authenticated activity fallback remains available.
CREATE FUNCTION note_trash_private.dispatch_media_cleanup() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE endpoint text; secret text; request_id bigint;
BEGIN
  IF to_regclass('vault.decrypted_secrets') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_net') THEN RETURN NULL; END IF;
  EXECUTE 'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name=$1 LIMIT 1' INTO endpoint USING 'trash_cleanup_url';
  EXECUTE 'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name=$1 LIMIT 1' INTO secret USING 'trash_cleanup_secret';
  IF endpoint IS NULL OR secret IS NULL THEN RETURN NULL; END IF;
  EXECUTE 'SELECT net.http_post(url:=$1,headers:=$2,body:=''{}''::jsonb,timeout_milliseconds:=10000)'
    INTO request_id USING endpoint,jsonb_build_object('Content-Type','application/json','x-trash-cleanup-secret',secret);
  RETURN request_id;
END;
$$;
REVOKE ALL ON FUNCTION note_trash_private.dispatch_media_cleanup() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.configure_note_trash_cron() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_available_extensions WHERE name='pg_cron') THEN RETURN false; END IF;
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  IF EXISTS(SELECT 1 FROM pg_available_extensions WHERE name='pg_net') THEN
    CREATE SCHEMA IF NOT EXISTS extensions;
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  END IF;
  EXECUTE $schedule$SELECT cron.schedule('purge-note-trash','17 * * * *',
    'SET statement_timeout=''2s''; SET lock_timeout=''250ms''; SELECT public.purge_expired_note_trash();')$schedule$;
  EXECUTE $schedule$SELECT cron.schedule('cleanup-note-trash-media','27 * * * *',
    'SET statement_timeout=''2s''; SELECT note_trash_private.dispatch_media_cleanup();')$schedule$;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.configure_note_trash_cron() FROM PUBLIC,anon,authenticated;
-- No automatic HTTP work starts until the managed worker secret and Vault entries exist.
SELECT public.configure_note_trash_cron();
