/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Deno types (Deno.env, URL imports) are not available in the Node.js TypeScript
// compiler used by the monorepo. There is no deno.json / import_map.json in this project.
// The `declare const Deno` below is kept for editor IntelliSense only.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

import { buildRagIndexChunks } from "../../../core/rag/chunking.ts"
import { getRagReadonlySettings, resolveRagIndexingEditableSettings } from "../../../core/rag/indexingSettings.ts"
import { isMissingEmbeddingModelColumnError } from "../_shared/errorDetection.ts"

declare const Deno: { env: { get(key: string): string | undefined } }

type RagIndexChunk = ReturnType<typeof buildRagIndexChunks>[number]

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
const READONLY_RAG_SETTINGS = getRagReadonlySettings()
const OUTPUT_DIMENSIONS = READONLY_RAG_SETTINGS.output_dimensionality
const MAX_CHUNKS_PER_NOTE = 128
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

// ---------------------------------------------------------------------------
// AES-GCM decryption (mirrors api-keys-upsert / wordpress-bridge pattern)
// ---------------------------------------------------------------------------
const textDecoder = new TextDecoder()
const textEncoder = new TextEncoder()
let cachedCryptoKey: CryptoKey | null = null
let cachedSecretHash: string | null = null

class GeminiResponseParseError extends TypeError {}

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")

const getCryptoKey = async (secret: string): Promise<CryptoKey> => {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(secret))
  const secretHash = bytesToHex(new Uint8Array(digest))

  if (cachedCryptoKey && cachedSecretHash === secretHash) return cachedCryptoKey

  cachedCryptoKey = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
  cachedSecretHash = secretHash
  return cachedCryptoKey
}

const base64ToBytes = (b64: string): Uint8Array => {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.codePointAt(i) ?? 0
  return bytes
}

const decryptValue = async (encrypted: string, secret: string): Promise<string> => {
  const parts = encrypted.split(":")
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new TypeError("Invalid encrypted payload format: expected 'iv:data'")
  }
  const [ivRaw, dataRaw] = parts
  const iv = base64ToBytes(ivRaw)
  const data = base64ToBytes(dataRaw)
  const key = await getCryptoKey(secret)
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data)
  return textDecoder.decode(decrypted)
}

// ---------------------------------------------------------------------------
// Embeddings via Gemini REST API
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

const buildBatchEmbedRequests = (
  texts: Array<{ text: string; title: string | null }>,
  embeddingModel: string
) => texts.map(({ text, title }) => ({
  model: embeddingModel,
  ...(title ? { title } : {}),
  content: { parts: [{ text }] },
  taskType: READONLY_RAG_SETTINGS.task_type_document,
  outputDimensionality: OUTPUT_DIMENSIONS,
}))

const parseBatchEmbedResponse = (data: unknown, expectedCount: number, requestId: string): number[][] => {
  const embeddings = (data as { embeddings?: unknown } | null)?.embeddings
  if (!Array.isArray(embeddings)) {
    throw new GeminiResponseParseError("Gemini batchEmbedContents response missing embeddings array")
  }
  if (embeddings.length !== expectedCount) {
    throw new Error(
      `Gemini embeddings count mismatch: input=${expectedCount} returned=${embeddings.length} requestId=${requestId}`
    )
  }
  return embeddings.map((embedding, index) => {
    const values = (embedding as { values?: unknown } | null)?.values
    if (!Array.isArray(values) || values.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
      throw new GeminiResponseParseError(
        `Gemini embedding at index ${index} is malformed: expected numeric values array requestId=${requestId}`
      )
    }
    return values
  })
}

const parseBatchEmbedErrorBody = async (response: Response) => {
  const rawBody = await response.text()
  return rawBody ? `<redacted:${rawBody.length} chars>` : "<empty>"
}

const getRetryDirective = (attempt: number, shouldRetry: boolean) =>
  shouldRetry && attempt < GEMINI_MAX_RETRIES ? "retry" : "fail"

