/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"

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
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
    const token = (bearerMatch ? bearerMatch[1] : authHeader).trim()
    if (!token) return jsonResponse({ error: "Unauthorized" }, 401)

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) return jsonResponse({ error: "Unauthorized" }, 401)
    const userId = userData.user.id

    let payload: Record<string, unknown> = {}
    try { payload = await req.json() } catch { /* empty body */ }

    const rawGeminiKey = typeof payload.geminiApiKey === "string" ? payload.geminiApiKey.trim() : ""

    const MAX_GEMINI_KEY_LENGTH = 256
    if (rawGeminiKey.length > MAX_GEMINI_KEY_LENGTH) {
      return jsonResponse({ error: `Gemini API key must not exceed ${MAX_GEMINI_KEY_LENGTH} characters` }, 400)
    }

    // Fetch existing row to support "keep existing key" on empty input
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("user_api_keys")
      .select("gemini_api_key_encrypted")
      .eq("user_id", userId)
      .maybeSingle()

    if (fetchError) throw fetchError

    let encryptedKey = existing?.gemini_api_key_encrypted ?? null

    if (rawGeminiKey) {
      encryptedKey = await encryptValue(rawGeminiKey, encryptionSecret)
    }

    if (!encryptedKey) {
      return jsonResponse({ error: "Gemini API key is required for initial setup" }, 400)
    }

    const { error: upsertError } = await supabaseAdmin
      .from("user_api_keys")
      .upsert({ user_id: userId, gemini_api_key_encrypted: encryptedKey, updated_at: new Date().toISOString() }, { onConflict: "user_id" })

    if (upsertError) throw upsertError

    return jsonResponse({ gemini: { configured: true } })
  } catch (err) {
    console.error("[api-keys-upsert]", err)
    return jsonResponse({ error: "Internal error" }, 500)
  }
})
