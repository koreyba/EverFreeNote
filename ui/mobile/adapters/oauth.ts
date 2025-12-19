import * as WebBrowser from 'expo-web-browser'
import type { OAuthAdapter } from '@core/adapters/oauth'

/**
 * Mobile OAuth adapter using expo-web-browser
 * Opens OAuth flow in system browser or in-app browser
 */
export const oauthAdapter: OAuthAdapter = {
  async startOAuth(redirectUri: string): Promise<void> {
    try {
      // Warm up browser for better UX (optional but recommended)
      await WebBrowser.warmUpAsync()

      // Open OAuth URL in browser
      const result = await WebBrowser.openAuthSessionAsync(redirectUri, 'everfreenote://')

      // Cool down browser
      await WebBrowser.coolDownAsync()

      if (result.type === 'cancel') {
        // User cancelled authentication - silent log removed
      } else if (result.type === 'success') {
        // Authentication successful - URL handling is done via deep linking
        // see app/(auth)/callback.tsx
      }
    } catch (error) {
      console.error('[OAuth] Error starting OAuth flow:', error)
      throw error
    }
  },
}
