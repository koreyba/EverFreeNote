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
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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

  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ code: "method_not_allowed", message: "Method not allowed" }, 405)
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ code: "function_not_configured", message: "Function not configured" }, 500)
  }

  const authHeader = req.headers.get("Authorization")
  const token = authHeader?.replace("Bearer ", "")
  if (!token) {
    return jsonResponse({ code: "unauthorized", message: "Unauthorized" }, 401)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return jsonResponse({ code: "unauthorized", message: "Unauthorized" }, 401)
    }

    const userId = userData.user.id

    const { data, error } = await supabaseAdmin
      .from("wordpress_integrations")
      .select("site_url, wp_username, wp_app_password_encrypted, enabled")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return jsonResponse({
        configured: false,
        integration: null,
      })
    }

    const hasPassword = typeof data.wp_app_password_encrypted === "string" && data.wp_app_password_encrypted.length > 0
    const configured = Boolean(data.enabled && data.site_url && data.wp_username && hasPassword)

    return jsonResponse({
      configured,
      integration: {
        siteUrl: data.site_url,
        wpUsername: data.wp_username,
        enabled: Boolean(data.enabled),
        hasPassword,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load WordPress settings"
    return jsonResponse({ code: "settings_status_failed", message }, 500)
  }
})
