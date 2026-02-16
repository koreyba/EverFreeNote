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

const REQUEST_TIMEOUT_MS = 15000

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()
let cachedCryptoKey: CryptoKey | null = null

type IntegrationConfig = {
  siteUrl: string
  username: string
  password: string
}

type BridgeErrorInput = {
  code: string
  message: string
  status?: number
  details?: unknown
}

class BridgeError extends Error {
  code: string
  status: number
  details?: unknown

  constructor({ code, message, status = 400, details }: BridgeErrorInput) {
    super(message)
    this.name = "BridgeError"
    this.code = code
    this.status = status
    this.details = details
  }
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

const errorResponse = (error: BridgeError) =>
  jsonResponse(
    {
      code: error.code,
      message: error.message,
      details: error.details,
    },
    error.status
  )

const normalizeSiteUrl = (value: string): string => value.replace(/\/+$/, "")

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

const getCryptoKey = async (): Promise<CryptoKey> => {
  if (!encryptionSecret) {
    throw new BridgeError({
      code: "function_not_configured",
      message: "Missing WP_CREDENTIALS_KEY",
      status: 500,
    })
  }

  if (cachedCryptoKey) return cachedCryptoKey

  const hash = await crypto.subtle.digest("SHA-256", textEncoder.encode(encryptionSecret))
  cachedCryptoKey = await crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["decrypt"])
  return cachedCryptoKey
}

const decryptValue = async (value: string): Promise<string> => {
  const [ivRaw, encryptedRaw] = value.split(":")
  if (!ivRaw || !encryptedRaw) {
    throw new BridgeError({
      code: "invalid_credentials",
      message: "Stored WordPress credentials are invalid",
      status: 500,
    })
  }

  const iv = base64ToBytes(ivRaw)
  const encrypted = base64ToBytes(encryptedRaw)

  try {
    const key = await getCryptoKey()
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      encrypted
    )

    return textDecoder.decode(decrypted)
  } catch {
    throw new BridgeError({
      code: "invalid_credentials",
      message: "Stored WordPress credentials are invalid",
      status: 500,
    })
  }
}

const normalizeTags = (tags: unknown): string[] => {
  if (!Array.isArray(tags)) return []

  const seen = new Set<string>()
  const normalized: string[] = []

  for (const rawTag of tags) {
    if (typeof rawTag !== "string") continue
    const tag = rawTag.trim()
    if (!tag) continue
    const key = tag.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(tag)
  }

  return normalized
}

const normalizeCategoryIds = (categoryIds: unknown): number[] => {
  if (!Array.isArray(categoryIds)) return []

  const seen = new Set<number>()
  const normalized: number[] = []

  for (const raw of categoryIds) {
    const value = Number(raw)
    if (!Number.isInteger(value) || value <= 0) continue
    if (seen.has(value)) continue
    seen.add(value)
    normalized.push(value)
  }

  return normalized
}

const validateSlug = (slug: string): string => {
  const value = slug.trim().toLowerCase()
  if (!value) {
    throw new BridgeError({
      code: "invalid_slug",
      message: "Slug is required",
      status: 400,
    })
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new BridgeError({
      code: "invalid_slug",
      message: "Use lowercase latin letters, digits, and hyphen only",
      status: 400,
    })
  }

  if (value.length > 96) {
    throw new BridgeError({
      code: "invalid_slug",
      message: "Slug is too long (max 96 chars)",
      status: 400,
    })
  }

  return value
}

