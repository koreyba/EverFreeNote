import * as WebBrowser from 'expo-web-browser'
import type { OAuthAdapter } from '@core/adapters/oauth'

/**
 * Placeholder OAuth adapter for RN/Expo.
 * TODO: Integrate with real Supabase signInWithOAuth flow (generate provider URL, open it, handle callback via deep link).
 */
export const mobileOAuthAdapter: OAuthAdapter = {
  async startOAuth(authUrl: string) {
    // Open auth URL in custom tab; expect redirect back to deep link
    await WebBrowser.openAuthSessionAsync(authUrl, authUrl)
  },
}
