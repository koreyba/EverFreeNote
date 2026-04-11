/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"

import {
  assertValidRagIndexingEditableSettings,
  coerceRagIndexingEditableSettings,
  resolveRagIndexingSettings,
} from "@core/rag/indexingSettings.ts"
import {
  assertValidRagSearchEditableSettings,
  coerceRagSearchEditableSettings,
  resolveRagSearchEditableSettings,
  resolveRagSearchSettings,
} from "@core/rag/searchSettings.ts"
import { isMissingEmbeddingModelColumnError } from "../_shared/errorDetection.ts"

declare const Deno: { env: { get(key: string): string | undefined } }

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

const isUnavailableSettingsStorageError = (
  error: unknown,
  storageIdentifiers: readonly string[]
): boolean => {
  if (!error || typeof error !== "object") return false

  const code = typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code.toUpperCase()
    : ""

  if (code === "42P01" || code === "42883" || code === "PGRST205" || code === "PGRST202") return true

  const message = typeof (error as { message?: unknown }).message === "string"
    ? (error as { message: string }).message
    : ""
  const details = typeof (error as { details?: unknown }).details === "string"
    ? (error as { details: string }).details
    : ""
  const combined = `${message} ${details}`.toLowerCase()

  return (
    storageIdentifiers.some((identifier) => combined.includes(identifier)) &&
    (
      combined.includes("relation") ||
      combined.includes("table") ||
      combined.includes("schema cache") ||
      combined.includes("function") ||
      combined.includes("does not exist")
    )
  )
}

const isUnavailableRagSearchSettingsStorageError = (error: unknown): boolean =>
  isUnavailableSettingsStorageError(error, [
    "user_rag_search_settings",
    "upsert_user_rag_search_settings_partial",
  ])

const isUnavailableRagIndexingSettingsStorageError = (error: unknown): boolean =>
  isUnavailableSettingsStorageError(error, ["user_rag_index_settings"])

// ---------------------------------------------------------------------------
// AES-GCM encryption (same pattern as wordpress-settings-upsert)
// ---------------------------------------------------------------------------
const textEncoder = new TextEncoder()
let cachedCryptoKey: CryptoKey | null = null
let cachedSecretHash: string | null = null

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

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

