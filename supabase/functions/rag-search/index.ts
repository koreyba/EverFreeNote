/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Deno runtime globals are not available in the Node.js TypeScript compiler
// used by the monorepo root checks.
// The `declare const Deno` below is kept for editor IntelliSense only.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"

import { getRagChunkBodyText } from "../../../core/rag/chunkTemplate.ts"
import {
  DEFAULT_RAG_EMBEDDING_MODEL,
  resolveRagEmbeddingModel,
} from "../../../core/rag/embeddingModels.ts"
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

type RagSearchResultChunk = {
  noteId: string
  noteTitle: string
  noteTags: string[]
  chunkIndex: number
  charOffset: number
  bodyContent: string
  overlapPrefix: string
  content: string
  similarity: number
}

type MatchNotesSearchContext = {
  supabaseAdmin: ReturnType<typeof createClient>
  supabaseUser: ReturnType<typeof createClient>
  userId: string
  queryEmbedding: number[]
  threshold: number
  topK: number
  tagFilter: string | null
  requestedMatchCount: number
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
const EMBEDDING_MODEL_MISMATCH_ERROR_CODE = "embedding_model_mismatch"
const EMBEDDING_MODEL_MISMATCH_ERROR_MESSAGE =
  "Embedding model changed. Please reindex your notes to enable search."
const GEMINI_TASK_TYPE_QUERY_MODELS = new Set<string>(["models/gemini-embedding-001"])

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
const cachedCryptoKeys = new Map<string, CryptoKey>()

class GeminiResponseParseError extends TypeError {}

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")

const getCryptoKey = async (secret: string): Promise<CryptoKey> => {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(secret))
  const secretHash = bytesToHex(new Uint8Array(digest))
  const cachedCryptoKey = cachedCryptoKeys.get(secretHash)
  if (cachedCryptoKey) return cachedCryptoKey

  const cryptoKey = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
  cachedCryptoKeys.set(secretHash, cryptoKey)
  return cryptoKey
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

const isRetryableFetchTypeError = (error: unknown) => {
  if (!(error instanceof TypeError) || error instanceof GeminiResponseParseError) return false

  const message = error.message.toLowerCase()
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("error sending request") ||
    message.includes("fetch failed")
  )
}

const shouldRetryNetworkError = (error: unknown) =>
  (error instanceof DOMException && error.name === "AbortError") || isRetryableFetchTypeError(error)

const buildEmbedQueryRequestBody = (query: string, embeddingModel: string) => {
  if (GEMINI_TASK_TYPE_QUERY_MODELS.has(embeddingModel)) {
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
    throw new GeminiResponseParseError("Gemini embedContent response missing embedding.values")
  }
  return values
}

const parseEmbedQueryErrorBody = async (response: Response) => {
  const rawBody = await response.text()
  return rawBody ? `<redacted:${rawBody.length} chars>` : "<empty>"
}

const getRetryDirective = (attempt: number, shouldRetry: boolean) =>
  shouldRetry && attempt < GEMINI_MAX_RETRIES ? "retry" : "fail"

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
        if (getRetryDirective(attempt, shouldRetryHttpStatus(response.status)) === "retry") {
          await waitForRetryBackoff(sleep, attempt)
          continue
        }
        const bodySummary = await parseEmbedQueryErrorBody(response)
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

  return resolveRagSearchSettings({
    embedding_model: resolveRagEmbeddingModel(ragIndexingSettingsRow?.embedding_model),
  }).embedding_model
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

const buildMatchNotesRpcPayload = (
  queryEmbedding: number[],
  matchCount: number,
  tagFilter: string | null
) =>
  tagFilter
    ? {
        query_embedding: queryEmbedding,
        match_count: matchCount,
        filter_tag: tagFilter,
      }
    : {
        query_embedding: queryEmbedding,
        match_count: matchCount,
      }

const runMatchNotesRpc = async (
  supabaseUser: ReturnType<typeof createClient>,
  queryEmbedding: number[],
  matchCount: number,
  tagFilter: string | null
) => {
  const { data, error } = await supabaseUser.rpc(
    "match_notes",
    buildMatchNotesRpcPayload(queryEmbedding, matchCount, tagFilter)
  )

  return {
    chunks: (data ?? []) as RagMatchedChunk[],
    rpcError: error,
  }
}

