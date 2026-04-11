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

const createHttpError = (status: number, message: string) => Object.assign(new Error(message), { status })

const isHttpError = (error: unknown): error is Error & { status: number } =>
  error instanceof Error && typeof (error as { status?: unknown }).status === "number"

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
  for (const byte of bytes) binary += String.fromCodePoint(byte)
  return btoa(binary)
}

const encryptValue = async (value: string, secret: string): Promise<string> => {
  const key = await getCryptoKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, textEncoder.encode(value))
  return `${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(encrypted))}`
}

const getApiKeysUpsertRuntimeConfig = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const encryptionSecret = Deno.env.get("AI_CREDENTIALS_KEY")

  if (!supabaseUrl || !serviceRoleKey || !encryptionSecret) {
    throw createHttpError(500, "Function not configured")
  }

  return { supabaseUrl, serviceRoleKey, encryptionSecret }
}

const authenticateApiKeysUpsertRequest = async (
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

  return {
    supabaseAdmin,
    userId: userData.user.id,
  }
}

const readApiKeysUpsertPayload = async (req: Request): Promise<Record<string, unknown>> => {
  const rawBody = await req.text()
  if (!rawBody.trim()) return {}

  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    throw createHttpError(400, "Malformed JSON body")
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw createHttpError(400, "Request body must be a JSON object")
  }

  return parsed as Record<string, unknown>
}

const assertPayloadFieldTypes = (payload: Record<string, unknown>) => {
  if ("geminiApiKey" in payload && typeof payload.geminiApiKey !== "string") {
    throw createHttpError(400, "geminiApiKey must be a string")
  }
  if ("removeGeminiApiKey" in payload && typeof payload.removeGeminiApiKey !== "boolean") {
    throw createHttpError(400, "removeGeminiApiKey must be a boolean")
  }
}

type ApiKeysUpsertInput = {
  hasGeminiApiKeyField: boolean
  shouldRemoveGeminiApiKey: boolean
  rawGeminiKey: string
  coercedRagIndexingSettings: ReturnType<typeof coerceRagIndexingEditableSettings>
  hasRagIndexingFields: boolean
  coercedRagSearchSettings: ReturnType<typeof coerceRagSearchEditableSettings>
  hasRagSearchFields: boolean
}

const deriveApiKeysUpsertInput = (payload: Record<string, unknown>): ApiKeysUpsertInput => {
  assertPayloadFieldTypes(payload)

  const hasGeminiApiKeyField = "geminiApiKey" in payload
  const shouldRemoveGeminiApiKey = payload.removeGeminiApiKey === true
  const rawGeminiKey = typeof payload.geminiApiKey === "string" ? payload.geminiApiKey.trim() : ""
  const coercedRagIndexingSettings = coerceRagIndexingEditableSettings(payload)
  const hasRagIndexingFields = Object.keys(coercedRagIndexingSettings).length > 0
  const coercedRagSearchSettings = coerceRagSearchEditableSettings(payload)
  const hasRagSearchFields = Object.keys(coercedRagSearchSettings).length > 0

  if (shouldRemoveGeminiApiKey && rawGeminiKey) {
    throw createHttpError(400, "Provide either geminiApiKey or removeGeminiApiKey, not both")
  }

  const MAX_GEMINI_KEY_LENGTH = 256
  if (rawGeminiKey.length > MAX_GEMINI_KEY_LENGTH) {
    throw createHttpError(400, `Gemini API key must not exceed ${MAX_GEMINI_KEY_LENGTH} characters`)
  }

  if (!hasGeminiApiKeyField && !shouldRemoveGeminiApiKey && !hasRagIndexingFields && !hasRagSearchFields) {
    throw createHttpError(400, "No Google API settings changes provided")
  }

  return {
    hasGeminiApiKeyField,
    shouldRemoveGeminiApiKey,
    rawGeminiKey,
    coercedRagIndexingSettings,
    hasRagIndexingFields,
    coercedRagSearchSettings,
    hasRagSearchFields,
  }
}

const validateRagIndexingSettingsPayload = (
  hasRagIndexingFields: boolean,
  coercedRagIndexingSettings: ReturnType<typeof coerceRagIndexingEditableSettings>
) => {
  if (!hasRagIndexingFields) return undefined

  try {
    return assertValidRagIndexingEditableSettings(coercedRagIndexingSettings)
  } catch (validationError) {
    throw createHttpError(
      400,
      validationError instanceof Error ? validationError.message : "Invalid RAG indexing settings"
    )
  }
}

