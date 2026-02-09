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
  if (!value) return 20
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

  const authHeader = req.headers.get("Authorization")
  const token = authHeader?.replace("Bearer ", "")
  if (!token) {
    return jsonResponse({ error: "Unauthorized" }, 401)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Unauthorized" }, 401)
    }
    const userId = userData.user.id

    const url = new URL(req.url)
    const id = url.searchParams.get("id")
    const title = url.searchParams.get("title")

    // Single note by ID
    if (id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(id)) {
        return jsonResponse({ error: "Invalid id format" }, 400)
      }

      const { data, error } = await supabaseAdmin
        .from("notes")
        .select("id, title, description, tags, created_at, updated_at, user_id")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        return jsonResponse({ error: "Note not found" }, 404)
      }

      return jsonResponse({ success: true, note: data })
    }

    // List notes with optional filters
    const limitValue = parseLimit(url.searchParams.get("limit"))
    if (limitValue === null || limitValue < 1 || limitValue > 100) {
      return jsonResponse({ error: "Limit must be between 1 and 100" }, 400)
    }

    let query = supabaseAdmin
      .from("notes")
      .select("id, title, description, tags, created_at, updated_at, user_id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limitValue)

    if (title) {
      query = query.eq("title", title)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return jsonResponse({ success: true, notes: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch notes"
    return jsonResponse({ error: message }, 500)
  }
})
