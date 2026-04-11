/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Deno runtime globals are not available in the Node.js TypeScript compiler
// used by the monorepo root checks.
// The `declare const Deno` below is kept for editor IntelliSense only.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"

import { getRagChunkBodyText } from "../../../core/rag/chunkTemplate.ts"
import { DEFAULT_RAG_EMBEDDING_MODEL } from "../../../core/rag/embeddingModels.ts"
import { getRagSearchReadonlySettings, resolveRagSearchSettings } from "../../../core/rag/searchSettings.ts"
import { isMissingEmbeddingModelColumnError } from "../_shared/errorDetection.ts"

declare const Deno: { env: { get(key: string): string | undefined } }

type RagMatchedChunk = {
  note_id: string
  chunk_index: number
  char_offset: number
  content: string
  body_content: string | null
  overlap_prefix: string | null
  similarity: number
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
const READONLY_RAG_SETTINGS = getRagSearchReadonlySettings()
const OUTPUT_DIMENSIONS = READONLY_RAG_SETTINGS.output_dimensionality
const GEMINI_TIMEOUT_MS = 10000
const GEMINI_MAX_RETRIES = 3
const GEMINI_RETRY_BASE_MS = 400

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

const readAuthToken = (authHeader: string): string =>
  authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice("bearer ".length).trim()
    : ""

const createHttpError = (status: number, message: string) => Object.assign(new Error(message), { status })

const isHttpError = (error: unknown): error is Error & { status: number } =>
  error instanceof Error && typeof (error as { status?: unknown }).status === "number"

const isLegacyMatchNotesSignatureError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false

  const code = typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code.toUpperCase()
    : ""
  if (code === "PGRST202") return true

  const message = typeof (error as { message?: unknown }).message === "string"
    ? (error as { message: string }).message
    : ""
  const details = typeof (error as { details?: unknown }).details === "string"
    ? (error as { details: string }).details
    : ""
  const combined = `${message} ${details}`.toLowerCase()

  return combined.includes("match_notes") && combined.includes("filter_tag") && combined.includes("function")
}

// ---------------------------------------------------------------------------
// AES-GCM decryption (mirrors rag-index pattern)
// ---------------------------------------------------------------------------
const textDecoder = new TextDecoder()
const textEncoder = new TextEncoder()
let cachedCryptoKey: CryptoKey | null = null

const getCryptoKey = async (secret: string): Promise<CryptoKey> => {
  if (cachedCryptoKey) return cachedCryptoKey
  const hash = await crypto.subtle.digest("SHA-256", textEncoder.encode(secret))
  cachedCryptoKey = await crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
  return cachedCryptoKey
}

const base64ToBytes = (b64: string): Uint8Array => {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.codePointAt(i) ?? 0
  return bytes
}

const decryptValue = async (encrypted: string, secret: string): Promise<string> => {
  const [ivRaw, dataRaw] = encrypted.split(":")
  const iv = base64ToBytes(ivRaw)
  const data = base64ToBytes(dataRaw)
  const key = await getCryptoKey(secret)
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data)
  return textDecoder.decode(decrypted)
}

// ---------------------------------------------------------------------------
// Gemini query embeddings
// ---------------------------------------------------------------------------
const waitForRetryBackoff = (sleep: (ms: number) => Promise<void>, attempt: number) =>
  sleep(GEMINI_RETRY_BASE_MS * 2 ** (attempt - 1))

const shouldRetryHttpStatus = (status: number) => status === 429 || status >= 500

const shouldRetryNetworkError = (error: unknown) =>
  (error instanceof DOMException && error.name === "AbortError") || error instanceof TypeError

const buildEmbedQueryRequestBody = (query: string, embeddingModel: string) => {
  if (embeddingModel === DEFAULT_RAG_EMBEDDING_MODEL) {
    return {
      model: embeddingModel,
      content: { parts: [{ text: query }] },
      taskType: READONLY_RAG_SETTINGS.task_type_query,
      outputDimensionality: OUTPUT_DIMENSIONS,
    }
  }

  return {
    model: embeddingModel,
    content: { parts: [{ text: `task: retrieval_query | ${query}` }] },
    outputDimensionality: OUTPUT_DIMENSIONS,
  }
}

