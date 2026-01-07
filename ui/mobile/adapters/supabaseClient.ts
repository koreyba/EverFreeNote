import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SupabaseClientFactory,
  SupabaseClientFactoryDeps,
} from '@core/adapters/supabaseClient'
import type { SupabaseConfig } from '@core/adapters/config'

/**
 * Mobile Supabase client factory
 * Uses AsyncStorage for session persistence via the storage adapter
 */
export const supabaseClientFactory: SupabaseClientFactory = {
  createClient(config: SupabaseConfig, deps: SupabaseClientFactoryDeps): SupabaseClient {
    return createClient(config.url, config.anonKey, {
      auth: {
        storage: deps.storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
      global: {
        fetch: deps.fetch ?? fetch,
      },
    })
  },
}
