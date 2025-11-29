import { Linking } from 'react-native'
import type { NavigationAdapter } from '@core/adapters/navigation'

export const mobileNavigationAdapter: NavigationAdapter = {
  async navigate(url: string) {
    await Linking.openURL(url)
  },
}
