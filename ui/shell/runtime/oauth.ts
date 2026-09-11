import { Browser } from '@capacitor/browser'

import type { OAuthAdapter } from '@core/adapters/oauth'

/**
 * Opens the Supabase OAuth URL in an Android Custom Tab.
 *
 * Deliberately not the app's own WebView: Google rejects OAuth inside embedded
 * WebViews with `disallowed_useragent`. The Custom Tab shares Chrome's cookie jar, so
 * an already signed-in user usually skips the account chooser entirely.
 *
 * The return trip is handled by NativeShellProvider, which listens for the custom
 * scheme redirect and exchanges the code for a session.
 */
export const nativeOAuthAdapter: OAuthAdapter = {
  async startOAuth(authUrl: string): Promise<void> {
    await Browser.open({ url: authUrl })
  },
}
