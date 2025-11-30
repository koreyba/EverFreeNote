export const mobileSupabaseConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL as string,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string,
}

export const mobileOAuthRedirectUri = 'everfreenote://auth/callback'