async function embedTexts(
  texts: Array<{ text: string; title: string | null }>,
  apiKey: string,
  embeddingModel: string
): Promise<number[][]> {
  const requests = buildBatchEmbedRequests(texts, embeddingModel)
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

  for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/${embeddingModel}:batchEmbedContents?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requests }),
          signal: controller.signal,
        }
      )

      const requestId = response.headers.get("x-request-id") ?? "n/a"
      if (!response.ok) {
        if (getRetryDirective(attempt, shouldRetryHttpStatus(response.status)) === "retry") {
          await waitForRetryBackoff(sleep, attempt)
          continue
        }
        const bodySummary = await parseBatchEmbedErrorBody(response)
        throw new Error(
          `Gemini batchEmbedContents failed: status=${response.status} requestId=${requestId} response=${bodySummary}`
        )
      }

      return parseBatchEmbedResponse(await response.json(), requests.length, requestId)
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

  throw new Error("Gemini batchEmbedContents failed after retries")
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------
const getRagIndexRuntimeConfig = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const encryptionSecret = Deno.env.get("AI_CREDENTIALS_KEY")

  if (!supabaseUrl || !serviceRoleKey || !encryptionSecret) {
    throw createHttpError(500, "Function not configured")
  }

  return { supabaseUrl, serviceRoleKey, encryptionSecret }
}

const readRagIndexPayload = async (req: Request) => {
  let payload: { noteId?: string; action?: string; debugChunks?: boolean } = {}
  try {
    const parsedPayload = await req.json()
    payload = parsedPayload && typeof parsedPayload === "object" && !Array.isArray(parsedPayload)
      ? parsedPayload as typeof payload
      : {}
  } catch { /* empty body */ }

  const { noteId, action, debugChunks } = payload
  if (!noteId || typeof noteId !== "string") {
    throw createHttpError(400, "Missing noteId")
  }
  if (action !== "index" && action !== "reindex" && action !== "delete") {
    throw createHttpError(400, "action must be 'index', 'reindex', or 'delete'")
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(noteId)) {
    throw createHttpError(400, "Invalid noteId")
  }

  return { noteId, action, debugChunks: debugChunks === true }
}

const authenticateRagIndexRequest = async (
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

  return { supabaseAdmin, userId: userData.user.id }
}

const deleteNoteEmbeddings = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  noteId: string,
  userId: string
) => {
  const { error } = await supabaseAdmin
    .from("note_embeddings")
    .delete()
    .eq("note_id", noteId)
    .eq("user_id", userId)

  if (error) throw error
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
    console.error("[rag-index] Failed to fetch api key", apiKeyError)
    throw apiKeyError
  }
  if (!apiKeyRow?.gemini_api_key_encrypted) {
    throw createHttpError(400, "Gemini API key not configured. Add it in Settings > Google API.")
  }

  try {
    return await decryptValue(apiKeyRow.gemini_api_key_encrypted, encryptionSecret)
  } catch (error) {
    console.error("[rag-index] Failed to decrypt api key", error)
    throw error
  }
}

const loadIndexingSettings = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
) => {
  const { data: settingsRow, error: settingsError } = await supabaseAdmin
    .from("user_rag_index_settings")
    .select("target_chunk_size, min_chunk_size, max_chunk_size, overlap, use_title, use_section_headings, use_tags, embedding_model")
    .eq("user_id", userId)
    .maybeSingle()

  if (!settingsError) {
    return resolveRagIndexingEditableSettings(settingsRow ?? null)
  }
  if (!isMissingEmbeddingModelColumnError(settingsError)) {
    throw settingsError
  }

  const { data: legacySettingsRow, error: legacySettingsError } = await supabaseAdmin
    .from("user_rag_index_settings")
    .select("target_chunk_size, min_chunk_size, max_chunk_size, overlap, use_title, use_section_headings, use_tags")
    .eq("user_id", userId)
    .maybeSingle()

  if (legacySettingsError) throw legacySettingsError
  return resolveRagIndexingEditableSettings(legacySettingsRow ?? null)
}

const loadNoteForIndexing = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  noteId: string,
  userId: string
) => {
  const { data: note, error: noteError } = await supabaseAdmin
    .from("notes")
    .select("title, description, tags")
    .eq("id", noteId)
    .eq("user_id", userId)
    .maybeSingle()

  if (noteError) throw noteError
  if (!note) throw createHttpError(404, "Note not found")
  return note
}

const buildIndexRows = (chunksForIndexing: RagIndexChunk[], vectors: number[][]) =>
  chunksForIndexing.map((chunk, index) => ({
    chunk_index: index,
    char_offset: chunk.charOffset,
    content: chunk.content,
    body_content: chunk.bodyContent,
    overlap_prefix: chunk.overlapPrefix,
    embedding: vectors[index],
  }))

