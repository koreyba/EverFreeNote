import type { SupabaseClient } from '@supabase/supabase-js'

import type { StorageAdapter } from './storage'
import type { SupabaseConfig } from './config'

export interface SupabaseClientFactoryDeps {
  storage: StorageAdapter
  fetch?: typeof fetch
}

export interface SupabaseClientFactory {
  createClient(config: SupabaseConfig, deps: SupabaseClientFactoryDeps): SupabaseClient
}
