import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClientFactory, SupabaseClientFactoryDeps } from '@core/adapters/supabaseClient'
import type { SupabaseConfig } from '@core/adapters/config'

// Use fetch polyfill if needed (cross-fetch) - assumed available in RN environment via Expo.
export const mobileSupabaseClientFactory: SupabaseClientFactory = {
  createClient(config: SupabaseConfig, deps: SupabaseClientFactoryDeps): SupabaseClient {
    return createClient(config.url, config.anonKey, {
      global: {
        fetch: deps.fetch ?? fetch,
      },
      auth: {
        storage: {
          getItem: deps.storage.getItem,
          setItem: deps.storage.setItem,
          removeItem: deps.storage.removeItem,
        },
      },
    })
  },
}
