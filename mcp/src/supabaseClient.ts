import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/supabase/types";

// Cache client and user ID for the lifetime of the MCP server process.
// MCP servers are long-lived (one per user session), so we validate the JWT once
// at startup and reuse the client for all subsequent operations.
let cachedClient: SupabaseClient<Database> | null = null;
let cachedUserId: string | null = null;

/**
 * Get authenticated Supabase client with user JWT.
 * The JWT token is injected via global.headers.Authorization, which ensures
 * all database queries are authenticated. This pattern matches the rag-search
 * Edge Function implementation (see supabase/functions/rag-search).
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    throw new Error(
      "Missing required environment variables:\n" +
        "  - SUPABASE_URL\n" +
        "  - SUPABASE_ANON_KEY\n" +
        "  - SUPABASE_ACCESS_TOKEN\n\n" +
        "Please configure these in your MCP client settings.",
    );
  }

  // Create client with JWT injected via global headers.
  // The anon key is used for RLS policy evaluation, while the JWT determines
  // which user's data is accessible. This ensures all database queries automatically
  // respect Row Level Security policies without additional user_id filters.
  cachedClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  return cachedClient;
}

/**
 * Get the authenticated user's ID.
 * Calls auth.getUser() once at startup and caches the result for the server lifetime.
 * This validates the JWT token and ensures the user is properly authenticated.
 */
export async function getUserId(): Promise<string> {
  if (cachedUserId) {
    return cachedUserId;
  }

  const client = getSupabaseClient();
  const { data, error } = await client.auth.getUser();

  if (error || !data?.user) {
    throw new Error(
      "Failed to authenticate with provided SUPABASE_ACCESS_TOKEN.\n" +
        "Please check that your token is valid and not expired.\n" +
        `Details: ${error?.message ?? "No user data returned"}`,
    );
  }

  cachedUserId = data.user.id;
  return cachedUserId;
}
