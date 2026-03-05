/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Deno types (Deno.env, URL imports) are not available in the Node.js TypeScript
// compiler used by the monorepo. There is no deno.json / import_map.json in this project.
// The `declare const Deno` below is kept for editor IntelliSense only.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

declare const Deno: { env: { get(key: string): string | undefined } }

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
const EMBEDDING_MODEL = "models/gemini-embedding-001"
const OUTPUT_DIMENSIONS = 1536
const CHUNK_SIZE = 1500
const CHUNK_OVERLAP = 200
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

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function chunkText(text: string): Array<{ content: string; charOffset: number }> {
  if (!text.trim()) return []
  const chunks: Array<{ content: string; charOffset: number }> = []
  let offset = 0
  while (offset < text.length) {
    const content = text.slice(offset, offset + CHUNK_SIZE)
    chunks.push({ content, charOffset: offset })
    if (content.length < CHUNK_SIZE) break
    const next = offset + CHUNK_SIZE - CHUNK_OVERLAP
    // Stop if the next window would start beyond the end of the text —
    // that would produce a chunk containing only already-covered overlap.
    if (next >= text.length) break
    offset = next
  }
  return chunks
}

function prepareNoteText(title: string, html: string): string {
  const body = stripHtml(html)
  return title.trim() ? `${title.trim()} ${body}` : body
}

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
async function embedTexts(texts: string[], apiKey: string): Promise<number[][]> {
  const requests = texts.map((text) => ({
    model: EMBEDDING_MODEL,
    content: { parts: [{ text }] },
    taskType: "RETRIEVAL_DOCUMENT",
    outputDimensionality: OUTPUT_DIMENSIONS,
  }))

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/${EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`,
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
      if (data.embeddings.length !== texts.length) {
        throw new Error(
          `Gemini embeddings count mismatch: input=${texts.length} returned=${data.embeddings.length} requestId=${requestId}`
        )
      }

      return data.embeddings.map((e: { values: number[] }) => e.values)
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
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
  const token = (bearerMatch ? bearerMatch[1] : authHeader).trim()
  if (!token) return jsonResponse({ error: "Unauthorized" }, 401)

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) return jsonResponse({ error: "Unauthorized" }, 401)
  const userId = userData.user.id

  // Parse body
  let payload: { noteId?: string; action?: string } = {}
  try { payload = await req.json() } catch { /* empty body */ }

  const { noteId, action } = payload
  if (!noteId || typeof noteId !== "string") {
    return jsonResponse({ error: "Missing noteId" }, 400)
  }
  if (action !== "index" && action !== "reindex" && action !== "delete") {
    return jsonResponse({ error: "action must be 'index', 'reindex', or 'delete'" }, 400)
  }

  // Verify note ownership
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(noteId)) return jsonResponse({ error: "Invalid noteId" }, 400)

  try {
    // Delete does not need the Gemini API key — handle it before the key lookup.
    if (action === "delete") {
      const { error } = await supabaseAdmin
        .from("note_embeddings")
        .delete()
        .eq("note_id", noteId)
        .eq("user_id", userId)
      if (error) throw error
      return jsonResponse({ deleted: true })
    }

    // action === "index" | "reindex" — fetch and decrypt the user's Gemini API key.
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
      return jsonResponse({ error: "Gemini API key not configured. Add it in Settings → API Keys." }, 400)
    }

    let geminiApiKey: string
    try {
      geminiApiKey = await decryptValue(apiKeyRow.gemini_api_key_encrypted, encryptionSecret)
    } catch (err) {
      console.error("[rag-index] Failed to decrypt api key", err)
      return jsonResponse({ error: "Internal error" }, 500)
    }

    const { data: note, error: noteError } = await supabaseAdmin
      .from("notes")
      .select("title, description")
      .eq("id", noteId)
      .eq("user_id", userId)
      .maybeSingle()

    if (noteError) throw noteError
    if (!note) return jsonResponse({ error: "Note not found" }, 404)

    const text = prepareNoteText(note.title ?? "", note.description ?? "")
    const chunks = chunkText(text)
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
      return jsonResponse({ chunkCount: 0 })
    }

    // Embed
    const vectors = await embedTexts(chunksForIndexing.map((c) => c.content), geminiApiKey)
    if (vectors.length !== chunksForIndexing.length) {
      throw new Error(`Gemini returned ${vectors.length} vectors for ${chunksForIndexing.length} chunks`)
    }

    // Upsert first so failed re-index never deletes a previously searchable note.
    const rows = chunksForIndexing.map((chunk, i) => ({
      note_id: noteId,
      user_id: userId,
      chunk_index: i,
      char_offset: chunk.charOffset,
      content: chunk.content,
      embedding: vectors[i],
    }))

    const { error: upsertError } = await supabaseAdmin
      .from("note_embeddings")
      .upsert(rows, { onConflict: "note_id,chunk_index" })
    if (upsertError) throw upsertError

    // Remove obsolete tail chunks when note becomes shorter after edits.
    const { error: cleanupError } = await supabaseAdmin
      .from("note_embeddings")
      .delete()
      .eq("note_id", noteId)
      .eq("user_id", userId)
      .gte("chunk_index", chunksForIndexing.length)
    if (cleanupError) throw cleanupError

    return jsonResponse({
      chunkCount: chunksForIndexing.length,
      droppedChunks: droppedChunkCount > 0 ? droppedChunkCount : undefined,
    })
  } catch (err) {
    console.error("[rag-index]", err)
    const isGeminiError = err instanceof Error && err.message.startsWith("Gemini")
    const userMessage = isGeminiError ? "Embedding service error - try again later" : "Internal error"
    return jsonResponse({ error: userMessage }, 500)
  }
})
