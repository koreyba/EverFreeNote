import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/supabase/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase env vars NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are not set. Check .env.local and build environment.'
  )
}

// Keep a single browser client instance across imports to avoid duplicate subscriptions/auth listeners.
let cachedClient: SupabaseClient<Database> | null = null

export function createClient(): SupabaseClient<Database> {
  if (!cachedClient) {
    cachedClient = createBrowserClient<Database>(supabaseUrl as string, supabaseAnonKey as string)
  }
  return cachedClient
}
