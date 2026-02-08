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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
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

    let payload: Record<string, unknown> | null = null
    try {
      payload = await req.json()
    } catch {
      payload = null
    }

    const id = typeof payload?.id === "string" ? payload.id.trim() : ""
    if (!id) {
      return jsonResponse({ error: "Missing id" }, 400)
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return jsonResponse({ error: "Invalid id format" }, 400)
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from("notes")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle()

    if (findError) {
      throw findError
    }

    if (!existing) {
      return jsonResponse({ error: "Note not found" }, 404)
    }

    const { error: deleteError } = await supabaseAdmin
      .from("notes")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)

    if (deleteError) {
      throw deleteError
    }

    return jsonResponse({ success: true, id })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete note"
    return jsonResponse({ error: message }, 500)
  }
})
