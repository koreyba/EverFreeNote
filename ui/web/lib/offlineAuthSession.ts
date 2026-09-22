import { combineChunks, parseCookieHeader, stringFromBase64URL } from '@supabase/ssr'
import type { Session, User } from '@supabase/supabase-js'
import { buildBrowserSupabaseStorageKey } from '@ui/web/adapters/supabaseClient'

function tokenClaims(accessToken: string) {
  try {
    return JSON.parse(stringFromBase64URL(accessToken.split('.')[1])) as { iss?: string; sub?: string }
  } catch {
    return null
  }
}

export function sessionUserForProject(session: Session | null, url: string): User | null {
  if (session?.access_token && tokenClaims(session.access_token)?.iss !== `${url}/auth/v1`) return null
  return session?.user ?? null
}

/** Local UI identity only: remote requests still use Supabase authentication and RLS. */
export async function readOfflineSessionUser(url: string): Promise<User | null> {
  try {
    const cookies = parseCookieHeader(document.cookie)
    const encoded = await combineChunks(buildBrowserSupabaseStorageKey(url), async (name) => (
      cookies.find((cookie) => cookie.name === name)?.value ?? null
    ))
    if (!encoded) return null
    const json = encoded.startsWith('base64-') ? stringFromBase64URL(encoded.slice(7)) : encoded
    const session = JSON.parse(json) as Session
    if (typeof session.access_token !== 'string' || typeof session.refresh_token !== 'string') return null
    const user = sessionUserForProject(session, url)
    return user?.id && tokenClaims(session.access_token)?.sub === user.id ? user : null
  } catch {
    // Missing, inaccessible or malformed storage must still allow the sign-in screen.
    return null
  }
}
