/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
const encryptionSecret = Deno.env.get("WP_CREDENTIALS_KEY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const textEncoder = new TextEncoder()
let cachedCryptoKey: CryptoKey | null = null

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

const readAuthToken = (authHeader: string): string =>
  authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice("bearer ".length).trim()
    : ""

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "https:" || parsed.protocol === "http:"
  } catch {
    return false
  }
}

const normalizeSiteUrl = (value: string): string => {
  let normalized = value
  while (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1)
  }
  return normalized
}

const getCryptoKey = async (): Promise<CryptoKey> => {
  if (!encryptionSecret) {
    throw new Error("Missing WP_CREDENTIALS_KEY")
  }

  if (cachedCryptoKey) return cachedCryptoKey

  const hash = await crypto.subtle.digest("SHA-256", textEncoder.encode(encryptionSecret))
  cachedCryptoKey = await crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
  return cachedCryptoKey
}

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte)
  }
  return btoa(binary)
}

const encryptValue = async (value: string): Promise<string> => {
  const key = await getCryptoKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    textEncoder.encode(value)
  )

  return `${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(encrypted))}`
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
}

const parseJsonObject = async (req: Request): Promise<Record<string, unknown>> => {
  try {
    const payload = await req.json()
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

const validateWordPressPayload = (
  payload: Record<string, unknown>
):
  | {
      siteUrl: string
      wpUsername: string
      rawPassword: string
      enabled: boolean
    }
  | Response => {
  const rawSiteUrl = typeof payload.siteUrl === "string" ? payload.siteUrl.trim() : ""
  const rawUsername = typeof payload.wpUsername === "string" ? payload.wpUsername.trim() : ""
  const rawPassword = typeof payload.applicationPassword === "string" ? payload.applicationPassword.trim() : ""
  const enabled = payload.enabled !== false

  if (!rawSiteUrl || !rawUsername) {
    return jsonResponse({ code: "invalid_input", message: "Site URL and username are required" }, 400)
  }

  if (!isValidHttpUrl(rawSiteUrl)) {
    return jsonResponse({ code: "invalid_input", message: "Site URL must be a valid HTTP/HTTPS URL" }, 400)
  }

  return {
    siteUrl: normalizeSiteUrl(rawSiteUrl),
    wpUsername: rawUsername,
    rawPassword,
    enabled,
  }
}

const getUserId = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  token: string
): Promise<string | null> => {
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) {
    return null
  }
  return userData.user.id
}

const saveWordPressSettings = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  siteUrl: string,
  wpUsername: string,
  rawPassword: string,
  enabled: boolean
) => {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("wordpress_integrations")
    .select("wp_app_password_encrypted")
    .eq("user_id", userId)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  const encryptedPassword = rawPassword
    ? await encryptValue(rawPassword)
    : (existing?.wp_app_password_encrypted || "")

  if (!encryptedPassword) {
    return jsonResponse({
      code: "invalid_input",
      message: "Application password is required for initial setup",
    }, 400)
  }

  const { error: upsertError } = await supabaseAdmin
    .from("wordpress_integrations")
    .upsert(
      {
        user_id: userId,
        site_url: siteUrl,
        wp_username: wpUsername,
        wp_app_password_encrypted: encryptedPassword,
        enabled,
      },
      { onConflict: "user_id" }
    )

  if (upsertError) {
    throw upsertError
  }

  return jsonResponse({
    configured: Boolean(enabled),
    integration: {
      siteUrl,
      wpUsername,
      enabled,
      hasPassword: true,
    },
  })
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ code: "method_not_allowed", message: "Method not allowed" }, 405)
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ code: "function_not_configured", message: "Function not configured" }, 500)
  }

  const validatedPayload = validateWordPressPayload(await parseJsonObject(req))
  if (validatedPayload instanceof Response) {
    return validatedPayload
  }

  const { siteUrl, wpUsername, rawPassword, enabled } = validatedPayload

  const authHeader = req.headers.get("Authorization")?.trim() ?? ""
  const token = readAuthToken(authHeader)
  if (!token) {
    return jsonResponse({ code: "unauthorized", message: "Unauthorized" }, 401)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
    const userId = await getUserId(supabaseAdmin, token)
    if (!userId) {
      return jsonResponse({ code: "unauthorized", message: "Unauthorized" }, 401)
    }
    return await saveWordPressSettings(supabaseAdmin, userId, siteUrl, wpUsername, rawPassword, enabled)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save WordPress settings"
    return jsonResponse({ code: "settings_upsert_failed", message }, 500)
  }
})
