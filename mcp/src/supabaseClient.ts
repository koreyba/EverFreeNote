import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/supabase/types'

let cachedClient: SupabaseClient<Database> | null = null
let cachedUserId: string | null = null

/**
 * Get authenticated Supabase client with user JWT.
 * The JWT is injected via global.headers.Authorization.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (cachedClient) {
    return cachedClient
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN

  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    throw new Error(
      'Missing required environment variables:\n' +
      '  - SUPABASE_URL\n' +
      '  - SUPABASE_ANON_KEY\n' +
      '  - SUPABASE_ACCESS_TOKEN\n\n' +
      'Please configure these in your MCP client settings.'
    )
  }

  // Create client with JWT injected via global headers
  // This pattern matches the rag-search Edge Function (line 226-228)
  cachedClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })

  return cachedClient
}

/**
 * Get the authenticated user's ID.
 * Calls auth.getUser() once and caches the result.
 */
export async function getUserId(): Promise<string> {
  if (cachedUserId) {
    return cachedUserId
  }

  const client = getSupabaseClient()
  const { data, error } = await client.auth.getUser()

  if (error || !data?.user) {
    throw new Error(
      'Failed to authenticate with provided SUPABASE_ACCESS_TOKEN.\n' +
      'Please check that your token is valid and not expired.\n' +
      `Details: ${error?.message ?? 'No user data returned'}`
    )
  }

  cachedUserId = data.user.id
  return cachedUserId
}
