import { router } from 'expo-router'
import type { NavigationAdapter } from '@core/adapters/navigation'

/**
 * Mobile navigation adapter using expo-router
 */
export const navigationAdapter: NavigationAdapter = {
  navigate(url: string, options?: { replace?: boolean }): void {
    try {
      if (options?.replace) {
        const replaceRoute = router.replace as (url: string) => void
        replaceRoute(url)
      } else {
        const pushRoute = router.push as (url: string) => void
        pushRoute(url)
      }
    } catch (error) {
      console.error('[Navigation] Error navigating to:', url, error)
      throw error
    }
  },
}
