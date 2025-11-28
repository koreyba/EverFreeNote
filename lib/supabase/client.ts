import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/supabase/types'

// Build-time fallbacks (useful if env не подхватился)
const FALLBACK_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const FALLBACK_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'REDACTED_JWT'

// For non-Next contexts (node scripts/tests) try to hydrate env from .env/.env.local.
// Guarded to avoid bundling dotenv into the browser.
function ensureEnvLoaded() {
  if (typeof window !== 'undefined') return
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('dotenv').config({ path: '.env.local' })
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('dotenv').config()
  } catch {
    // noop: dotenv may not be installed in all runtimes
  }
}

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    // Soft fallback to build-time defaults to avoid runtime crash in dev
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
      console.warn(`Supabase env var ${key} is not set, using fallback ${FALLBACK_SUPABASE_URL}`)
      return FALLBACK_SUPABASE_URL
    }
    if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
      console.warn('Supabase env var NEXT_PUBLIC_SUPABASE_ANON_KEY is not set, using fallback anon key')
      return FALLBACK_SUPABASE_ANON_KEY
    }
    throw new Error(`Supabase env var ${key} is not set`)
  }
  return value
}

export function createClient(): SupabaseClient<Database> {
  ensureEnvLoaded()
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