const parseEmbeddingValues = (data: unknown): number[] => {
  const values = (data as { embedding?: { values?: unknown } } | null)?.embedding?.values
  if (!Array.isArray(values)) {
    throw new TypeError("Gemini embedContent response missing embedding.values")
  }
  return values
}

async function embedQuery(query: string, apiKey: string, embeddingModel: string): Promise<number[]> {
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
  // Gemini's stable embedding model accepts READONLY_RAG_SETTINGS.task_type_query
  // plus structured content, while the preview preset currently expects the
  // retrieval instruction to be prefixed into the text body itself. Both shapes
  // still request the same OUTPUT_DIMENSIONS so query embeddings stay in the
  // expected vector space for the active preset.
  const requestBody = buildEmbedQueryRequestBody(query, embeddingModel)

  for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/${embeddingModel}:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      )

      if (!response.ok) {
        const rawBody = await response.text()
        const bodySummary = rawBody ? `<redacted:${rawBody.length} chars>` : "<empty>"
        if (shouldRetryHttpStatus(response.status) && attempt < GEMINI_MAX_RETRIES) {
          await waitForRetryBackoff(sleep, attempt)
          continue
        }
        throw new Error(`Gemini embedContent failed: status=${response.status} response=${bodySummary}`)
      }

      return parseEmbeddingValues(await response.json())
    } catch (error) {
      if (shouldRetryNetworkError(error) && attempt < GEMINI_MAX_RETRIES) {
        await waitForRetryBackoff(sleep, attempt)
        continue
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  throw new Error("Gemini embedContent failed after retries")
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------
const getRagSearchRuntimeConfig = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const encryptionSecret = Deno.env.get("AI_CREDENTIALS_KEY")

  if (!supabaseUrl || !serviceRoleKey || !anonKey || !encryptionSecret) {
    throw createHttpError(500, "Function not configured")
  }

  return { supabaseUrl, serviceRoleKey, anonKey, encryptionSecret }
}

const readRagSearchPayload = async (req: Request) => {
  let payload: { query?: unknown; topK?: unknown; threshold?: unknown; filterTag?: unknown } = {}
  try { payload = await req.json() } catch { /* empty body */ }

  const { query, topK, threshold, filterTag } = payload

  if (typeof query !== "string" || query.trim().length === 0) {
    throw createHttpError(400, "Missing or empty query")
  }
  if (typeof topK !== "number" || !Number.isInteger(topK) || topK < 1 || topK > 100) {
    throw createHttpError(400, "topK must be an integer between 1 and 100")
  }
  if (typeof threshold !== "number" || threshold < 0 || threshold > 1) {
    throw createHttpError(400, "threshold must be a number between 0 and 1")
  }

  return {
    query: query.trim(),
    topK,
    threshold,
    tagFilter: typeof filterTag === "string" ? filterTag : null,
    requestedMatchCount: Math.min(
      topK + READONLY_RAG_SETTINGS.load_more_overfetch,
      READONLY_RAG_SETTINGS.max_top_k
    ),
  }
}

const authenticateRagSearchRequest = async (
  req: Request,
  supabaseUrl: string,
  serviceRoleKey: string
) => {
  const authHeader = req.headers.get("Authorization")?.trim() ?? ""
  const token = readAuthToken(authHeader)
  if (!token) throw createHttpError(401, "Unauthorized")

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) throw createHttpError(401, "Unauthorized")

  return { supabaseAdmin, token, userId: userData.user.id }
}

