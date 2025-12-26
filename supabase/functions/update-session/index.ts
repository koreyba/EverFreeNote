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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

const contentSizeBytes = (value: string) => new TextEncoder().encode(value).length

const MAX_CONTENT_BYTES = 50 * 1024

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

  let payload: Record<string, unknown> | null = null
  try {
    payload = await req.json()
  } catch {
    payload = null
  }

  const id = typeof payload?.id === "string" ? payload.id.trim() : ""
  const mode = typeof payload?.mode === "string" ? payload.mode.trim() : ""
  const rawTopic = typeof payload?.topic === "string" ? payload.topic : ""
  const topic = rawTopic.trim()
  const content = typeof payload?.content === "string" ? payload.content : ""
  const appendText = typeof payload?.append === "string" ? payload.append : ""
  const contentTrimmed = content.trim()
  const appendTrimmed = appendText.trim()

  if (!id) {
    return jsonResponse({ error: "Missing id" }, 400)
  }

  if (!mode || (mode !== "replace" && mode !== "append")) {
    return jsonResponse({ error: "Invalid mode" }, 400)
  }

  if (mode === "replace" && !contentTrimmed) {
    return jsonResponse({ error: "Missing content" }, 400)
  }

  if (mode === "append" && !appendTrimmed) {
    return jsonResponse({ error: "Missing append text" }, 400)
  }

  if (rawTopic && !topic) {
    return jsonResponse({ error: "Invalid topic" }, 400)
  }

  if (mode === "replace" && contentTrimmed && contentSizeBytes(contentTrimmed) > MAX_CONTENT_BYTES) {
    return jsonResponse({ error: "Content exceeds 50KB limit" }, 400)
  }

  const userId = defaultUserId || null
  if (!userId) {
    return jsonResponse({ error: "Missing COACHING_USER_ID" }, 500)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
    const updates: Record<string, unknown> = {}

    if (mode === "replace") {
      updates.description = contentTrimmed
    }

    if (mode === "append" || topic) {
      const { data: noteRow, error: noteError } = await supabaseAdmin
        .from("notes")
        .select("created_at, description")
        .eq("id", id)
        .eq("user_id", userId)
        .contains("tags", [CLAUDE_TAG])
        .maybeSingle()

      if (noteError) {
        throw noteError
      }

      if (!noteRow?.created_at) {
        return jsonResponse({ error: "Session not found" }, 404)
      }

      if (mode === "append") {
        const existing = typeof noteRow.description === "string" ? noteRow.description : ""
        const separator = existing ? "\n\n" : ""
        const nextDescription = `${existing}${separator}${appendTrimmed}`

        if (contentSizeBytes(nextDescription) > MAX_CONTENT_BYTES) {
          return jsonResponse({ error: "Content exceeds 50KB limit" }, 400)
        }

        updates.description = nextDescription
      }

      if (topic) {
        const dateStamp = new Date(noteRow.created_at).toISOString().slice(0, 10)
        updates.title = `Session ${dateStamp} - ${topic}`
      }
    }

    const { data, error } = await supabaseAdmin
      .from("notes")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .contains("tags", [CLAUDE_TAG])
      .select("id, title, description, tags, created_at, updated_at, user_id")

    if (error) {
      throw error
    }

    const note = data?.[0]
    if (!note) {
      return jsonResponse({ error: "Session not found" }, 404)
    }

    return jsonResponse({ success: true, note })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update session"
    return jsonResponse({ error: message }, 500)
  }
})
