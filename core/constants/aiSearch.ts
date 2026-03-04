// AI Search (RAG) configuration constants
// Shared between useAISearch hook and rag-search Edge Function callers.

/** Minimum char-offset distance between two accepted chunks in the same note.
 *  Chunks closer than this are considered duplicates and the lower-scoring one is hidden. */
export const OFFSET_DELTA_THRESHOLD = 300

/** Available search presets for the Strict / Neutral / Broad selector. */
export type SearchPreset = 'strict' | 'neutral' | 'broad'

/** Fixed topK and similarity threshold for each preset. */
export const SEARCH_PRESETS: Record<SearchPreset, { topK: number; threshold: number }> = {
  strict:  { topK: 5,  threshold: 0.75 },
  neutral: { topK: 15, threshold: 0.55 },
  broad:   { topK: 30, threshold: 0.40 },
}

export const DEFAULT_PRESET: SearchPreset = 'neutral'

/** Minimum query length before triggering an AI search call. */
export const AI_SEARCH_MIN_QUERY_LENGTH = 3

/** Debounce delay for AI search input (ms). */
export const AI_SEARCH_DEBOUNCE_MS = 300
