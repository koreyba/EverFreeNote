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

const parsePayload = async (req: Request): Promise<Record<string, unknown> | null> => {
  try {
    return await req.json()
  } catch {
    return null
  }
}

const getNoteFields = (payload: Record<string, unknown> | null) => ({
  id: typeof payload?.id === "string" ? payload.id.trim() : undefined,
  title: typeof payload?.title === "string" ? payload.title : "Untitled",
  description: typeof payload?.description === "string" ? payload.description : "",
  tags: Array.isArray(payload?.tags)
    ? payload.tags.filter((t: unknown) => typeof t === "string")
    : [],
})

const isValidNoteId = (id: string | undefined) => {
  if (id === undefined) {
    return true
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

const createNotePayload = (
  fields: ReturnType<typeof getNoteFields>,
  userId: string,
) => {
  const insertPayload: Record<string, unknown> = {
    title: fields.title,
    description: fields.description,
    tags: fields.tags,
    user_id: userId,
  }
  if (fields.id) {
    insertPayload.id = fields.id
  }
  return insertPayload
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

    const fields = getNoteFields(await parsePayload(req))
    if (!isValidNoteId(fields.id)) {
      return jsonResponse({ error: "Invalid id format, must be UUID" }, 400)
    }

    const insertPayload = createNotePayload(fields, userId)

    const { data, error } = await supabaseAdmin
      .from("notes")
      .insert([insertPayload])
      .select("id, title, description, tags, created_at, updated_at, user_id")
      .single()

    if (error) {
      throw error
    }

    return jsonResponse({ success: true, note: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create note"
    return jsonResponse({ error: message }, 500)
  }
})
