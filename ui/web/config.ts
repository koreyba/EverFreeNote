export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
}

// The redirect for a browser sign-in, where returning to the serving origin is correct.
// The shell uses its custom scheme instead — see ui/web/adapters/oauth.ts.
export const webOAuthRedirectUri =
  // eslint-disable-next-line no-restricted-syntax -- browser-only redirect target
  (typeof window !== 'undefined' ? window.location.origin : '') + '/auth/callback'