const loadExistingRagSearchSettingsForMerge = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
) => {
  const { data: existingRagSearchData, error: existingRagSearchError } = await supabaseAdmin
    .from("user_rag_search_settings")
    .select("top_k, similarity_threshold, embedding_model")
    .eq("user_id", userId)
    .maybeSingle()

  if (!existingRagSearchError) return existingRagSearchData

  if (!isMissingEmbeddingModelColumnError(existingRagSearchError)) {
    if (isUnavailableRagSearchSettingsStorageError(existingRagSearchError)) {
      throw createHttpError(
        503,
        "RAG retrieval settings are unavailable until the latest database migration is applied"
      )
    }
    throw existingRagSearchError
  }

  const { data: legacyRagSearchData, error: legacyRagSearchError } = await supabaseAdmin
    .from("user_rag_search_settings")
    .select("top_k, similarity_threshold")
    .eq("user_id", userId)
    .maybeSingle()

  if (!legacyRagSearchError) return legacyRagSearchData

  if (isUnavailableRagSearchSettingsStorageError(legacyRagSearchError)) {
    throw createHttpError(
      503,
      "RAG retrieval settings are unavailable until the latest database migration is applied"
    )
  }

  throw legacyRagSearchError
}

const validateRagSearchSettingsPayload = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  hasRagSearchFields: boolean,
  coercedRagSearchSettings: ReturnType<typeof coerceRagSearchEditableSettings>
) => {
  if (!hasRagSearchFields) return undefined

  const existingRagSearchSettingsRow = await loadExistingRagSearchSettingsForMerge(supabaseAdmin, userId)

  try {
    return assertValidRagSearchEditableSettings({
      ...resolveRagSearchEditableSettings(existingRagSearchSettingsRow ?? null),
      ...coercedRagSearchSettings,
    })
  } catch (validationError) {
    throw createHttpError(
      400,
      validationError instanceof Error ? validationError.message : "Invalid RAG retrieval settings"
    )
  }
}

const loadExistingGeminiKey = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
) => {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("user_api_keys")
    .select("gemini_api_key_encrypted")
    .eq("user_id", userId)
    .maybeSingle()

  if (fetchError) throw fetchError
  return existing
}

const resolveEncryptedGeminiKey = async (
  existingEncryptedKey: string | null,
  rawGeminiKey: string,
  shouldRemoveGeminiApiKey: boolean,
  hasGeminiApiKeyField: boolean,
  encryptionSecret: string
) => {
  let encryptedKey = existingEncryptedKey

  if (shouldRemoveGeminiApiKey) {
    encryptedKey = null
  } else if (hasGeminiApiKeyField && rawGeminiKey) {
    encryptedKey = await encryptValue(rawGeminiKey, encryptionSecret)
  }

  return encryptedKey
}

const assertInitialGeminiKeyProvided = (
  hasGeminiApiKeyField: boolean,
  shouldRemoveGeminiApiKey: boolean,
  encryptedKey: string | null,
  hasRagIndexingFields: boolean,
  hasRagSearchFields: boolean
) => {
  if (hasGeminiApiKeyField && !shouldRemoveGeminiApiKey && !encryptedKey && !hasRagIndexingFields && !hasRagSearchFields) {
    throw createHttpError(400, "Gemini API key is required for initial setup")
  }
}

const loadResolvedRagIndexingSettings = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
) => {
  const { data: ragIndexingData, error: ragIndexingError } = await supabaseAdmin
    .from("user_rag_index_settings")
    .select("target_chunk_size, min_chunk_size, max_chunk_size, overlap, use_title, use_section_headings, use_tags, embedding_model")
    .eq("user_id", userId)
    .maybeSingle()

  if (!ragIndexingError) {
    return resolveRagIndexingSettings(ragIndexingData ?? null)
  }

  if (!isMissingEmbeddingModelColumnError(ragIndexingError)) {
    if (isUnavailableRagIndexingSettingsStorageError(ragIndexingError)) {
      console.warn("[api-keys-upsert] Falling back to default RAG indexing settings", ragIndexingError)
      return resolveRagIndexingSettings(null)
    }
    throw ragIndexingError
  }

  const { data: legacyRagIndexingData, error: legacyRagIndexingError } = await supabaseAdmin
    .from("user_rag_index_settings")
    .select("target_chunk_size, min_chunk_size, max_chunk_size, overlap, use_title, use_section_headings, use_tags")
    .eq("user_id", userId)
    .maybeSingle()

  if (!legacyRagIndexingError) {
    return resolveRagIndexingSettings(legacyRagIndexingData ?? null)
  }

  if (isUnavailableRagIndexingSettingsStorageError(legacyRagIndexingError)) {
    console.warn("[api-keys-upsert] Falling back to default RAG indexing settings", legacyRagIndexingError)
    return resolveRagIndexingSettings(null)
  }

  throw legacyRagIndexingError
}