const encryptValue = async (value: string, secret: string): Promise<string> => {
  const key = await getCryptoKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, textEncoder.encode(value))
  return `${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(encrypted))}`
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405)

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const encryptionSecret = Deno.env.get("AI_CREDENTIALS_KEY")
    if (!supabaseUrl || !serviceRoleKey || !encryptionSecret) {
      return jsonResponse({ error: "Function not configured" }, 500)
    }

    const authHeader = req.headers.get("Authorization")?.trim() ?? ""
    const token = readAuthToken(authHeader)
    if (!token) return jsonResponse({ error: "Unauthorized" }, 401)

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) return jsonResponse({ error: "Unauthorized" }, 401)
    const userId = userData.user.id

    let payload: Record<string, unknown> = {}
    const rawBody = await req.text()
    if (rawBody.trim()) {
      try {
        const parsed = JSON.parse(rawBody)
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          return jsonResponse({ error: "Request body must be a JSON object" }, 400)
        }
        payload = parsed as Record<string, unknown>
      } catch {
        return jsonResponse({ error: "Malformed JSON body" }, 400)
      }
    }

    if ("geminiApiKey" in payload && typeof payload.geminiApiKey !== "string") {
      return jsonResponse({ error: "geminiApiKey must be a string" }, 400)
    }
    if ("removeGeminiApiKey" in payload && typeof payload.removeGeminiApiKey !== "boolean") {
      return jsonResponse({ error: "removeGeminiApiKey must be a boolean" }, 400)
    }

    const hasGeminiApiKeyField = "geminiApiKey" in payload
    const shouldRemoveGeminiApiKey = payload.removeGeminiApiKey === true
    const rawGeminiKey = typeof payload.geminiApiKey === "string" ? payload.geminiApiKey.trim() : ""
    const coercedRagIndexingSettings = coerceRagIndexingEditableSettings(payload)
    const hasRagIndexingFields = Object.keys(coercedRagIndexingSettings).length > 0
    const coercedRagSearchSettings = coerceRagSearchEditableSettings(payload)
    const hasRagSearchFields = Object.keys(coercedRagSearchSettings).length > 0

    if (shouldRemoveGeminiApiKey && rawGeminiKey) {
      return jsonResponse({ error: "Provide either geminiApiKey or removeGeminiApiKey, not both" }, 400)
    }

    const MAX_GEMINI_KEY_LENGTH = 256
    if (rawGeminiKey.length > MAX_GEMINI_KEY_LENGTH) {
      return jsonResponse({ error: `Gemini API key must not exceed ${MAX_GEMINI_KEY_LENGTH} characters` }, 400)
    }

    if (!hasGeminiApiKeyField && !shouldRemoveGeminiApiKey && !hasRagIndexingFields && !hasRagSearchFields) {
      return jsonResponse({ error: "No Google API settings changes provided" }, 400)
    }

    // Fetch existing row to support "keep existing key" on empty input
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("user_api_keys")
      .select("gemini_api_key_encrypted")
      .eq("user_id", userId)
      .maybeSingle()

    if (fetchError) throw fetchError

    let encryptedKey = existing?.gemini_api_key_encrypted ?? null

    if (shouldRemoveGeminiApiKey) {
      encryptedKey = null
    } else if (hasGeminiApiKeyField && rawGeminiKey) {
      encryptedKey = await encryptValue(rawGeminiKey, encryptionSecret)
    }

    if (hasGeminiApiKeyField && !shouldRemoveGeminiApiKey && !encryptedKey && !hasRagIndexingFields && !hasRagSearchFields) {
      return jsonResponse({ error: "Gemini API key is required for initial setup" }, 400)
    }

    let validatedRagIndexingSettings
    if (hasRagIndexingFields) {
      try {
        validatedRagIndexingSettings = assertValidRagIndexingEditableSettings(coercedRagIndexingSettings)
      } catch (validationError) {
        return jsonResponse({
          error: validationError instanceof Error ? validationError.message : "Invalid RAG indexing settings",
        }, 400)
      }
    }

    let validatedRagSearchSettings
    if (hasRagSearchFields) {
      const { data: existingRagSearchData, error: existingRagSearchError } = await supabaseAdmin
        .from("user_rag_search_settings")
        .select("top_k, similarity_threshold, embedding_model")
        .eq("user_id", userId)
        .maybeSingle()

      let existingRagSearchSettingsRow = existingRagSearchData

      if (existingRagSearchError && isMissingEmbeddingModelColumnError(existingRagSearchError)) {
        const { data: legacyRagSearchData, error: legacyRagSearchError } = await supabaseAdmin
          .from("user_rag_search_settings")
          .select("top_k, similarity_threshold")
          .eq("user_id", userId)
          .maybeSingle()

        if (legacyRagSearchError) {
          if (isUnavailableRagSearchSettingsStorageError(legacyRagSearchError)) {
            return jsonResponse(
              { error: "RAG retrieval settings are unavailable until the latest database migration is applied" },
              503
            )
          }
          throw legacyRagSearchError
        }

        existingRagSearchSettingsRow = legacyRagSearchData
      } else if (existingRagSearchError) {
        if (isUnavailableRagSearchSettingsStorageError(existingRagSearchError)) {
          return jsonResponse(
            { error: "RAG retrieval settings are unavailable until the latest database migration is applied" },
            503
          )
        }
        throw existingRagSearchError
      }

      try {
        const mergedRagSearchSettings = {
          ...resolveRagSearchEditableSettings(existingRagSearchSettingsRow ?? null),
          ...coercedRagSearchSettings,
        }
        validatedRagSearchSettings = assertValidRagSearchEditableSettings(
          mergedRagSearchSettings
        )
      } catch (validationError) {
        return jsonResponse({
          error: validationError instanceof Error ? validationError.message : "Invalid RAG retrieval settings",
        }, 400)
      }
    }

    let resolvedRagIndexingSettings
    if (hasRagIndexingFields) {
      const { error: ragUpsertError } = await supabaseAdmin
        .from("user_rag_index_settings")
        .upsert({ user_id: userId, ...validatedRagIndexingSettings, updated_at: new Date().toISOString() }, { onConflict: "user_id" })

      if (ragUpsertError) {
        if (isMissingEmbeddingModelColumnError(ragUpsertError)) {
          return jsonResponse(
            { error: "RAG indexing settings are unavailable until the latest database migration is applied" },
            503
          )
        }
        throw ragUpsertError
      }
      resolvedRagIndexingSettings = resolveRagIndexingSettings(validatedRagIndexingSettings)
    } else {
      const { data: ragIndexingData, error: ragIndexingError } = await supabaseAdmin
        .from("user_rag_index_settings")
        .select("target_chunk_size, min_chunk_size, max_chunk_size, overlap, use_title, use_section_headings, use_tags, embedding_model")
        .eq("user_id", userId)
        .maybeSingle()

      if (ragIndexingError && isMissingEmbeddingModelColumnError(ragIndexingError)) {
        const { data: legacyRagIndexingData, error: legacyRagIndexingError } = await supabaseAdmin
          .from("user_rag_index_settings")
          .select("target_chunk_size, min_chunk_size, max_chunk_size, overlap, use_title, use_section_headings, use_tags")
          .eq("user_id", userId)
          .maybeSingle()

        if (legacyRagIndexingError) {
          if (isUnavailableRagIndexingSettingsStorageError(legacyRagIndexingError)) {
            console.warn("[api-keys-upsert] Falling back to default RAG indexing settings", legacyRagIndexingError)
            resolvedRagIndexingSettings = resolveRagIndexingSettings(null)
          } else {
            throw legacyRagIndexingError
          }
        } else {
          resolvedRagIndexingSettings = resolveRagIndexingSettings(legacyRagIndexingData ?? null)
        }
      } else if (ragIndexingError) {
        throw ragIndexingError
      } else {
        resolvedRagIndexingSettings = resolveRagIndexingSettings(ragIndexingData ?? null)
      }
    }

    let resolvedRagSearchSettings
    if (hasRagSearchFields) {
      const { data: ragSearchUpsertData, error: ragSearchUpsertError } = await supabaseAdmin
        .rpc("upsert_user_rag_search_settings_partial", {
          p_user_id: userId,
          p_top_k: "top_k" in coercedRagSearchSettings ? validatedRagSearchSettings.top_k : null,
          p_similarity_threshold: "similarity_threshold" in coercedRagSearchSettings
            ? validatedRagSearchSettings.similarity_threshold
            : null,
          p_embedding_model: "embedding_model" in coercedRagSearchSettings
            ? validatedRagSearchSettings.embedding_model
            : null,
        })
        .single()

      if (ragSearchUpsertError) {
        if (isUnavailableRagSearchSettingsStorageError(ragSearchUpsertError)) {
          return jsonResponse(
            { error: "RAG retrieval settings are unavailable until the latest database migration is applied" },
            503
          )
        }
        throw ragSearchUpsertError
      }
      resolvedRagSearchSettings = resolveRagSearchSettings(ragSearchUpsertData)
    } else {
      const { data: ragSearchData, error: ragSearchError } = await supabaseAdmin
        .from("user_rag_search_settings")
        .select("top_k, similarity_threshold, embedding_model")
        .eq("user_id", userId)
        .maybeSingle()

      if (ragSearchError && isMissingEmbeddingModelColumnError(ragSearchError)) {
        const { data: legacyRagSearchData, error: legacyRagSearchError } = await supabaseAdmin
          .from("user_rag_search_settings")
          .select("top_k, similarity_threshold")
          .eq("user_id", userId)
          .maybeSingle()

        if (legacyRagSearchError) {
          if (isUnavailableRagSearchSettingsStorageError(legacyRagSearchError)) {
            console.warn("[api-keys-upsert] Falling back to default RAG retrieval settings", legacyRagSearchError)
            resolvedRagSearchSettings = resolveRagSearchSettings(null)
          } else {
            throw legacyRagSearchError
          }
        } else {
          resolvedRagSearchSettings = resolveRagSearchSettings(legacyRagSearchData ?? null)
        }
      } else if (ragSearchError) {
        if (isUnavailableRagSearchSettingsStorageError(ragSearchError)) {
          console.warn("[api-keys-upsert] Falling back to default RAG retrieval settings", ragSearchError)
          resolvedRagSearchSettings = resolveRagSearchSettings(null)
        } else {
          throw ragSearchError
        }
      } else {
        resolvedRagSearchSettings = resolveRagSearchSettings(ragSearchData ?? null)
      }
    }

    if (shouldRemoveGeminiApiKey) {
      const { error: deleteError } = await supabaseAdmin
        .from("user_api_keys")
        .delete()
        .eq("user_id", userId)

      if (deleteError) throw deleteError
    } else if (hasGeminiApiKeyField && encryptedKey) {
      const { error: upsertError } = await supabaseAdmin
        .from("user_api_keys")
        .upsert({ user_id: userId, gemini_api_key_encrypted: encryptedKey, updated_at: new Date().toISOString() }, { onConflict: "user_id" })

      if (upsertError) throw upsertError
    }

    const effectiveGeminiKey = shouldRemoveGeminiApiKey
      ? null
      : hasGeminiApiKeyField
        ? encryptedKey
        : existing?.gemini_api_key_encrypted

    return jsonResponse({
      gemini: { configured: Boolean(effectiveGeminiKey) },
      ragIndexing: resolvedRagIndexingSettings,
      ragSearch: resolvedRagSearchSettings,
    })
  } catch (err) {
    console.error("[api-keys-upsert]", err)
    return jsonResponse({ error: "Internal error" }, 500)
  }
})
