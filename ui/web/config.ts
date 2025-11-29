export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
}

export const webOAuthRedirectUri =
  (typeof window !== 'undefined' ? window.location.origin : '') + '/auth/callback'