const upsertOrLoadRagIndexingSettings = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  hasRagIndexingFields: boolean,
  validatedRagIndexingSettings: ReturnType<typeof assertValidRagIndexingEditableSettings> | undefined
) => {
  if (!hasRagIndexingFields) {
    return loadResolvedRagIndexingSettings(supabaseAdmin, userId)
  }

  const { error: ragUpsertError } = await supabaseAdmin
    .from("user_rag_index_settings")
    .upsert({ user_id: userId, ...validatedRagIndexingSettings, updated_at: new Date().toISOString() }, { onConflict: "user_id" })

  if (!ragUpsertError) {
    return resolveRagIndexingSettings(validatedRagIndexingSettings)
  }

  if (isMissingEmbeddingModelColumnError(ragUpsertError) ||
    isUnavailableRagIndexingSettingsStorageError(ragUpsertError)) {
    if (isUnavailableRagIndexingSettingsStorageError(ragUpsertError)) {
      console.error("[api-keys-upsert] RAG indexing settings write is unavailable", ragUpsertError)
    }
    throw createHttpError(
      503,
      "RAG indexing settings are unavailable until the latest database migration is applied"
    )
  }

  throw ragUpsertError
}

const buildRagSearchRpcPayload = (
  userId: string,
  coercedRagSearchSettings: ReturnType<typeof coerceRagSearchEditableSettings>,
  validatedRagSearchSettings: ReturnType<typeof assertValidRagSearchEditableSettings>
) => {
  const pTopK = "top_k" in coercedRagSearchSettings ? validatedRagSearchSettings.top_k : null
  const pSimilarityThreshold = "similarity_threshold" in coercedRagSearchSettings
    ? validatedRagSearchSettings.similarity_threshold
    : null
  const pEmbeddingModel = "embedding_model" in coercedRagSearchSettings
    ? validatedRagSearchSettings.embedding_model
    : null

  return {
    p_user_id: userId,
    p_top_k: pTopK,
    p_similarity_threshold: pSimilarityThreshold,
    p_embedding_model: pEmbeddingModel,
  }
}

const loadResolvedRagSearchSettings = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
) => {
  const { data: ragSearchData, error: ragSearchError } = await supabaseAdmin
    .from("user_rag_search_settings")
    .select("top_k, similarity_threshold, embedding_model")
    .eq("user_id", userId)
    .maybeSingle()

  if (!ragSearchError) {
    return resolveRagSearchSettings(ragSearchData ?? null)
  }

  if (!isMissingEmbeddingModelColumnError(ragSearchError)) {
    if (isUnavailableRagSearchSettingsStorageError(ragSearchError)) {
      console.warn("[api-keys-upsert] Falling back to default RAG retrieval settings", ragSearchError)
      return resolveRagSearchSettings(null)
    }
    throw ragSearchError
  }

  const { data: legacyRagSearchData, error: legacyRagSearchError } = await supabaseAdmin
    .from("user_rag_search_settings")
    .select("top_k, similarity_threshold")
    .eq("user_id", userId)
    .maybeSingle()

  if (!legacyRagSearchError) {
    return resolveRagSearchSettings(legacyRagSearchData ?? null)
  }

  if (isUnavailableRagSearchSettingsStorageError(legacyRagSearchError)) {
    console.warn("[api-keys-upsert] Falling back to default RAG retrieval settings", legacyRagSearchError)
    return resolveRagSearchSettings(null)
  }

  throw legacyRagSearchError
}

const upsertOrLoadRagSearchSettings = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  hasRagSearchFields: boolean,
  coercedRagSearchSettings: ReturnType<typeof coerceRagSearchEditableSettings>,
  validatedRagSearchSettings: ReturnType<typeof assertValidRagSearchEditableSettings> | undefined
) => {
  if (!hasRagSearchFields) {
    return loadResolvedRagSearchSettings(supabaseAdmin, userId)
  }

  const { data: ragSearchUpsertData, error: ragSearchUpsertError } = await supabaseAdmin
    .rpc(
      "upsert_user_rag_search_settings_partial",
      buildRagSearchRpcPayload(userId, coercedRagSearchSettings, validatedRagSearchSettings)
    )
    .single()

  if (ragSearchUpsertError) {
    if (isUnavailableRagSearchSettingsStorageError(ragSearchUpsertError)) {
      throw createHttpError(
        503,
        "RAG retrieval settings are unavailable until the latest database migration is applied"
      )
    }
    throw ragSearchUpsertError
  }

  return resolveRagSearchSettings(ragSearchUpsertData)
}

