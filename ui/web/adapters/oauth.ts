import type { OAuthAdapter } from '@core/adapters/oauth'
import { isNativeShell, shellOAuthRedirectUri } from '@ui/shell/runtime/platform'
import { webOAuthRedirectUri } from '@ui/web/config'
import { webNavigationAdapter } from './navigation'

export const webOAuthAdapter: OAuthAdapter = {
  async startOAuth(authUrl: string) {
    // assign, not replace: this is exactly what supabase-js does when it performs the
    // redirect itself (GoTrueClient calls window.location.assign), so routing through
    // the adapter leaves browser history behaving as it did before.
    webNavigationAdapter.navigate(authUrl)
  },
}

/**
 * In a browser the OAuth URL is opened by navigating the page. In the Android shell it
 * has to go to a Custom Tab instead, because Google refuses OAuth inside embedded
 * WebViews — so the native adapter is pulled in only when the shell is running.
 */
export async function resolveOAuthAdapter(): Promise<OAuthAdapter> {
  if (!isNativeShell()) return webOAuthAdapter

  const { nativeOAuthAdapter } = await import('@ui/shell/runtime/oauth')
  return nativeOAuthAdapter
}

/**
 * Where the provider should send the user back to. The browser returns to the app's
 * own origin; the shell returns through its custom scheme, which Android routes back
 * into the app. Both values must be registered in Supabase Auth → URL Configuration.
 */
export function resolveOAuthRedirectUri(): string {
  return isNativeShell() ? shellOAuthRedirectUri() : webOAuthRedirectUri
}