const mapWordPressError = (status: number, body: unknown): BridgeError => {
  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {}
  const wpCode = typeof payload.code === "string" ? payload.code : ""
  const wpMessage = typeof payload.message === "string" ? payload.message : "WordPress request failed"

  if (status === 401 || status === 403) {
    return new BridgeError({
      code: "wp_auth_failed",
      message: "WordPress authentication failed. Check URL, username and application password.",
      status: 401,
      details: payload,
    })
  }

  if (wpCode === "rest_post_exists" || wpCode === "slug_conflict") {
    return new BridgeError({
      code: "slug_conflict",
      message: "A post with this slug already exists. Please change the slug and try again.",
      status: 409,
      details: payload,
    })
  }

  if (status >= 500) {
    return new BridgeError({
      code: "wp_upstream_error",
      message: "WordPress returned a server error. Please try again later.",
      status: 502,
      details: payload,
    })
  }

  if (status === 400 || status === 422 || wpCode === "rest_invalid_param") {
    return new BridgeError({
      code: "wp_validation_error",
      message: wpMessage,
      status: 400,
      details: payload,
    })
  }

  return new BridgeError({
    code: "wp_request_failed",
    message: wpMessage,
    status: 502,
    details: payload,
  })
}

const wordpressFetch = async (
  config: IntegrationConfig,
  path: string,
  init: RequestInit = {}
): Promise<Response> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  const headers = new Headers(init.headers || {})
  headers.set("Authorization", `Basic ${btoa(`${config.username}:${config.password}`)}`)
  headers.set("Accept", "application/json")
  if (init.method && init.method !== "GET" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  try {
    const response = await fetch(`${config.siteUrl}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new BridgeError({
        code: "wp_timeout",
        message: "WordPress request timed out. Try again.",
        status: 504,
      })
    }

    throw new BridgeError({
      code: "wp_network_error",
      message: "Cannot reach WordPress site. Check site URL and network availability.",
      status: 502,
    })
  } finally {
    clearTimeout(timeout)
  }
}

const fetchWordPressJson = async (
  config: IntegrationConfig,
  path: string,
  init: RequestInit = {}
): Promise<unknown> => {
  const response = await wordpressFetch(config, path, init)

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (!response.ok) {
    throw mapWordPressError(response.status, body)
  }

  return body
}

const loadIntegrationConfig = async (supabaseAdmin: ReturnType<typeof createClient>, userId: string): Promise<IntegrationConfig> => {
  const { data, error } = await supabaseAdmin
    .from("wordpress_integrations")
    .select("site_url, wp_username, wp_app_password_encrypted, enabled")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new BridgeError({
      code: "integration_load_failed",
      message: "Failed to load WordPress integration",
      status: 500,
      details: error,
    })
  }

  if (!data || !data.enabled || !data.site_url || !data.wp_username || !data.wp_app_password_encrypted) {
    throw new BridgeError({
      code: "not_configured",
      message: "WordPress integration is not configured",
      status: 400,
    })
  }

  const password = await decryptValue(data.wp_app_password_encrypted)

  return {
    siteUrl: normalizeSiteUrl(data.site_url),
    username: data.wp_username,
    password,
  }
}

const loadRememberedCategoryIds = async (supabaseAdmin: ReturnType<typeof createClient>, userId: string): Promise<number[]> => {
  const { data, error } = await supabaseAdmin
    .from("wordpress_export_preferences")
    .select("remembered_category_ids")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new BridgeError({
      code: "preferences_load_failed",
      message: "Failed to load export preferences",
      status: 500,
      details: error,
    })
  }

  return normalizeCategoryIds(data?.remembered_category_ids ?? [])
}

const saveRememberedCategoryIds = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  categoryIds: number[]
): Promise<void> => {
  const { error } = await supabaseAdmin
    .from("wordpress_export_preferences")
    .upsert(
      {
        user_id: userId,
        remembered_category_ids: categoryIds,
      },
      { onConflict: "user_id" }
    )

  if (error) {
    throw new BridgeError({
      code: "preferences_save_failed",
      message: "Failed to save export preferences",
      status: 500,
      details: error,
    })
  }
}

const fetchCategories = async (config: IntegrationConfig): Promise<Array<{ id: number; name: string }>> => {
  const categories: Array<{ id: number; name: string }> = []

  for (let page = 1; page <= 10; page += 1) {
    const response = await wordpressFetch(
      config,
      `/wp-json/wp/v2/categories?per_page=100&page=${page}&_fields=id,name`,
      { method: "GET" }
    )

    let result: unknown = null
    try {
      result = await response.json()
    } catch {
      result = null
    }

    if (!response.ok) {
      const wpCode =
        result && typeof result === "object" && typeof (result as Record<string, unknown>).code === "string"
          ? (result as Record<string, unknown>).code
          : ""
      if (response.status === 400 && wpCode === "rest_post_invalid_page_number") {
        break
      }
      throw mapWordPressError(response.status, result)
    }

    if (!Array.isArray(result)) {
      throw new BridgeError({
        code: "wp_invalid_categories_response",
        message: "WordPress returned an invalid categories response",
        status: 502,
      })
    }

    for (const raw of result) {
      if (!raw || typeof raw !== "object") continue
      const id = Number((raw as Record<string, unknown>).id)
      const name = (raw as Record<string, unknown>).name
      if (!Number.isInteger(id) || id <= 0 || typeof name !== "string" || !name.trim()) continue
      categories.push({ id, name })
    }

    if (result.length < 100) {
      break
    }
  }

  return categories
}

const ensureSlugIsAvailable = async (config: IntegrationConfig, slug: string): Promise<void> => {
  const result = await fetchWordPressJson(
    config,
    `/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=id&per_page=1`,
    { method: "GET" }
  )

  if (Array.isArray(result) && result.length > 0) {
    throw new BridgeError({
      code: "slug_conflict",
      message: "A post with this slug already exists. Please change the slug and try again.",
      status: 409,
    })
  }
}

const resolveTagIds = async (config: IntegrationConfig, tags: string[]): Promise<number[]> => {
  const tagIds: number[] = []

  for (const tag of tags) {
    const exactName = tag.toLocaleLowerCase()
    const exactSlug = exactName.replace(/\s+/g, "-")

    const existing = await fetchWordPressJson(
      config,
      `/wp-json/wp/v2/tags?search=${encodeURIComponent(tag)}&per_page=100&_fields=id,name,slug`,
      { method: "GET" }
    )

    if (Array.isArray(existing)) {
      const exactMatch = existing.find((entry) => {
        if (!entry || typeof entry !== "object") return false
        const row = entry as Record<string, unknown>
        const name = typeof row.name === "string" ? row.name.toLocaleLowerCase() : ""
        const slug = typeof row.slug === "string" ? row.slug.toLocaleLowerCase() : ""
        return name === exactName || slug === exactSlug
      })

      if (exactMatch && typeof (exactMatch as Record<string, unknown>).id === "number") {
        tagIds.push((exactMatch as Record<string, unknown>).id as number)
        continue
      }
    }

    const createResponse = await wordpressFetch(config, `/wp-json/wp/v2/tags`, {
      method: "POST",
      body: JSON.stringify({ name: tag }),
    })

    let createBody: unknown = null
    try {
      createBody = await createResponse.json()
    } catch {
      createBody = null
    }

    if (!createResponse.ok) {
      if (
        createBody &&
        typeof createBody === "object" &&
        (createBody as Record<string, unknown>).code === "term_exists"
      ) {
        const payloadData = (createBody as Record<string, unknown>).data
        const maybeTermId = Number(
          payloadData && typeof payloadData === "object"
            ? (payloadData as Record<string, unknown>).term_id
            : undefined
        )

        if (Number.isInteger(maybeTermId) && maybeTermId > 0) {
          tagIds.push(maybeTermId)
          continue
        }
      }

      throw mapWordPressError(createResponse.status, createBody)
    }

    const createdId = Number(
      createBody && typeof createBody === "object"
        ? (createBody as Record<string, unknown>).id
        : undefined
    )

    if (!Number.isInteger(createdId) || createdId <= 0) {
      throw new BridgeError({
        code: "wp_invalid_tag_response",
        message: "Failed to resolve WordPress tags",
        status: 502,
      })
    }

    tagIds.push(createdId)
  }

  return tagIds
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
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

  const authHeader = req.headers.get("Authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : ""
  if (!token) {
    return jsonResponse({ code: "unauthorized", message: "Unauthorized" }, 401)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  let payload: Record<string, unknown> = {}
  try {
    payload = await req.json()
  } catch {
    payload = {}
  }

  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return jsonResponse({ code: "unauthorized", message: "Unauthorized" }, 401)
    }

    const userId = userData.user.id
    const action = typeof payload.action === "string" ? payload.action : ""

    const integration = await loadIntegrationConfig(supabaseAdmin, userId)

    if (action === "get_categories") {
      const [categories, rememberedCategoryIds] = await Promise.all([
        fetchCategories(integration),
        loadRememberedCategoryIds(supabaseAdmin, userId),
      ])

      return jsonResponse({
        action: "get_categories",
        categories,
        rememberedCategoryIds,
      })
    }

    if (action === "export_note") {
      const noteId = typeof payload.noteId === "string" ? payload.noteId.trim() : ""
      const slug = validateSlug(typeof payload.slug === "string" ? payload.slug : "")
      const categoryIds = normalizeCategoryIds(payload.categoryIds)
      const hasExplicitTags = Array.isArray(payload.tags)
      const exportTags = normalizeTags(payload.tags)
      const exportTitle = typeof payload.title === "string" ? payload.title.trim() : ""

      if (!noteId) {
        throw new BridgeError({
          code: "invalid_input",
          message: "noteId is required",
          status: 400,
        })
      }

      const { data: note, error: noteError } = await supabaseAdmin
        .from("notes")
        .select("id, title, description, tags")
        .eq("id", noteId)
        .eq("user_id", userId)
        .maybeSingle()

      if (noteError) {
        throw new BridgeError({
          code: "note_lookup_failed",
          message: "Failed to load note",
          status: 500,
          details: noteError,
        })
      }

      if (!note) {
        throw new BridgeError({
          code: "note_not_found",
          message: "Note not found",
          status: 404,
        })
      }

      await ensureSlugIsAvailable(integration, slug)

      const tags = hasExplicitTags ? exportTags : normalizeTags(note.tags)
      const tagIds = tags.length > 0 ? await resolveTagIds(integration, tags) : []

      const postBody = {
        title: exportTitle || note.title || "Untitled",
        content: note.description || "",
        status: "publish",
        slug,
        categories: categoryIds,
        tags: tagIds,
      }

      const createResult = await fetchWordPressJson(integration, `/wp-json/wp/v2/posts`, {
        method: "POST",
        body: JSON.stringify(postBody),
      })

      if (!createResult || typeof createResult !== "object") {
        throw new BridgeError({
          code: "wp_invalid_post_response",
          message: "WordPress returned an invalid post response",
          status: 502,
        })
      }

      const createdPost = createResult as Record<string, unknown>
      const postId = Number(createdPost.id)
      const postUrl = typeof createdPost.link === "string" ? createdPost.link : ""
      const createdSlug = typeof createdPost.slug === "string" ? createdPost.slug : slug

      if (!Number.isInteger(postId) || postId <= 0) {
        throw new BridgeError({
          code: "wp_invalid_post_response",
          message: "WordPress returned an invalid post response",
          status: 502,
        })
      }

      await saveRememberedCategoryIds(supabaseAdmin, userId, categoryIds)

      return jsonResponse({
        action: "export_note",
        postId,
        postUrl,
        slug: createdSlug,
      })
    }

    throw new BridgeError({
      code: "invalid_action",
      message: "Unsupported action",
      status: 400,
    })
  } catch (error) {
    if (error instanceof BridgeError) {
      return errorResponse(error)
    }

    const message = error instanceof Error ? error.message : "WordPress bridge failed"
    return jsonResponse({ code: "bridge_failed", message }, 500)
  }
})