const buildDebugChunks = (chunksForIndexing: RagIndexChunk[]) =>
  chunksForIndexing.map((chunk, index) => ({
    chunkIndex: index,
    charOffset: chunk.charOffset,
    sectionHeading: chunk.sectionHeading,
    title: chunk.title,
    content: chunk.content,
    bodyContent: chunk.bodyContent,
    overlapPrefix: chunk.overlapPrefix,
  }))

const indexNote = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  noteId: string,
  userId: string,
  geminiApiKey: string,
  debugChunks: boolean
) => {
  const settings = await loadIndexingSettings(supabaseAdmin, userId)
  const note = await loadNoteForIndexing(supabaseAdmin, noteId, userId)
  const chunks = buildRagIndexChunks({
    title: note.title ?? "",
    html: note.description ?? "",
    tags: Array.isArray(note.tags) ? note.tags : [],
    settings,
  })

  const droppedChunkCount = Math.max(0, chunks.length - MAX_CHUNKS_PER_NOTE)
  const chunksForIndexing = droppedChunkCount > 0 ? chunks.slice(0, MAX_CHUNKS_PER_NOTE) : chunks

  if (droppedChunkCount > 0) {
    console.warn(
      `[rag-index] note ${noteId} produced ${chunks.length} chunks; processing first ${chunksForIndexing.length} and dropping ${droppedChunkCount}`
    )
  }

  if (chunksForIndexing.length === 0) {
    await deleteNoteEmbeddings(supabaseAdmin, noteId, userId)
    return {
      outcome: "skipped",
      reason: "too_short",
      chunkCount: 0,
      skipped: "too_short",
      message: `Note is too short for indexing (minimum: ${settings.min_chunk_size} characters)`,
    }
  }

  const vectors = await embedTexts(
    chunksForIndexing.map((chunk) => ({ text: chunk.content, title: chunk.title })),
    geminiApiKey,
    settings.embedding_model
  )

  if (vectors.length !== chunksForIndexing.length) {
    throw new Error(`Gemini returned ${vectors.length} vectors for ${chunksForIndexing.length} chunks`)
  }

  const { error: upsertError } = await supabaseAdmin.rpc("upsert_note_embeddings", {
    p_note_id: noteId,
    p_user_id: userId,
    p_rows: buildIndexRows(chunksForIndexing, vectors),
  })
  if (upsertError) throw upsertError

  console.info("[rag-index] Indexed note with settings", {
    chunkCount: chunksForIndexing.length,
    embedding_model: settings.embedding_model,
    target_chunk_size: settings.target_chunk_size,
    min_chunk_size: settings.min_chunk_size,
    max_chunk_size: settings.max_chunk_size,
    overlap: settings.overlap,
    use_title: settings.use_title,
    use_section_headings: settings.use_section_headings,
    use_tags: settings.use_tags,
  })

  return {
    outcome: "indexed",
    chunkCount: chunksForIndexing.length,
    droppedChunks: droppedChunkCount > 0 ? droppedChunkCount : undefined,
    debugChunks: debugChunks ? buildDebugChunks(chunksForIndexing) : undefined,
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
    const { supabaseUrl, serviceRoleKey, encryptionSecret } = getRagIndexRuntimeConfig()
    const { noteId, action, debugChunks } = await readRagIndexPayload(req)
    const { supabaseAdmin, userId } = await authenticateRagIndexRequest(req, supabaseUrl, serviceRoleKey)

    if (action === "delete") {
      await deleteNoteEmbeddings(supabaseAdmin, noteId, userId)
      return jsonResponse({ outcome: "deleted", deleted: true })
    }

    const geminiApiKey = await loadGeminiApiKey(supabaseAdmin, userId, encryptionSecret)
    return jsonResponse(await indexNote(supabaseAdmin, noteId, userId, geminiApiKey, debugChunks))
  } catch (err) {
    if (isHttpError(err)) {
      return jsonResponse({ error: err.message }, err.status)
    }
    console.error("[rag-index]", err)
    const isGeminiError = err instanceof Error && err.message.startsWith("Gemini")
    const userMessage = isGeminiError ? "Embedding service error - try again later" : "Internal error"
    return jsonResponse({ error: userMessage }, 500)
  }
})
