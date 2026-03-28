/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Deno runtime globals are not available in the Node.js TypeScript compiler
// used by the monorepo root checks.
// The `declare const Deno` below is kept for editor IntelliSense only.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"

import { getRagChunkBodyText } from "../../../core/rag/chunkTemplate.ts"
import { getRagSearchReadonlySettings } from "../../../core/rag/searchSettings.ts"

declare const Deno: { env: { get(key: string): string | undefined } }

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
const EMBEDDING_MODEL = "models/gemini-embedding-001"
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
const _textEncoder = new TextEncoder()
let _cachedCryptoKey: CryptoKey | null = null

const _getCryptoKey = async (secret: string): Promise<CryptoKey> => {
  if (_cachedCryptoKey) return _cachedCryptoKey
  const hash = await crypto.subtle.digest("SHA-256", _textEncoder.encode(secret))
  _cachedCryptoKey = await crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
  return _cachedCryptoKey
}

const base64ToBytes = (b64: string): Uint8Array => {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const decryptValue = async (encrypted: string, secret: string): Promise<string> => {
  const [ivRaw, dataRaw] = encrypted.split(":")
  const iv = base64ToBytes(ivRaw)
  const data = base64ToBytes(dataRaw)
  const key = await _getCryptoKey(secret)
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data)
  return textDecoder.decode(decrypted)
}

