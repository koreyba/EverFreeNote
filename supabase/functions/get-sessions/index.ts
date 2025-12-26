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

const parseLimit = (value: string | null) => {
  if (!value) return 3
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return null
  return parsed
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
  const limitValue = parseLimit(url.searchParams.get("limit"))
  if (limitValue === null) {
    return jsonResponse({ error: "Invalid limit" }, 400)
  }

  if (limitValue < 1 || limitValue > 20) {
    return jsonResponse({ error: "Limit must be between 1 and 20" }, 400)
  }

  const userId = defaultUserId || null
  if (!userId) {
    return jsonResponse({ error: "Missing COACHING_USER_ID" }, 500)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
    const { data, error } = await supabaseAdmin
      .from("notes")
      .select("id, title, description, tags, created_at, updated_at, user_id")
      .eq("user_id", userId)
      .contains("tags", [CLAUDE_TAG])
      .order("created_at", { ascending: false })
      .limit(limitValue)

    if (error) {
      throw error
    }

    return jsonResponse({ success: true, sessions: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch sessions"
    return jsonResponse({ error: message }, 500)
  }
})