const persistGeminiApiKey = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  shouldRemoveGeminiApiKey: boolean,
  hasGeminiApiKeyField: boolean,
  encryptedKey: string | null
) => {
  if (shouldRemoveGeminiApiKey) {
    const { error: deleteError } = await supabaseAdmin
      .from("user_api_keys")
      .delete()
      .eq("user_id", userId)

    if (deleteError) throw deleteError
    return
  }

  if (!hasGeminiApiKeyField || !encryptedKey) return

  const { error: upsertError } = await supabaseAdmin
    .from("user_api_keys")
    .upsert({ user_id: userId, gemini_api_key_encrypted: encryptedKey, updated_at: new Date().toISOString() }, { onConflict: "user_id" })

  if (upsertError) throw upsertError
}

const resolveEffectiveGeminiKey = (
  shouldRemoveGeminiApiKey: boolean,
  hasGeminiApiKeyField: boolean,
  encryptedKey: string | null,
  existingEncryptedKey: string | null
) => {
  if (shouldRemoveGeminiApiKey) return null
  if (hasGeminiApiKeyField) return encryptedKey
  return existingEncryptedKey
}

const handleApiKeysUpsertRequest = async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405)

  const { supabaseUrl, serviceRoleKey, encryptionSecret } = getApiKeysUpsertRuntimeConfig()
  const { supabaseAdmin, userId } = await authenticateApiKeysUpsertRequest(req, supabaseUrl, serviceRoleKey)
  const payload = await readApiKeysUpsertPayload(req)
  const {
    hasGeminiApiKeyField,
    shouldRemoveGeminiApiKey,
    rawGeminiKey,
    coercedRagIndexingSettings,
    hasRagIndexingFields,
    coercedRagSearchSettings,
    hasRagSearchFields,
  } = deriveApiKeysUpsertInput(payload)

  const existing = await loadExistingGeminiKey(supabaseAdmin, userId)
  const existingEncryptedKey = existing?.gemini_api_key_encrypted ?? null
  const encryptedKey = await resolveEncryptedGeminiKey(
    existingEncryptedKey,
    rawGeminiKey,
    shouldRemoveGeminiApiKey,
    hasGeminiApiKeyField,
    encryptionSecret
  )

  assertInitialGeminiKeyProvided(
    hasGeminiApiKeyField,
    shouldRemoveGeminiApiKey,
    encryptedKey,
    hasRagIndexingFields,
    hasRagSearchFields
  )

  const validatedRagIndexingSettings = validateRagIndexingSettingsPayload(
    hasRagIndexingFields,
    coercedRagIndexingSettings
  )
  const validatedRagSearchSettings = await validateRagSearchSettingsPayload(
    supabaseAdmin,
    userId,
    hasRagSearchFields,
    coercedRagSearchSettings
  )

  const resolvedRagIndexingSettings = await upsertOrLoadRagIndexingSettings(
    supabaseAdmin,
    userId,
    hasRagIndexingFields,
    validatedRagIndexingSettings
  )
  const resolvedRagSearchSettings = await upsertOrLoadRagSearchSettings(
    supabaseAdmin,
    userId,
    hasRagSearchFields,
    coercedRagSearchSettings,
    validatedRagSearchSettings
  )

  await persistGeminiApiKey(
    supabaseAdmin,
    userId,
    shouldRemoveGeminiApiKey,
    hasGeminiApiKeyField,
    encryptedKey
  )

  const effectiveGeminiKey = resolveEffectiveGeminiKey(
    shouldRemoveGeminiApiKey,
    hasGeminiApiKeyField,
    encryptedKey,
    existingEncryptedKey
  )

  return jsonResponse({
    gemini: { configured: Boolean(effectiveGeminiKey) },
    ragIndexing: resolvedRagIndexingSettings,
    ragSearch: resolvedRagSearchSettings,
  })
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  try {
    return await handleApiKeysUpsertRequest(req)
  } catch (err) {
    if (isHttpError(err)) {
      return jsonResponse({ error: err.message }, err.status)
    }
    console.error("[api-keys-upsert]", err)
    return jsonResponse({ error: "Internal error" }, 500)
  }
})
