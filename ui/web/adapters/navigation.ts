import type { NavigationAdapter } from '@core/adapters/navigation'

export const webNavigationAdapter: NavigationAdapter = {
  navigate(url: string, options?: { replace?: boolean }) {
    if (options?.replace) {
      window.location.replace(url)
    } else {
      window.location.assign(url)
    }
  },
}
