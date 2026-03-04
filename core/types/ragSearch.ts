// Types for AI Search (RAG) feature.
// RagChunk mirrors the rag-search Edge Function response shape.
// RagNoteGroup is computed client-side in useAISearch after deduplication.

/** A single chunk returned by the rag-search Edge Function. */
export interface RagChunk {
  noteId: string
  noteTitle: string
  noteTags: string[]
  chunkIndex: number
  charOffset: number
  content: string
  /** Cosine similarity in range [0, 1]. */
  similarity: number
}

/** A note with its deduplicated chunks, sorted by topScore descending.
 *  Computed in useAISearch after grouping and deduplication. */
export interface RagNoteGroup {
  noteId: string
  noteTitle: string
  noteTags: string[]
  /** Similarity of the top chunk (used for note-level ranking). */
  topScore: number
  /** Accepted chunks after offset-delta deduplication, sorted desc by similarity. */
  chunks: RagChunk[]
  /** Number of chunks hidden by deduplication or the per-note cap. */
  hiddenCount: number
}
