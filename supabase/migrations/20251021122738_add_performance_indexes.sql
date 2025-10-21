-- Migration: Add Performance Indexes for Large Datasets
-- Purpose: Optimize queries for pagination, search, and filtering
-- Date: 2025-10-21

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Index 1: Composite index for user + updated_at (most common query)
-- This supports: ORDER BY updated_at DESC with user filtering
CREATE INDEX IF NOT EXISTS idx_notes_user_updated 
ON notes(user_id, updated_at DESC) 
WHERE user_id IS NOT NULL;

-- Index 2: Full-text search index (GIN index for tsvector)
-- This supports: Full-text search on title and description
CREATE INDEX IF NOT EXISTS idx_notes_fts 
ON notes USING GIN (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- Index 3: Tag filtering index (GIN index for arrays)
-- This supports: Filtering by tags using @> operator
CREATE INDEX IF NOT EXISTS idx_notes_tags 
ON notes USING GIN (tags);

-- ============================================================================
-- ANALYZE TABLE FOR QUERY PLANNER
-- ============================================================================

-- Update statistics for query planner optimization
ANALYZE notes;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_notes_user_updated IS 
'Composite index for user-scoped queries sorted by updated_at. Used for paginated note lists.';

COMMENT ON INDEX idx_notes_fts IS 
'Full-text search index for searching notes by title and description content.';

COMMENT ON INDEX idx_notes_tags IS 
'GIN index for efficient tag filtering using array containment operators.';

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- To verify indexes are being used, run:
-- EXPLAIN ANALYZE SELECT * FROM notes WHERE user_id = 'xxx' ORDER BY updated_at DESC LIMIT 20;
-- EXPLAIN ANALYZE SELECT * FROM notes WHERE to_tsvector('english', title || ' ' || description) @@ to_tsquery('english', 'search');
-- EXPLAIN ANALYZE SELECT * FROM notes WHERE tags @> ARRAY['tag1'];


