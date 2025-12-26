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

const formatSessionTitle = (topic: string) => {
  const dateStamp = new Date().toISOString().slice(0, 10)
  return `Session ${dateStamp} - ${topic}`
}

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

  const topic = typeof payload?.topic === "string" ? payload.topic.trim() : ""
  const content =
    typeof payload?.content === "string"
      ? payload.content.trim()
      : typeof payload?.description === "string"
        ? payload.description.trim()
        : ""

  if (!topic || !content) {
    return jsonResponse({ error: "Missing topic or content" }, 400)
  }

  if (contentSizeBytes(content) > MAX_CONTENT_BYTES) {
    return jsonResponse({ error: "Content exceeds 50KB limit" }, 400)
  }

  const userId = defaultUserId || null
  if (!userId) {
    return jsonResponse({ error: "Missing COACHING_USER_ID" }, 500)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
    const { data, error } = await supabaseAdmin
      .from("notes")
      .insert([
        {
          title: formatSessionTitle(topic),
          description: content,
          tags: [CLAUDE_TAG],
          user_id: userId,
        },
      ])
      .select("id, title, description, tags, created_at, updated_at, user_id")
      .single()

    if (error) {
      throw error
    }

    return jsonResponse({ success: true, note: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save session"
    return jsonResponse({ error: message }, 500)
  }
})
