import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { SupabaseClientFactory, SupabaseClientFactoryDeps } from '@core/adapters/supabaseClient'
import type { SupabaseConfig } from '@core/adapters/config'

export const webSupabaseClientFactory: SupabaseClientFactory = {
  createClient(config: SupabaseConfig, deps: SupabaseClientFactoryDeps): SupabaseClient {
    // createBrowserClient manages its own storage; deps.storage reserved for future explicit storage wiring if needed
    return createBrowserClient(config.url, config.anonKey)
  },
}
