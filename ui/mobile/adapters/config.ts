import * as Linking from 'expo-linking'
import Constants from 'expo-constants'
import type { SupabaseConfig } from '@core/adapters/config'

/**
 * Get Supabase configuration from environment variables
 * In Expo, use .env file and expo-constants to access env vars
 */
export function getSupabaseConfig(): SupabaseConfig {
  const url = Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL
  const publishableKey =
    Constants.expoConfig?.extra?.supabasePublishableKey ??
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const anonKey =
    Constants.expoConfig?.extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  const key = publishableKey ?? anonKey
  const functionsUrl =
    Constants.expoConfig?.extra?.supabaseFunctionsUrl ??
    process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL

  if (!url || !key) {
    throw new Error(
      'Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy EXPO_PUBLIC_SUPABASE_ANON_KEY).'
    )
  }

  return {
    url,
    anonKey: key,
    functionsUrl: functionsUrl ?? url,
  }
}

export function getOAuthRedirectUrl(): string {
  const configured =
    Constants.expoConfig?.extra?.oauthRedirectUrl ?? process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URL
  if (configured && typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim()
  }

  const scheme = Constants.expoConfig?.scheme
  if (scheme && scheme.length > 0) {
    return `${scheme}://auth/callback`
  }

  return Linking.createURL('auth/callback')
}
