/**
 * Mobile platform adapters
 * These adapters implement core interfaces for mobile-specific functionality
 */

export { storageAdapter, asyncStorageAdapter, secureStorageAdapter } from './storage'
export { oauthAdapter } from './oauth'
export { navigationAdapter } from './navigation'
export { supabaseClientFactory } from './supabaseClient'
export { getOAuthRedirectUrl, getSupabaseConfig } from './config'
