// @ts-nocheck — Deno types (Deno.env, URL imports) are not available in the Node.js TypeScript
// compiler used by the monorepo. There is no deno.json / import_map.json in this project.
// The `declare const Deno` below is kept for editor IntelliSense only.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

declare const Deno: { env: { get(key: string): string | undefined } }

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
const EMBEDDING_MODEL = "models/gemini-embedding-001"
const OUTPUT_DIMENSIONS = 1536
const CHUNK_SIZE = 1500
const CHUNK_OVERLAP = 200

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function chunkText(text: string): Array<{ content: string; charOffset: number }> {
  if (!text.trim()) return []
  const chunks: Array<{ content: string; charOffset: number }> = []
  let offset = 0
  while (offset < text.length) {
    const content = text.slice(offset, offset + CHUNK_SIZE)
    chunks.push({ content, charOffset: offset })
    if (content.length < CHUNK_SIZE) break
    offset += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks
}

function prepareNoteText(title: string, html: string): string {
  const body = stripHtml(html)
  return title.trim() ? `${title.trim()} ${body}` : body
}

// ---------------------------------------------------------------------------
// Embeddings via Gemini REST API
// ---------------------------------------------------------------------------
async function embedTexts(texts: string[], apiKey: string): Promise<number[][]> {
  const requests = texts.map((text) => ({
    model: EMBEDDING_MODEL,
    content: { parts: [{ text }] },
    taskType: "RETRIEVAL_DOCUMENT",
    outputDimensionality: OUTPUT_DIMENSIONS,
  }))

  const response = await fetch(
    `${GEMINI_API_BASE}/${EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Gemini batchEmbedContents failed: ${response.status} ${body}`)
  }

  const data = await response.json()
  return data.embeddings.map((e: { values: number[] }) => e.values)
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY")

  if (!supabaseUrl || !serviceRoleKey || !geminiApiKey) {
    return jsonResponse({ error: "Function not configured" }, 500)
  }

  // Auth
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return jsonResponse({ error: "Unauthorized" }, 401)

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) return jsonResponse({ error: "Unauthorized" }, 401)
  const userId = userData.user.id

  // Parse body
  let payload: { noteId?: string; action?: string } = {}
  try { payload = await req.json() } catch { /* empty body */ }

  const { noteId, action } = payload
  if (!noteId || typeof noteId !== "string") {
    return jsonResponse({ error: "Missing noteId" }, 400)
  }
  if (action !== "index" && action !== "delete") {
    return jsonResponse({ error: "action must be 'index' or 'delete'" }, 400)
  }

  // Verify note ownership
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(noteId)) return jsonResponse({ error: "Invalid noteId" }, 400)

  try {
    if (action === "delete") {
      const { error } = await supabaseAdmin
        .from("note_embeddings")
        .delete()
        .eq("note_id", noteId)
        .eq("user_id", userId)
      if (error) throw error
      return jsonResponse({ deleted: true })
    }

    // action === "index"
    const { data: note, error: noteError } = await supabaseAdmin
      .from("notes")
      .select("title, description")
      .eq("id", noteId)
      .eq("user_id", userId)
      .maybeSingle()

    if (noteError) throw noteError
    if (!note) return jsonResponse({ error: "Note not found" }, 404)

    const text = prepareNoteText(note.title ?? "", note.description ?? "")
    const chunks = chunkText(text)

    // Delete old chunks first
    await supabaseAdmin
      .from("note_embeddings")
      .delete()
      .eq("note_id", noteId)
      .eq("user_id", userId)

    if (chunks.length === 0) return jsonResponse({ chunkCount: 0 })

    // Embed
    const vectors = await embedTexts(chunks.map((c) => c.content), geminiApiKey)

    // Insert new chunks
    const rows = chunks.map((chunk, i) => ({
      note_id: noteId,
      user_id: userId,
      chunk_index: i,
      char_offset: chunk.charOffset,
      content: chunk.content,
      embedding: vectors[i],
    }))

    const { error: insertError } = await supabaseAdmin.from("note_embeddings").insert(rows)
    if (insertError) throw insertError

    return jsonResponse({ chunkCount: chunks.length })
  } catch (err) {
    console.error("[rag-index]", err)
    const isGeminiError = err instanceof Error && err.message.startsWith("Gemini")
    const userMessage = isGeminiError ? "Embedding service error — try again later" : "Internal error"
    return jsonResponse({ error: userMessage }, 500)
  }
})
