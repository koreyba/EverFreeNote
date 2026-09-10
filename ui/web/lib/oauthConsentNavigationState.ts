// Bridge for the OAuth 2.1 consent flow across a Google sign-in redirect.
//
// Supabase Auth sends the browser to /oauth/consent?authorization_id=… . If the
// user is signed out, Google sign-in leaves the page and comes back through
// /auth/callback, which normally lands on "/". We remember the pending
// authorization id in sessionStorage so the callback can return to the consent
// page instead.

const STORAGE_KEY = 'everfreenote:oauth-consent-authorization-id'
const AUTHORIZATION_ID_PATTERN = /^[A-Za-z0-9._~-]{1,255}$/

export const OAUTH_CONSENT_PATH = '/oauth/consent'

function getSessionStorage(): Storage | null {
  if (typeof globalThis.window === 'undefined') return null

  try {
    return globalThis.window.sessionStorage
  } catch {
    return null
  }
}

export function isValidAuthorizationId(value: unknown): value is string {
  return typeof value === 'string' && AUTHORIZATION_ID_PATTERN.test(value)
}

export function buildOAuthConsentPath(authorizationId: string): string {
  return `${OAUTH_CONSENT_PATH}?authorization_id=${encodeURIComponent(authorizationId)}`
}

export function saveOAuthConsentAuthorizationId(authorizationId: string): boolean {
  if (!isValidAuthorizationId(authorizationId)) return false

  const storage = getSessionStorage()
  if (!storage) return false

  try {
    storage.setItem(STORAGE_KEY, authorizationId)
    return true
  } catch {
    return false
  }
}

export function readOAuthConsentAuthorizationId(): string | null {
  const storage = getSessionStorage()
  if (!storage) return null

  try {
    const value = storage.getItem(STORAGE_KEY)
    return isValidAuthorizationId(value) ? value : null
  } catch {
    return null
  }
}

export function clearOAuthConsentAuthorizationId(): void {
  const storage = getSessionStorage()
  if (!storage) return

  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // Best-effort cleanup; the id is harmless if it lingers.
  }
}

/** Returns the consent path to resume, clearing the stored id. `null` when nothing is pending. */
export function consumeOAuthConsentReturnPath(): string | null {
  const authorizationId = readOAuthConsentAuthorizationId()
  clearOAuthConsentAuthorizationId()
  return authorizationId ? buildOAuthConsentPath(authorizationId) : null
}
