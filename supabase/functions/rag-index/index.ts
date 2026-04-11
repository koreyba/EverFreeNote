/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Deno types (Deno.env, URL imports) are not available in the Node.js TypeScript
// compiler used by the monorepo. There is no deno.json / import_map.json in this project.
// The `declare const Deno` below is kept for editor IntelliSense only.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

import { buildRagIndexChunks } from "../../../core/rag/chunking.ts"
import { getRagReadonlySettings, resolveRagIndexingEditableSettings } from "../../../core/rag/indexingSettings.ts"

declare const Deno: { env: { get(key: string): string | undefined } }

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

// ---------------------------------------------------------------------------
// AES-GCM decryption (mirrors api-keys-upsert / wordpress-bridge pattern)
// ---------------------------------------------------------------------------
const textDecoder = new TextDecoder()
const _textEncoder = new TextEncoder()
let _cachedCryptoKey: CryptoKey | null = null
let _cachedSecretHash: string | null = null

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")

const _getCryptoKey = async (secret: string): Promise<CryptoKey> => {
  const digest = await crypto.subtle.digest("SHA-256", _textEncoder.encode(secret))
  const secretHash = bytesToHex(new Uint8Array(digest))

  if (_cachedCryptoKey && _cachedSecretHash === secretHash) return _cachedCryptoKey

  _cachedCryptoKey = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
  _cachedSecretHash = secretHash
  return _cachedCryptoKey
}

const base64ToBytes = (b64: string): Uint8Array => {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const decryptValue = async (encrypted: string, secret: string): Promise<string> => {
  const parts = encrypted.split(":")
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("Invalid encrypted payload format: expected 'iv:data'")
  }
  const [ivRaw, dataRaw] = parts
  const iv = base64ToBytes(ivRaw)
  const data = base64ToBytes(dataRaw)
  const key = await _getCryptoKey(secret)
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data)
  return textDecoder.decode(decrypted)
}

