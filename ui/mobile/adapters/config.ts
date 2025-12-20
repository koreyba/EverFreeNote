import Constants from 'expo-constants'
import type { SupabaseConfig } from '@core/adapters/config'

/**
 * Get Supabase configuration from environment variables
 * In Expo, use .env file and expo-constants to access env vars
 */
export function getSupabaseConfig(): SupabaseConfig {
  const url = Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL
  const anonKey =
    Constants.expoConfig?.extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

  console.log('[SupabaseConfig] FROM ENV:', process.env.EXPO_PUBLIC_SUPABASE_URL);
  console.log('[SupabaseConfig] FROM EXTRA:', Constants.expoConfig?.extra?.supabaseUrl);
  console.log('[SupabaseConfig] FINAL URL:', url);

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env file'
    )
  }

  return {
    url,
    anonKey,
  }
}
