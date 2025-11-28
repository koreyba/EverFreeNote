import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/supabase/types'

// Next.js инлайнит NEXT_PUBLIC_* переменные на этапе сборки.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase env vars NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are not set. Check .env.local и перезапусти dev/build.'
  )
}

export function createClient(): SupabaseClient<Database> {
  return createBrowserClient<Database>(supabaseUrl as string, supabaseAnonKey as string)
}