// ---------------------------------------------------------------------------
// Single-text embedding via Gemini REST API (RETRIEVAL_QUERY task type)
// ---------------------------------------------------------------------------
async function embedQuery(query: string, apiKey: string): Promise<number[]> {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: EMBEDDING_MODEL,
            content: { parts: [{ text: query }] },
            taskType: READONLY_RAG_SETTINGS.task_type_query,
            outputDimensionality: OUTPUT_DIMENSIONS,
          }),
          signal: controller.signal,
        }
      )

      if (!response.ok) {
        const rawBody = await response.text()
        const bodySummary = rawBody ? `<redacted:${rawBody.length} chars>` : "<empty>"
        const retryable = response.status === 429 || response.status >= 500
        if (retryable && attempt < GEMINI_MAX_RETRIES) {
          await sleep(GEMINI_RETRY_BASE_MS * 2 ** (attempt - 1))
          continue
        }
        throw new Error(`Gemini embedContent failed: status=${response.status} response=${bodySummary}`)
      }

      const data = await response.json()
      const values = data?.embedding?.values
      if (!Array.isArray(values)) {
        throw new Error("Gemini embedContent response missing embedding.values")
      }
      return values
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === "AbortError"
      const isNetwork = error instanceof TypeError
      if ((isAbort || isNetwork) && attempt < GEMINI_MAX_RETRIES) {
        await sleep(GEMINI_RETRY_BASE_MS * 2 ** (attempt - 1))
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
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const encryptionSecret = Deno.env.get("AI_CREDENTIALS_KEY")

  if (!supabaseUrl || !serviceRoleKey || !anonKey || !encryptionSecret) {
    return jsonResponse({ error: "Function not configured" }, 500)
  }

  const authHeader = req.headers.get("Authorization")?.trim() ?? ""
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
  const token = (bearerMatch ? bearerMatch[1] : authHeader).trim()
  if (!token) return jsonResponse({ error: "Unauthorized" }, 401)

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) return jsonResponse({ error: "Unauthorized" }, 401)
  const userId = userData.user.id

  let payload: { query?: unknown; topK?: unknown; threshold?: unknown; filterTag?: unknown } = {}
  try { payload = await req.json() } catch { /* empty body */ }

  const { query, topK, threshold, filterTag } = payload

  if (typeof query !== "string" || query.trim().length === 0) {
    return jsonResponse({ error: "Missing or empty query" }, 400)
  }
  if (typeof topK !== "number" || !Number.isInteger(topK) || topK < 1 || topK > 100) {
    return jsonResponse({ error: "topK must be an integer between 1 and 100" }, 400)
  }
  if (typeof threshold !== "number" || threshold < 0 || threshold > 1) {
    return jsonResponse({ error: "threshold must be a number between 0 and 1" }, 400)
  }
  const tagFilter: string | null = typeof filterTag === "string" ? filterTag : null
  const requestedMatchCount = Math.min(
    topK + READONLY_RAG_SETTINGS.load_more_overfetch,
    READONLY_RAG_SETTINGS.max_top_k
  )

  try {
    const { data: apiKeyRow, error: apiKeyError } = await supabaseAdmin
      .from("user_api_keys")
      .select("gemini_api_key_encrypted")
      .eq("user_id", userId)
      .maybeSingle()

    if (apiKeyError) {
      console.error("[rag-search] Failed to fetch api key", apiKeyError)
      return jsonResponse({ error: "Internal error" }, 500)
    }
    if (!apiKeyRow?.gemini_api_key_encrypted) {
      return jsonResponse({ error: "Gemini API key not configured. Add it in Settings → Google API." }, 400)
    }

    let geminiApiKey: string
    try {
      geminiApiKey = await decryptValue(apiKeyRow.gemini_api_key_encrypted, encryptionSecret)
    } catch (err) {
      console.error("[rag-search] Failed to decrypt api key", err)
      return jsonResponse({ error: "Internal error" }, 500)
    }

    const queryEmbedding = await embedQuery(query.trim(), geminiApiKey)

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

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
          match_count: requestedMatchCount,
        })
        chunks = fallback.data
        rpcError = fallback.error
        if (!fallback.error) {
          console.warn("[rag-search] Using legacy match_notes fallback without filter_tag")
        } else {
          console.error("[rag-search] match_notes fallback failed", {
            primaryRpcError,
            fallbackRpcError: fallback.error,
          })
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
      return jsonResponse({ error: "Search error" }, 500)
    }

    if (!chunks || chunks.length === 0) {
      return jsonResponse({ chunks: [], availableChunkCount: 0, hasMore: false })
    }

    const filteredChunks = (chunks as Array<{
      note_id: string
      chunk_index: number
      char_offset: number
      content: string
      body_content: string | null
      overlap_prefix: string | null
      similarity: number
    }>).filter((chunk) => chunk.similarity >= threshold)

    if (filteredChunks.length === 0) {
      return jsonResponse({ chunks: [], availableChunkCount: 0, hasMore: false })
    }

    const noteIds = [...new Set(filteredChunks.map((chunk) => chunk.note_id))]
    const { data: notes, error: notesError } = await supabaseAdmin
      .from("notes")
      .select("id, title, tags")
      .in("id", noteIds)
      .eq("user_id", userId)

    if (notesError) {
      console.error("[rag-search] notes enrichment error", notesError)
      return jsonResponse({ error: "Internal error" }, 500)
    }

    const noteMap = new Map((
      notes ?? []
    ).map((note: {
      id: string
      title: string | null
      tags: string[]
    }) => [note.id, note]))

    const result = filteredChunks.map((chunk) => {
      const note = noteMap.get(chunk.note_id)
      const bodyContent = typeof chunk.body_content === "string" && chunk.body_content.trim().length > 0
        ? chunk.body_content
        : getRagChunkBodyText(chunk.content)
      const overlapPrefix = typeof chunk.overlap_prefix === "string"
        ? chunk.overlap_prefix
        : ""

      return {
        noteId: chunk.note_id,
        noteTitle: note?.title ?? "",
        noteTags: note?.tags ?? [],
        chunkIndex: chunk.chunk_index,
        charOffset: chunk.char_offset,
        bodyContent,
        overlapPrefix,
        content: chunk.content,
        similarity: chunk.similarity,
      }
    })

    const filteredResult = tagFilter ? result.filter((item) => item.noteTags.includes(tagFilter)) : result
    const hasMore = filteredResult.length > topK
    const finalResult = filteredResult.slice(0, topK)
    return jsonResponse({
      chunks: finalResult,
      availableChunkCount: filteredResult.length,
      hasMore,
    })
  } catch (err) {
    console.error("[rag-search]", err)
    const isGeminiError = err instanceof Error && err.message.startsWith("Gemini")
    const userMessage = isGeminiError ? "Embedding service error - try again later" : "Internal error"
    return jsonResponse({ error: userMessage }, 500)
  }
})
