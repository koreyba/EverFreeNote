// Semantic search over the notebook's RAG index.
//
// The MCP server does not embed or query vectors itself. It delegates to the
// `rag-search` Edge Function, which already loads and decrypts the user's
// Gemini key, embeds the query and runs the pgvector match under RLS. This file
// holds the port the tool layer talks to and the pure mapping of that
// function's response; the network call lives in the Edge Function adapter.

/** One chunk as returned by the `rag-search` Edge Function. */
export type RagSearchChunk = {
  noteId: string
  noteTitle: string | null
  noteTags: string[] | null
  content: string | null
  similarity: number
}

export type SemanticSearchParams = {
  query: string
  /** Maximum number of notes to report back. */
  limit: number
  /** Overrides the user's configured similarity threshold when set. */
  minSimilarity: number | null
  /** Restricts the search to notes carrying this exact tag. */
  tag: string | null
}

export type SemanticNoteHit = {
  id: string
  title: string
  tags: string[]
  /** Similarity of this note's best matching chunk, 0..1. */
  similarity: number
  excerpts: string[]
}

/** Why semantic search cannot run right now. Each maps to a setup step for the user. */
export type SemanticSearchUnavailableReason = 'missing_api_key' | 'model_mismatch' | 'not_configured'

export type SemanticSearchOutcome =
  | { status: 'ok'; notes: SemanticNoteHit[] }
  | { status: 'unavailable'; reason: SemanticSearchUnavailableReason; message: string }

export interface SemanticSearch {
  search(params: SemanticSearchParams): Promise<SemanticSearchOutcome>
}

export const MAX_EXCERPTS_PER_NOTE = 3
export const MAX_EXCERPT_LENGTH = 300

function toExcerpt(content: string): string {
  const text = content.replace(/\s+/g, ' ').trim()
  if (text.length <= MAX_EXCERPT_LENGTH) return text
  return `${text.slice(0, MAX_EXCERPT_LENGTH - 1).trimEnd()}…`
}

function createHit(chunk: RagSearchChunk, excerpt: string): SemanticNoteHit {
  return {
    id: chunk.noteId,
    title: chunk.noteTitle ?? '',
    tags: Array.isArray(chunk.noteTags) ? chunk.noteTags : [],
    similarity: chunk.similarity,
    excerpts: excerpt ? [excerpt] : [],
  }
}

/** Folds another chunk of the same note in: best similarity wins, excerpts accumulate up to the cap. */
function mergeHit(hit: SemanticNoteHit, chunk: RagSearchChunk, excerpt: string): void {
  hit.similarity = Math.max(hit.similarity, chunk.similarity)

  const canTakeExcerpt = excerpt && hit.excerpts.length < MAX_EXCERPTS_PER_NOTE && !hit.excerpts.includes(excerpt)
  if (canTakeExcerpt) hit.excerpts.push(excerpt)
}

/**
 * Collapses chunk hits into one entry per note, ordered by the best matching
 * chunk. Agents get a shortlist to open with get_note rather than a wall of
 * chunk text, so only the strongest excerpts of each note are kept.
 */
export function groupChunksByNote(chunks: readonly RagSearchChunk[], limit: number): SemanticNoteHit[] {
  const byNote = new Map<string, SemanticNoteHit>()

  for (const chunk of chunks) {
    if (!chunk?.noteId) continue

    const excerpt = chunk.content ? toExcerpt(chunk.content) : ''
    const existing = byNote.get(chunk.noteId)

    if (existing) mergeHit(existing, chunk, excerpt)
    else byNote.set(chunk.noteId, createHit(chunk, excerpt))
  }

  return [...byNote.values()].sort((left, right) => right.similarity - left.similarity).slice(0, limit)
}

const MISSING_KEY_MESSAGE =
  'Semantic search needs a Gemini API key. Add one in EverFreeNote under Settings → Indexing (RAG), then try again.'
const MODEL_MISMATCH_MESSAGE =
  'The notes were indexed with a different embedding model than the one configured for search. Re-index the notebook in Settings → Indexing (RAG).'
const NOT_CONFIGURED_MESSAGE =
  'Semantic search is not available on this notebook. Check that AI indexing is set up in Settings → Indexing (RAG).'

/**
 * Recognises the `rag-search` failures that describe a setup gap rather than a
 * fault. Returns `null` when the response is a genuine error the caller should
 * surface as a tool failure.
 */
export function mapUnavailableResponse(status: number, body: unknown): SemanticSearchOutcome | null {
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
  const message = typeof record.error === 'string' ? record.error : ''
  const code = typeof record.code === 'string' ? record.code : ''

  if (status === 409 || code.toLowerCase().includes('embedding_model')) {
    return { status: 'unavailable', reason: 'model_mismatch', message: MODEL_MISMATCH_MESSAGE }
  }

  if (status === 400 && message.toLowerCase().includes('api key')) {
    return { status: 'unavailable', reason: 'missing_api_key', message: MISSING_KEY_MESSAGE }
  }

  if (status === 404) {
    return { status: 'unavailable', reason: 'not_configured', message: NOT_CONFIGURED_MESSAGE }
  }

  return null
}

/** Message describing why a successful search returned nothing. */
export function describeEmptyResult(threshold: number | null): string {
  return threshold === null
    ? 'No notes passed the similarity threshold configured for this notebook.'
    : `No notes reached a similarity of ${threshold}.`
}
