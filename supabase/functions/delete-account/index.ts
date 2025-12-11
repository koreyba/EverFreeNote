/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const supabaseUrl = Deno.env.get("SUPABASE_URL")
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Function not configured" }), {
      status: 500,
      headers: corsHeaders,
    })
  }

  const authHeader = req.headers.get("Authorization")
  const token = authHeader?.replace("Bearer ", "")
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    })
  }

  // Admin client (service role)
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Validate user token
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      })
    }
    const user = userData.user

    // Delete user notes
    const { error: notesError } = await supabaseAdmin.from("notes").delete().eq("user_id", user.id)
    if (notesError) {
      throw notesError
    }

    // Delete the user account
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteError) {
      throw deleteError
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete account"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