const loadGeminiApiKey = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  encryptionSecret: string
) => {
  const { data: apiKeyRow, error: apiKeyError } = await supabaseAdmin
    .from("user_api_keys")
    .select("gemini_api_key_encrypted")
    .eq("user_id", userId)
    .maybeSingle()

  if (apiKeyError) {
    console.error("[rag-search] Failed to fetch api key", apiKeyError)
    throw apiKeyError
  }
  if (!apiKeyRow?.gemini_api_key_encrypted) {
    throw createHttpError(400, "Gemini API key not configured. Add it in Settings > Google API.")
  }

  try {
    return await decryptValue(apiKeyRow.gemini_api_key_encrypted, encryptionSecret)
  } catch (error) {
    console.error("[rag-search] Failed to decrypt api key", error)
    throw error
  }
}

const loadStoredRagSearchSettings = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
) => {
  const { data: ragSearchSettingsRow, error: ragSearchSettingsError } = await supabaseAdmin
    .from("user_rag_search_settings")
    .select("top_k, similarity_threshold, embedding_model")
    .eq("user_id", userId)
    .maybeSingle()

  if (!ragSearchSettingsError) {
    return resolveRagSearchSettings(ragSearchSettingsRow ?? null)
  }

  if (!isMissingEmbeddingModelColumnError(ragSearchSettingsError)) {
    console.error("[rag-search] Failed to load retrieval settings", ragSearchSettingsError)
    throw ragSearchSettingsError
  }

  const { data: legacyRagSearchSettingsRow, error: legacyRagSearchSettingsError } = await supabaseAdmin
    .from("user_rag_search_settings")
    .select("top_k, similarity_threshold")
    .eq("user_id", userId)
    .maybeSingle()

  if (legacyRagSearchSettingsError) {
    console.error("[rag-search] Failed to load legacy retrieval settings", legacyRagSearchSettingsError)
    throw legacyRagSearchSettingsError
  }

  return resolveRagSearchSettings(legacyRagSearchSettingsRow ?? null)
}

const getIndexingEmbeddingModel = (
  ragIndexingSettingsError: unknown,
  ragIndexingSettingsRow: { embedding_model?: unknown } | null
) => {
  if (isMissingEmbeddingModelColumnError(ragIndexingSettingsError)) {
    return DEFAULT_RAG_EMBEDDING_MODEL
  }

  return typeof ragIndexingSettingsRow?.embedding_model === "string"
    ? ragIndexingSettingsRow.embedding_model
    : DEFAULT_RAG_EMBEDDING_MODEL
}

const loadStoredIndexingEmbeddingModel = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
) => {
  const { data: ragIndexingSettingsRow, error: ragIndexingSettingsError } = await supabaseAdmin
    .from("user_rag_index_settings")
    .select("embedding_model")
    .eq("user_id", userId)
    .maybeSingle()

  if (ragIndexingSettingsError && !isMissingEmbeddingModelColumnError(ragIndexingSettingsError)) {
    console.error("[rag-search] Failed to load indexing settings", ragIndexingSettingsError)
    throw ragIndexingSettingsError
  }

  return getIndexingEmbeddingModel(ragIndexingSettingsError, ragIndexingSettingsRow ?? null)
}

const executeMatchNotesSearch = async (
  supabaseUser: ReturnType<typeof createClient>,
  queryEmbedding: number[],
  tagFilter: string | null,
  requestedMatchCount: number
): Promise<RagMatchedChunk[]> => {
  const rpcPayload = tagFilter
    ? {
        query_embedding: queryEmbedding,
        match_count: requestedMatchCount,
        filter_tag: tagFilter,
      }
    : {
        query_embedding: queryEmbedding,
        match_count: requestedMatchCount,
      }

  let { data: chunks, error: rpcError } = await supabaseUser.rpc("match_notes", rpcPayload)

  if (rpcError && tagFilter && isLegacyMatchNotesSignatureError(rpcError)) {
    const primaryRpcError = rpcError
    try {
      const fallback = await supabaseUser.rpc("match_notes", {
        query_embedding: queryEmbedding,
        match_count: READONLY_RAG_SETTINGS.max_top_k,
      })
      chunks = fallback.data
      rpcError = fallback.error
      if (fallback.error) {
        console.error("[rag-search] match_notes fallback failed", {
          primaryRpcError,
          fallbackRpcError: fallback.error,
        })
      } else {
        console.warn("[rag-search] Using legacy match_notes fallback without filter_tag and expanding candidate window")
      }
    } catch (fallbackErr) {
      console.error("[rag-search] match_notes fallback threw", {
        primaryRpcError,
        fallbackErr,
      })
      rpcError = primaryRpcError
    }
  }

  if (rpcError) {
    console.error("[rag-search] match_notes RPC error", rpcError)
    throw createHttpError(500, "Search error")
  }

  return (chunks ?? []) as RagMatchedChunk[]
}

