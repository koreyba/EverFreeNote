/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"

import { resolveRagIndexingSettings } from "../../../core/rag/indexingSettings.ts"
import { resolveRagSearchSettings } from "../../../core/rag/searchSettings.ts"

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

const readAuthToken = (authHeader: string): string =>
  authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice("bearer ".length).trim()
    : ""

serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405)

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Function not configured" }, 500)

    const authHeader = req.headers.get("Authorization")?.trim() ?? ""
    const token = readAuthToken(authHeader)
    if (!token) return jsonResponse({ error: "Unauthorized" }, 401)

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) return jsonResponse({ error: "Unauthorized" }, 401)

    const { data, error } = await supabaseAdmin
      .from("user_api_keys")
      .select("gemini_api_key_encrypted")
      .eq("user_id", userData.user.id)
      .maybeSingle()

    const { data: ragIndexingData, error: ragIndexingError } = await supabaseAdmin
      .from("user_rag_index_settings")
      .select("target_chunk_size, min_chunk_size, max_chunk_size, overlap, use_title, use_section_headings, use_tags")
      .eq("user_id", userData.user.id)
      .maybeSingle()

    const { data: ragSearchData, error: ragSearchError } = await supabaseAdmin
      .from("user_rag_search_settings")
      .select("top_k, similarity_threshold")
      .eq("user_id", userData.user.id)
      .maybeSingle()

    if (error) {
      console.error("[api-keys-status]", error)
      return jsonResponse({ error: "Internal error" }, 500)
    }
    if (ragIndexingError) {
      console.error("[api-keys-status] Failed to load RAG indexing settings", ragIndexingError)
      return jsonResponse({ error: "Internal error" }, 500)
    }

    const ragSearchSettings = ragSearchError
      ? (console.warn("[api-keys-status] Falling back to default RAG retrieval settings", ragSearchError),
        resolveRagSearchSettings(null))
      : resolveRagSearchSettings(ragSearchData ?? null)

    return jsonResponse({
      gemini: { configured: Boolean(data?.gemini_api_key_encrypted) },
      ragIndexing: resolveRagIndexingSettings(ragIndexingData ?? null),
      ragSearch: ragSearchSettings,
    })
  } catch (err) {
    console.error("[api-keys-status]", err)
    return jsonResponse({ error: "Internal error" }, 500)
  }
})
