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
  try {
    const parsedUrl = new URL(supabaseUrl || 'https://placeholder.supabase.co')
    const pathPart = normalizeUrlPath(parsedUrl.pathname)
    const rawKey = `everfreenote-auth-${parsedUrl.protocol}-${parsedUrl.hostname}-${parsedUrl.port || 'default'}-${pathPart}`
    return sanitizeStorageKeyPart(rawKey)
  } catch {
    return `everfreenote-auth-${sanitizeStorageKeyPart(supabaseUrl || 'default')}`
  }
}

export const webSupabaseClientFactory: SupabaseClientFactory = {
  createClient(config: SupabaseConfig): SupabaseClient {
    const url = config.url || 'https://placeholder.supabase.co'
    const anonKey = config.anonKey || 'placeholder'
    // createBrowserClient manages its own storage; deps.storage reserved for future explicit storage wiring if needed
    return createBrowserClient(url, anonKey, {
      auth: {
        storageKey: buildBrowserSupabaseStorageKey(url),
      },
    })
  },
}