const buildSearchResponse = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  chunks: RagMatchedChunk[],
  threshold: number,
  topK: number,
  tagFilter: string | null
) => {
  const filteredChunks = chunks.filter((chunk) => chunk.similarity >= threshold)
  if (filteredChunks.length === 0) {
    return { chunks: [], availableChunkCount: 0, hasMore: false }
  }

  const noteIds = [...new Set(filteredChunks.map((chunk) => chunk.note_id))]
  const { data: notes, error: notesError } = await supabaseAdmin
    .from("notes")
    .select("id, title, tags")
    .in("id", noteIds)
    .eq("user_id", userId)

  if (notesError) {
    console.error("[rag-search] notes enrichment error", notesError)
    throw notesError
  }

  const noteMap = new Map((notes ?? []).map((note: {
    id: string
    title: string | null
    tags: string[]
  }) => [note.id, note]))

  const result = filteredChunks.map((chunk) => {
    const note = noteMap.get(chunk.note_id)
    return {
      noteId: chunk.note_id,
      noteTitle: note?.title ?? "",
      noteTags: note?.tags ?? [],
      chunkIndex: chunk.chunk_index,
      charOffset: chunk.char_offset,
      bodyContent: typeof chunk.body_content === "string" && chunk.body_content.trim().length > 0
        ? chunk.body_content
        : getRagChunkBodyText(chunk.content),
      overlapPrefix: typeof chunk.overlap_prefix === "string" ? chunk.overlap_prefix : "",
      content: chunk.content,
      similarity: chunk.similarity,
    }
  })

  const visibleResult = tagFilter ? result.filter((item) => item.noteTags.includes(tagFilter)) : result
  return {
    chunks: visibleResult.slice(0, topK),
    availableChunkCount: visibleResult.length,
    hasMore: visibleResult.length > topK,
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  try {
    const { supabaseUrl, serviceRoleKey, anonKey, encryptionSecret } = getRagSearchRuntimeConfig()
    const { query, topK, threshold, tagFilter, requestedMatchCount } = await readRagSearchPayload(req)
    const { supabaseAdmin, token, userId } = await authenticateRagSearchRequest(req, supabaseUrl, serviceRoleKey)
    const geminiApiKey = await loadGeminiApiKey(supabaseAdmin, userId, encryptionSecret)
    const ragSearchSettings = await loadStoredRagSearchSettings(supabaseAdmin, userId)
    const indexingEmbeddingModel = await loadStoredIndexingEmbeddingModel(supabaseAdmin, userId)

    if (indexingEmbeddingModel !== ragSearchSettings.embedding_model) {
      return jsonResponse(
        { error: "Embedding model mismatch between indexing and search. Re-index your notes with the current model first." },
        400
      )
    }

    const queryEmbedding = await embedQuery(query, geminiApiKey, ragSearchSettings.embedding_model)
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const chunks = await executeMatchNotesSearch(supabaseUser, queryEmbedding, tagFilter, requestedMatchCount)
    return jsonResponse(await buildSearchResponse(supabaseAdmin, userId, chunks, threshold, topK, tagFilter))
  } catch (err) {
    if (isHttpError(err)) {
      return jsonResponse({ error: err.message }, err.status)
    }
    console.error("[rag-search]", err)
    const isGeminiError = err instanceof Error && err.message.startsWith("Gemini")
    const userMessage = isGeminiError ? "Embedding service error - try again later" : "Internal error"
    return jsonResponse({ error: userMessage }, 500)
  }
})
