import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/supabase/types'

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Supabase env var ${key} is not set`)
  }
  return value
}

export function createClient(): SupabaseClient<Database> {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