const getThresholdFilteredChunks = (chunks: RagMatchedChunk[], threshold: number) =>
  chunks.filter((chunk) => chunk.similarity >= threshold)

const buildVisibleSearchResults = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  chunks: RagMatchedChunk[],
  threshold: number,
  tagFilter: string | null
): Promise<RagSearchResultChunk[]> => {
  const filteredChunks = getThresholdFilteredChunks(chunks, threshold)
  if (filteredChunks.length === 0) return []

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

  return tagFilter ? result.filter((item) => item.noteTags.includes(tagFilter)) : result
}

const getNextLegacyFallbackMatchCount = (currentMatchCount: number) =>
  Math.min(
    READONLY_RAG_SETTINGS.max_top_k,
    Math.max(currentMatchCount + 1, currentMatchCount * 2)
  )

const hasExhaustedLegacyFallbackCandidates = (
  chunks: RagMatchedChunk[],
  requestedMatchCount: number
) =>
  chunks.length < requestedMatchCount || requestedMatchCount >= READONLY_RAG_SETTINGS.max_top_k

const executeMatchNotesSearch = async ({
  supabaseAdmin,
  supabaseUser,
  userId,
  queryEmbedding,
  threshold,
  topK,
  tagFilter,
  requestedMatchCount,
}: MatchNotesSearchContext): Promise<RagMatchedChunk[]> => {
  const primaryResult = await runMatchNotesRpc(supabaseUser, queryEmbedding, requestedMatchCount, tagFilter)
  if (!primaryResult.rpcError) {
    return primaryResult.chunks
  }

  if (!tagFilter || !isLegacyMatchNotesSignatureError(primaryResult.rpcError)) {
    console.error("[rag-search] match_notes RPC error", primaryResult.rpcError)
    throw createHttpError(500, "Search error")
  }

  console.warn("[rag-search] Using legacy match_notes fallback without filter_tag")
  let legacyMatchCount = getNextLegacyFallbackMatchCount(requestedMatchCount)

  while (true) {
    try {
      const fallbackResult = await runMatchNotesRpc(supabaseUser, queryEmbedding, legacyMatchCount, null)
      if (fallbackResult.rpcError) {
        console.error("[rag-search] match_notes fallback failed", {
          primaryRpcError: primaryResult.rpcError,
          fallbackRpcError: fallbackResult.rpcError,
        })
        throw createHttpError(500, "Search error")
      }

      const visibleResults = await buildVisibleSearchResults(
        supabaseAdmin,
        userId,
        fallbackResult.chunks,
        threshold,
        tagFilter
      )

      if (
        visibleResults.length >= topK ||
        hasExhaustedLegacyFallbackCandidates(fallbackResult.chunks, legacyMatchCount)
      ) {
        return fallbackResult.chunks
      }

      legacyMatchCount = getNextLegacyFallbackMatchCount(legacyMatchCount)
    } catch (fallbackErr) {
      console.error("[rag-search] match_notes fallback threw", {
        primaryRpcError: primaryResult.rpcError,
        fallbackErr,
      })
      throw createHttpError(500, "Search error")
    }
  }
}

const buildSearchResponse = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  chunks: RagMatchedChunk[],
  threshold: number,
  topK: number,
  tagFilter: string | null
) => {
  const visibleResult = await buildVisibleSearchResults(
    supabaseAdmin,
    userId,
    chunks,
    threshold,
    tagFilter
  )
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
      console.warn("[rag-search] embedding_model_mismatch", {
        userId,
        indexingEmbeddingModel,
        retrievalEmbeddingModel: ragSearchSettings.embedding_model,
      })
      return jsonResponse(
        {
          code: EMBEDDING_MODEL_MISMATCH_ERROR_CODE,
          error: EMBEDDING_MODEL_MISMATCH_ERROR_MESSAGE,
        },
        409
      )
    }

    const queryEmbedding = await embedQuery(query, geminiApiKey, ragSearchSettings.embedding_model)
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const chunks = await executeMatchNotesSearch({
      supabaseAdmin,
      supabaseUser,
      userId,
      queryEmbedding,
      threshold,
      topK,
      tagFilter,
      requestedMatchCount
    })
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
