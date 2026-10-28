import type { SupabaseClient } from '@supabase/supabase-js'
import { RAG_SEARCH_EDITABLE_DEFAULTS, RAG_SEARCH_TOP_K_MAX } from '../rag/searchSettings.ts'
import {
  groupChunksByNote,
  mapUnavailableResponse,
  type RagSearchChunk,
  type SemanticSearch,
  type SemanticSearchOutcome,
  type SemanticSearchParams,
} from './semanticSearch.ts'

/** Delegate embedding and vector search to the existing user-authenticated function. */
export const createRagSemanticSearch = (
  functionsOrigin: string,
  token: string,
  supabase: SupabaseClient,
  userId: string,
): SemanticSearch => ({
  async search(params: SemanticSearchParams): Promise<SemanticSearchOutcome> {
    let threshold = params.minSimilarity
    if (threshold === null) {
      const { data, error } = await supabase.from('user_rag_search_settings')
        .select('similarity_threshold').eq('user_id', userId).maybeSingle()
      if (error) throw error
      threshold = data?.similarity_threshold ?? RAG_SEARCH_EDITABLE_DEFAULTS.similarity_threshold
    }
    const response = await fetch(`${functionsOrigin}/functions/v1/rag-search`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: params.query,
        topK: Math.min(Math.max(params.limit, 1), RAG_SEARCH_TOP_K_MAX),
        threshold,
        ...(params.tag ? { filterTag: params.tag } : {}),
      }),
    })

    let body: unknown = null
    try {
      body = await response.json()
    } catch {
      body = null
    }
    if (!response.ok) {
      const unavailable = mapUnavailableResponse(response.status, body)
      if (unavailable) return unavailable
      const record = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {}
      const message = typeof record.error === 'string' ? record.error : `rag-search returned ${response.status}`
      throw new Error(message)
    }
    const chunks = (body as { chunks?: RagSearchChunk[] } | null)?.chunks ?? []
    return { status: 'ok', notes: groupChunksByNote(chunks, params.limit) }
  },
})
