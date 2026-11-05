-- Additive MCP capabilities: compare-and-set writes and note-level ranked search.
SET search_path TO public, extensions;

CREATE OR REPLACE FUNCTION public.mcp_update_note(
  note_id uuid,
  expected_updated_at timestamptz,
  patch jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, extensions
AS $$
DECLARE current_note public.notes;
BEGIN
  IF jsonb_typeof(patch) IS DISTINCT FROM 'object' OR patch = '{}'::jsonb
     OR EXISTS (SELECT FROM jsonb_object_keys(patch) key WHERE key NOT IN ('title','description','tags')) THEN
    RAISE EXCEPTION 'patch must contain only title, description and/or tags' USING ERRCODE = '22023';
  END IF;
  IF (patch ? 'title' AND (jsonb_typeof(patch->'title') IS DISTINCT FROM 'string' OR length(btrim(patch->>'title')) NOT BETWEEN 1 AND 1000))
     OR (patch ? 'description' AND jsonb_typeof(patch->'description') IS DISTINCT FROM 'string')
     OR (patch ? 'tags' AND jsonb_typeof(patch->'tags') IS DISTINCT FROM 'array') THEN
    RAISE EXCEPTION 'Invalid note field types' USING ERRCODE = '22023';
  END IF;
  IF patch ? 'tags' AND (jsonb_array_length(patch->'tags') > 50 OR EXISTS (SELECT FROM jsonb_array_elements(patch->'tags') tag WHERE jsonb_typeof(tag) <> 'string' OR length(tag #>> '{}') > 100)) THEN
    RAISE EXCEPTION 'Invalid tags' USING ERRCODE = '22023';
  END IF;

  SELECT n.* INTO current_note FROM public.notes n
    WHERE n.id = note_id AND n.user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','not_found'); END IF;
  IF current_note.updated_at IS DISTINCT FROM expected_updated_at THEN
    RETURN jsonb_build_object('status','conflict');
  END IF;
  UPDATE public.notes n SET
    title = CASE WHEN patch ? 'title' THEN patch->>'title' ELSE n.title END,
    description = CASE WHEN patch ? 'description' THEN patch->>'description' ELSE n.description END,
    tags = CASE WHEN patch ? 'tags' THEN ARRAY(SELECT jsonb_array_elements_text(patch->'tags')) ELSE n.tags END
  WHERE n.id = note_id AND n.user_id = auth.uid()
  RETURNING n.* INTO current_note;
  RETURN jsonb_build_object('status','updated','note',to_jsonb(current_note));
END;
$$;
REVOKE ALL ON FUNCTION public.mcp_update_note(uuid,timestamptz,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mcp_update_note(uuid,timestamptz,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_notebook_notes(
  query_text text,
  search_mode text DEFAULT 'text',
  query_embedding vector(1536) DEFAULT NULL,
  tag_filters text[] DEFAULT '{}',
  tag_match text DEFAULT 'all',
  created_after timestamptz DEFAULT NULL,
  created_before timestamptz DEFAULT NULL,
  updated_after timestamptz DEFAULT NULL,
  updated_before timestamptz DEFAULT NULL,
  sort_by text DEFAULT 'relevance',
  result_limit integer DEFAULT 20,
  result_offset integer DEFAULT 0,
  min_similarity double precision DEFAULT 0.55
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public, extensions
AS $$
DECLARE
  config regconfig;
  words tsquery;
  result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF query_text IS NULL OR length(btrim(query_text)) NOT BETWEEN 1 AND 200
    OR search_mode IS NULL OR search_mode NOT IN ('text','semantic','hybrid')
    OR tag_match IS NULL OR tag_match NOT IN ('all','any')
    OR sort_by IS NULL OR sort_by NOT IN ('relevance','updated_at','created_at')
    OR result_limit IS NULL OR result_limit NOT BETWEEN 1 AND 100
    OR result_offset IS NULL OR result_offset NOT BETWEEN 0 AND 100000
    OR min_similarity IS NULL OR min_similarity NOT BETWEEN 0 AND 1
    OR cardinality(tag_filters) > 20
    OR EXISTS (SELECT FROM unnest(tag_filters) tag WHERE tag IS NULL OR length(btrim(tag)) NOT BETWEEN 1 AND 100)
    OR (created_after IS NOT NULL AND created_before IS NOT NULL AND created_after >= created_before)
    OR (updated_after IS NOT NULL AND updated_before IS NOT NULL AND updated_after >= updated_before)
    OR (search_mode <> 'text' AND query_embedding IS NULL) THEN
    RAISE EXCEPTION 'Invalid notebook search parameters' USING ERRCODE = '22023';
  END IF;
  config := CASE WHEN query_text ~ '[А-Яа-яЁёІіЇїЄєҐґ]' THEN 'russian'::regconfig ELSE 'english'::regconfig END;
  words := websearch_to_tsquery(config, query_text);

  WITH eligible AS MATERIALIZED (
    SELECT n.* FROM public.notes n
    WHERE n.user_id = auth.uid()
      AND (created_after IS NULL OR n.created_at >= created_after)
      AND (created_before IS NULL OR n.created_at < created_before)
      AND (updated_after IS NULL OR n.updated_at >= updated_after)
      AND (updated_before IS NULL OR n.updated_at < updated_before)
      AND (coalesce(cardinality(tag_filters),0) = 0 OR
        (tag_match = 'all' AND NOT EXISTS (
          SELECT FROM unnest(tag_filters) wanted
          WHERE NOT EXISTS (SELECT FROM unnest(n.tags) actual WHERE lower(btrim(actual)) = lower(btrim(wanted)))
        )) OR
        (tag_match = 'any' AND EXISTS (
          SELECT FROM unnest(n.tags) actual JOIN unnest(tag_filters) wanted ON lower(btrim(actual)) = lower(btrim(wanted))
        )))
  ), documents AS (
    SELECT n.id,
      setweight(to_tsvector(config,coalesce(n.title,'')),'A') ||
      setweight(to_tsvector(config,coalesce(n.description,'')),'B') ||
      setweight(to_tsvector(config,coalesce(array_to_string(n.tags,' '),'')),'C') AS document
    FROM eligible n WHERE search_mode <> 'semantic'
  ), text_matches AS (
    SELECT id, ts_rank_cd(document,words,32)::double precision AS relevance FROM documents WHERE document @@ words
  ), text_ranked AS (
    SELECT *, row_number() OVER (ORDER BY relevance DESC,id) AS position FROM text_matches
  ), semantic_best AS (
    SELECT DISTINCT ON (ne.note_id) ne.note_id AS id,
      1 - (ne.embedding <=> query_embedding) AS relevance,
      coalesce(ne.body_content,ne.content,'') AS excerpt
    FROM public.note_embeddings ne JOIN eligible n ON n.id = ne.note_id
    WHERE search_mode IN ('semantic','hybrid') AND ne.user_id = auth.uid()
      AND 1 - (ne.embedding <=> query_embedding) >= min_similarity
    ORDER BY ne.note_id, ne.embedding <=> query_embedding, ne.chunk_index
  ), semantic_ranked AS (
    SELECT *, row_number() OVER (ORDER BY relevance DESC,id) AS position FROM semantic_best
  ), combined AS (
    SELECT n.id,coalesce(n.title,'') AS title,coalesce(n.tags,'{}') AS tags,n.created_at,n.updated_at,
      CASE search_mode WHEN 'text' THEN t.relevance WHEN 'semantic' THEN s.relevance
        ELSE coalesce(1.0/(60+t.position),0) + coalesce(1.0/(60+s.position),0) END AS score,
      CASE WHEN t.id IS NULL THEN replace(replace(replace(left(s.excerpt,1000),'&','&amp;'),'<','&lt;'),'>','&gt;')
        ELSE ts_headline(config,coalesce(n.description,''),words,'MaxWords=45, MinWords=15, MaxFragments=2') END AS excerpt_html
    FROM eligible n LEFT JOIN text_ranked t ON t.id = n.id LEFT JOIN semantic_ranked s ON s.id = n.id
    WHERE (search_mode = 'text' AND t.id IS NOT NULL)
      OR (search_mode = 'semantic' AND s.id IS NOT NULL)
      OR (search_mode = 'hybrid' AND (t.id IS NOT NULL OR s.id IS NOT NULL))
  ), ordered AS (
    SELECT *, row_number() OVER (ORDER BY
      CASE WHEN sort_by = 'relevance' THEN score END DESC NULLS LAST,
      CASE WHEN sort_by = 'updated_at' THEN updated_at END DESC NULLS LAST,
      CASE WHEN sort_by = 'created_at' THEN created_at END DESC NULLS LAST,
      id) AS row_order FROM combined
  ), page AS (
    SELECT * FROM ordered ORDER BY row_order LIMIT result_limit OFFSET result_offset
  )
  SELECT jsonb_build_object(
    'notes',coalesce((SELECT jsonb_agg(to_jsonb(p)-'row_order' ORDER BY p.row_order) FROM page p),'[]'::jsonb),
    'total',(SELECT count(*) FROM combined),
    'has_more',result_offset+(SELECT count(*) FROM page)<(SELECT count(*) FROM combined),
    'mode',search_mode
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.search_notebook_notes(text,text,vector,text[],text,timestamptz,timestamptz,timestamptz,timestamptz,text,integer,integer,double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_notebook_notes(text,text,vector,text[],text,timestamptz,timestamptz,timestamptz,timestamptz,text,integer,integer,double precision) TO authenticated;
