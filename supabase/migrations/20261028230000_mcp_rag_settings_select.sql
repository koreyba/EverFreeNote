-- MCP reads the caller's saved threshold using its user-scoped client.
-- Limit the additional SELECT privilege to the columns it needs; the existing
-- row-level policy still restricts authenticated users to their own row.
GRANT SELECT (user_id, similarity_threshold)
  ON TABLE public.user_rag_search_settings TO authenticated;
