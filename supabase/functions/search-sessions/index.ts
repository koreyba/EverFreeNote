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
const defaultUserId = Deno.env.get("COACHING_USER_ID")

const CLAUDE_TAG = "claude-therapy"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

const parseIntParam = (value: string | null, fallback: number) => {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

const parseFloatParam = (value: string | null, fallback: number) => {
  if (!value) return fallback
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

const LANGUAGE_MAP: Record<string, string> = {
  ru: "russian",
  en: "english",
  uk: "russian",
}

const buildTsQuery = (query: string) => {
  const trimmed = query.trim()
  if (!trimmed || trimmed.length < 3 || trimmed.length > 1000) {
    return null
  }

  const sanitized = trimmed.replace(/[&|!():<>]/g, " ").replace(/\s+/g, " ").trim()
  if (!sanitized) return null

  const words = sanitized.split(" ").filter(Boolean)
  if (!words.length) return null

  if (words.length === 1) {
    return `${words[0]}:*`
  }

  return words.map((word) => `${word}:*`).join(" & ")
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Function not configured" }, 500)
  }

  const url = new URL(req.url)
  const rawQuery = url.searchParams.get("q") || ""
  const tsQuery = buildTsQuery(rawQuery)
  if (!tsQuery) {
    return jsonResponse({ error: "Invalid query" }, 400)
  }

  const limitValue = parseIntParam(url.searchParams.get("limit"), 10)
  if (limitValue === null || limitValue < 1 || limitValue > 20) {
    return jsonResponse({ error: "Limit must be between 1 and 20" }, 400)
  }

  const offsetValue = parseIntParam(url.searchParams.get("offset"), 0)
  if (offsetValue === null || offsetValue < 0) {
    return jsonResponse({ error: "Invalid offset" }, 400)
  }

  const minRankValue = parseFloatParam(url.searchParams.get("min_rank"), 0.1)
  if (minRankValue === null || minRankValue < 0) {
    return jsonResponse({ error: "Invalid min_rank" }, 400)
  }

  const languageParam = url.searchParams.get("lang") || "ru"
  const searchLanguage = LANGUAGE_MAP[languageParam] || LANGUAGE_MAP.ru

  const userId = defaultUserId || null
  if (!userId) {
    return jsonResponse({ error: "Missing COACHING_USER_ID" }, 500)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
    const { data, error } = await supabaseAdmin.rpc("search_notes_fts", {
      search_query: tsQuery,
      search_language: searchLanguage,
      min_rank: minRankValue,
      result_limit: limitValue,
      result_offset: offsetValue,
      search_user_id: userId,
      filter_tag: CLAUDE_TAG,
    })

    if (error) {
      throw error
    }

    const rows = (data ?? []) as Array<{ total_count?: number }>
    const total = rows.length ? rows[0]?.total_count ?? rows.length : 0

    return jsonResponse({
      success: true,
      query: rawQuery,
      results: rows,
      total,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search sessions"
    return jsonResponse({ error: message }, 500)
  }
})