// ---------------------------------------------------------------------------
// Embeddings via Gemini REST API
// ---------------------------------------------------------------------------
async function embedTexts(
  texts: Array<{ text: string; title: string | null }>,
  apiKey: string,
  embeddingModel: string
): Promise<number[][]> {
  const requests = texts.map(({ text, title }) => ({
    model: embeddingModel,
    ...(title ? { title } : {}),
    content: { parts: [{ text }] },
    taskType: READONLY_RAG_SETTINGS.task_type_document,
    outputDimensionality: OUTPUT_DIMENSIONS,
  }))

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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
        const rawBody = await response.text()
        const bodySummary = rawBody ? `<redacted:${rawBody.length} chars>` : "<empty>"
        const retryable = response.status === 429 || response.status >= 500
        if (retryable && attempt < GEMINI_MAX_RETRIES) {
          const backoffMs = GEMINI_RETRY_BASE_MS * 2 ** (attempt - 1)
          await sleep(backoffMs)
          continue
        }
        throw new Error(
          `Gemini batchEmbedContents failed: status=${response.status} requestId=${requestId} response=${bodySummary}`
        )
      }

      const data = await response.json()
      if (!Array.isArray(data?.embeddings)) {
        throw new Error("Gemini batchEmbedContents response missing embeddings array")
      }
      if (data.embeddings.length !== requests.length) {
        throw new Error(
          `Gemini embeddings count mismatch: input=${requests.length} returned=${data.embeddings.length} requestId=${requestId}`
        )
      }

      return data.embeddings.map((embedding: { values: number[] }) => embedding.values)
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === "AbortError"
      const isNetwork = error instanceof TypeError
      if ((isAbort || isNetwork) && attempt < GEMINI_MAX_RETRIES) {
        const backoffMs = GEMINI_RETRY_BASE_MS * 2 ** (attempt - 1)
        await sleep(backoffMs)
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
// Main handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const encryptionSecret = Deno.env.get("AI_CREDENTIALS_KEY")

  if (!supabaseUrl || !serviceRoleKey || !encryptionSecret) {
    return jsonResponse({ error: "Function not configured" }, 500)
  }

  // Auth
  const authHeader = req.headers.get("Authorization")?.trim() ?? ""
  const token = readAuthToken(authHeader)
  if (!token) return jsonResponse({ error: "Unauthorized" }, 401)

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) return jsonResponse({ error: "Unauthorized" }, 401)
  const userId = userData.user.id

  let payload: { noteId?: string; action?: string; debugChunks?: boolean } = {}
  try { payload = await req.json() } catch { /* empty body */ }

  const { noteId, action, debugChunks } = payload
  if (!noteId || typeof noteId !== "string") {
    return jsonResponse({ error: "Missing noteId" }, 400)
  }
  if (action !== "index" && action !== "reindex" && action !== "delete") {
    return jsonResponse({ error: "action must be 'index', 'reindex', or 'delete'" }, 400)
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(noteId)) return jsonResponse({ error: "Invalid noteId" }, 400)

  try {
    if (action === "delete") {
      const { error } = await supabaseAdmin
        .from("note_embeddings")
        .delete()
        .eq("note_id", noteId)
        .eq("user_id", userId)
      if (error) throw error
      return jsonResponse({ outcome: "deleted", deleted: true })
    }

    const { data: apiKeyRow, error: apiKeyError } = await supabaseAdmin
      .from("user_api_keys")
      .select("gemini_api_key_encrypted")
      .eq("user_id", userId)
      .maybeSingle()

    if (apiKeyError) {
      console.error("[rag-index] Failed to fetch api key", apiKeyError)
      return jsonResponse({ error: "Internal error" }, 500)
    }
    if (!apiKeyRow?.gemini_api_key_encrypted) {
      return jsonResponse({ error: "Gemini API key not configured. Add it in Settings → Google API." }, 400)
    }

    let geminiApiKey: string
    try {
      geminiApiKey = await decryptValue(apiKeyRow.gemini_api_key_encrypted, encryptionSecret)
    } catch (err) {
      console.error("[rag-index] Failed to decrypt api key", err)
      return jsonResponse({ error: "Internal error" }, 500)
    }

    const { data: settingsRow, error: settingsError } = await supabaseAdmin
      .from("user_rag_index_settings")
      .select("target_chunk_size, min_chunk_size, max_chunk_size, overlap, use_title, use_section_headings, use_tags, embedding_model")
      .eq("user_id", userId)
      .maybeSingle()

    if (settingsError) throw settingsError

    const { data: note, error: noteError } = await supabaseAdmin
      .from("notes")
      .select("title, description, tags")
      .eq("id", noteId)
      .eq("user_id", userId)
      .maybeSingle()

    if (noteError) throw noteError
    if (!note) return jsonResponse({ error: "Note not found" }, 404)

    const settings = resolveRagIndexingEditableSettings(settingsRow ?? null)
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
      const { error: clearError } = await supabaseAdmin
        .from("note_embeddings")
        .delete()
        .eq("note_id", noteId)
        .eq("user_id", userId)
      if (clearError) throw clearError
      return jsonResponse({
        outcome: "skipped",
        reason: "too_short",
        chunkCount: 0,
        skipped: "too_short",
        message: `Note is too short for indexing (minimum: ${settings.min_chunk_size} characters)`,
      })
    }

    const vectors = await embedTexts(
      chunksForIndexing.map((chunk) => ({
        text: chunk.content,
        title: chunk.title,
      })),
      geminiApiKey,
      settings.embedding_model
    )

    if (vectors.length !== chunksForIndexing.length) {
      throw new Error(`Gemini returned ${vectors.length} vectors for ${chunksForIndexing.length} chunks`)
    }

    const indexedAt = new Date().toISOString()

    const rows = chunksForIndexing.map((chunk, index) => ({
      note_id: noteId,
      user_id: userId,
      chunk_index: index,
      char_offset: chunk.charOffset,
      content: chunk.content,
      body_content: chunk.bodyContent,
      overlap_prefix: chunk.overlapPrefix,
      embedding: vectors[index],
      indexed_at: indexedAt,
    }))

    const { error: upsertError } = await supabaseAdmin
      .from("note_embeddings")
      .upsert(rows, { onConflict: "note_id,chunk_index" })
    if (upsertError) throw upsertError

    const { error: cleanupError } = await supabaseAdmin
      .from("note_embeddings")
      .delete()
      .eq("note_id", noteId)
      .eq("user_id", userId)
      .gte("chunk_index", chunksForIndexing.length)
    if (cleanupError) throw cleanupError

    console.info("[rag-index] Indexed note with settings", {
      noteId,
      userId,
      chunkCount: chunksForIndexing.length,
      target_chunk_size: settings.target_chunk_size,
      min_chunk_size: settings.min_chunk_size,
      max_chunk_size: settings.max_chunk_size,
      overlap: settings.overlap,
      use_title: settings.use_title,
      use_section_headings: settings.use_section_headings,
      use_tags: settings.use_tags,
    })

    return jsonResponse({
      outcome: "indexed",
      chunkCount: chunksForIndexing.length,
      droppedChunks: droppedChunkCount > 0 ? droppedChunkCount : undefined,
      debugChunks: debugChunks
        ? chunksForIndexing.map((chunk, index) => ({
            chunkIndex: index,
            charOffset: chunk.charOffset,
            sectionHeading: chunk.sectionHeading,
            title: chunk.title,
            content: chunk.content,
            bodyContent: chunk.bodyContent,
            overlapPrefix: chunk.overlapPrefix,
          }))
        : undefined,
    })
  } catch (err) {
    console.error("[rag-index]", err)
    const isGeminiError = err instanceof Error && err.message.startsWith("Gemini")
    const userMessage = isGeminiError ? "Embedding service error - try again later" : "Internal error"
    return jsonResponse({ error: userMessage }, 500)
  }
})
