/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"

declare const Deno: { env: { get(key: string): string | undefined } }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

/**
 * Verify HMAC signature from Lemon Squeezy webhook
 */
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  if (!signature || !secret) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  return expectedSignature === signature
}

type LemonSqueezyEvent =
  | "subscription_created"
  | "subscription_updated"
  | "subscription_cancelled"
  | "subscription_expired"
  | "subscription_payment_failed"

interface WebhookPayload {
  meta: {
    event_name: LemonSqueezyEvent
  }
  data: {
    id: string
    attributes: {
      customer_id: number
      status: string
      renews_at: string | null
      ends_at: string | null
    }
  }
  meta_custom_data?: {
    user_id?: string
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const webhookSecret = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET")

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing Supabase environment variables")
      return jsonResponse({ error: "Server configuration error" }, 500)
    }

    if (!webhookSecret) {
      console.error("Missing LEMONSQUEEZY_WEBHOOK_SECRET")
      return jsonResponse({ error: "Server configuration error" }, 500)
    }

    // Verify signature
    const signature = req.headers.get("X-Signature")
    const rawBody = await req.text()

    if (!signature) {
      console.error("Missing X-Signature header")
      return jsonResponse({ error: "Missing signature" }, 401)
    }

    const isValid = await verifySignature(rawBody, signature, webhookSecret)
    if (!isValid) {
      console.error("Invalid signature")
      return jsonResponse({ error: "Invalid signature" }, 401)
    }

    // Parse payload
    const payload: WebhookPayload = JSON.parse(rawBody)
    const eventName = payload.meta.event_name
    const subscriptionData = payload.data
    const userId = payload.meta_custom_data?.user_id

    if (!userId) {
      console.error("Missing user_id in custom data", { event: eventName, subscriptionId: subscriptionData.id })
      return jsonResponse({ error: "Missing user_id" }, 400)
    }

    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("Processing webhook", { event: eventName, userId, subscriptionId: subscriptionData.id })

    // Map Lemon Squeezy status to our status enum
    const mapStatus = (lsStatus: string): string => {
      const statusMap: Record<string, string> = {
        active: "active",
        cancelled: "cancelled",
        expired: "expired",
        past_due: "past_due",
        paused: "paused",
        unpaid: "unpaid",
      }
      return statusMap[lsStatus.toLowerCase()] || "cancelled"
    }

    // Handle webhook events
    switch (eventName) {
      case "subscription_created": {
        const { error } = await supabaseAdmin
          .from("user_subscriptions")
          .upsert({
            user_id: userId,
            plan: "paid",
            ls_subscription_id: subscriptionData.id,
            ls_customer_id: String(subscriptionData.attributes.customer_id),
            status: mapStatus(subscriptionData.attributes.status),
            current_period_end: subscriptionData.attributes.renews_at || subscriptionData.attributes.ends_at,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id",
          })

        if (error) {
          console.error("Failed to create subscription", { error, userId })
          return jsonResponse({ error: "Database error" }, 500)
        }

        console.log("Subscription created", { userId, subscriptionId: subscriptionData.id })
        break
      }

      case "subscription_updated": {
        const { error } = await supabaseAdmin
          .from("user_subscriptions")
          .update({
            status: mapStatus(subscriptionData.attributes.status),
            current_period_end: subscriptionData.attributes.renews_at || subscriptionData.attributes.ends_at,
            updated_at: new Date().toISOString(),
          })
          .eq("ls_subscription_id", subscriptionData.id)

        if (error) {
          console.error("Failed to update subscription", { error, subscriptionId: subscriptionData.id })
          return jsonResponse({ error: "Database error" }, 500)
        }

        console.log("Subscription updated", { subscriptionId: subscriptionData.id })
        break
      }

      case "subscription_cancelled": {
        const { error } = await supabaseAdmin
          .from("user_subscriptions")
          .update({
            status: "cancelled",
            current_period_end: subscriptionData.attributes.ends_at,
            updated_at: new Date().toISOString(),
          })
          .eq("ls_subscription_id", subscriptionData.id)

        if (error) {
          console.error("Failed to cancel subscription", { error, subscriptionId: subscriptionData.id })
          return jsonResponse({ error: "Database error" }, 500)
        }

        console.log("Subscription cancelled", { subscriptionId: subscriptionData.id })
        break
      }

      case "subscription_expired": {
        const { error } = await supabaseAdmin
          .from("user_subscriptions")
          .update({
            status: "expired",
            updated_at: new Date().toISOString(),
          })
          .eq("ls_subscription_id", subscriptionData.id)

        if (error) {
          console.error("Failed to expire subscription", { error, subscriptionId: subscriptionData.id })
          return jsonResponse({ error: "Database error" }, 500)
        }

        console.log("Subscription expired", { subscriptionId: subscriptionData.id })
        break
      }

      case "subscription_payment_failed": {
        const { error } = await supabaseAdmin
          .from("user_subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("ls_subscription_id", subscriptionData.id)

        if (error) {
          console.error("Failed to update payment failed status", { error, subscriptionId: subscriptionData.id })
          return jsonResponse({ error: "Database error" }, 500)
        }

        console.log("Subscription payment failed", { subscriptionId: subscriptionData.id })
        break
      }

      default:
        console.log("Unhandled event", { event: eventName })
        return jsonResponse({ message: "Event not handled" }, 200)
    }

    return jsonResponse({ success: true })
  } catch (error) {
    console.error("Webhook processing error", { error: error.message, stack: error.stack })
    return jsonResponse({ error: "Internal server error" }, 500)
  }
})
