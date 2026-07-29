import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { SupabaseClientFactory } from '@core/adapters/supabaseClient'
import type { SupabaseConfig } from '@core/adapters/config'

function sanitizeStorageKeyPart(value: string) {
  let sanitized = ''
  const str = typeof value === 'string' ? value : String(value ?? '')

  for (const character of str) {
    const isAsciiLetter = (character >= 'a' && character <= 'z') || (character >= 'A' && character <= 'Z')
    const isDigit = character >= '0' && character <= '9'
    sanitized += isAsciiLetter || isDigit || character === '-' ? character : '-'
  }

  return sanitized
}

function normalizeUrlPath(pathname: string) {
  const segments = pathname.split('/').filter((segment) => segment.length > 0)
  return segments.join('-') || 'root'
}

export function buildBrowserSupabaseStorageKey(supabaseUrl: string) {
  if (!supabaseUrl) {
    throw new Error(
      "Missing required parameter 'NEXT_PUBLIC_SUPABASE_URL'. Please check if it is set in your .env / .env.local file."
    )
  }
  try {
    const parsedUrl = new URL(supabaseUrl)
    const pathPart = normalizeUrlPath(parsedUrl.pathname)
    const rawKey = `everfreenote-auth-${parsedUrl.protocol}-${parsedUrl.hostname}-${parsedUrl.port || 'default'}-${pathPart}`
    return sanitizeStorageKeyPart(rawKey)
  } catch {
    return `everfreenote-auth-${sanitizeStorageKeyPart(supabaseUrl)}`
  }
}

export const webSupabaseClientFactory: SupabaseClientFactory = {
  createClient(config: SupabaseConfig): SupabaseClient {
    const url = config?.url?.trim()
    const anonKey = config?.anonKey?.trim()

    const missing: string[] = []
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    if (missing.length > 0) {
      throw new Error(
        `Missing required Supabase configuration parameter(s): ${missing.join(', ')}. Please check if they are set in your .env / .env.local file.`
      )
    }

    // createBrowserClient manages its own storage; deps.storage reserved for future explicit storage wiring if needed
    return createBrowserClient(config.url, config.anonKey, {
      auth: {
        storageKey: buildBrowserSupabaseStorageKey(config.url),
      },
    })
  },
}
