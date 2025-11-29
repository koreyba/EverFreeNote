import type { OAuthAdapter } from '@core/adapters/oauth'
import { webNavigationAdapter } from './navigation'

export const webOAuthAdapter: OAuthAdapter = {
  async startOAuth(redirectUri: string) {
    webNavigationAdapter.navigate(redirectUri, { replace: true })
  },
}
