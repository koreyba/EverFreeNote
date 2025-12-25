import type { OAuthAdapter } from '@core/adapters/oauth'
import { webNavigationAdapter } from './navigation'

export const webOAuthAdapter: OAuthAdapter = {
  async startOAuth(authUrl: string) {
    webNavigationAdapter.navigate(authUrl, { replace: true })
  },
}
