import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { SupabaseClientFactory } from '@core/adapters/supabaseClient'
import type { SupabaseConfig } from '@core/adapters/config'

export function buildBrowserSupabaseStorageKey(supabaseUrl: string) {
  try {
    const parsedUrl = new URL(supabaseUrl)
    const pathPart = parsedUrl.pathname.replace(/\/+/g, '-').replace(/^-+|-+$/g, '') || 'root'
    const rawKey = `everfreenote-auth-${parsedUrl.protocol}-${parsedUrl.hostname}-${parsedUrl.port || 'default'}-${pathPart}`
    return rawKey.replace(/[^a-zA-Z0-9-]/g, '-')
  } catch {
    return `everfreenote-auth-${supabaseUrl.replace(/[^a-zA-Z0-9-]/g, '-')}`
  }
}

export const webSupabaseClientFactory: SupabaseClientFactory = {
  createClient(config: SupabaseConfig): SupabaseClient {
    // createBrowserClient manages its own storage; deps.storage reserved for future explicit storage wiring if needed
    return createBrowserClient(config.url, config.anonKey, {
      auth: {
        storageKey: buildBrowserSupabaseStorageKey(config.url),
      },
    })
  },
}
