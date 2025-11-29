import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'
import type { OAuthAdapter } from '@core/adapters/oauth'
import { mobileNavigationAdapter } from './navigation'

export const mobileOAuthAdapter: OAuthAdapter = {
  async startOAuth(redirectUri: string) {
    // Open auth in custom tab
    await WebBrowser.openAuthSessionAsync(redirectUri, AuthSession.maybeCompleteAuthSession().redirectUri ?? redirectUri)
    // Fallback to direct navigation if WebBrowser is not available
    await mobileNavigationAdapter.navigate(redirectUri)
  },
}
