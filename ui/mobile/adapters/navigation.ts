import { router } from 'expo-router'
import type { NavigationAdapter } from '@core/adapters/navigation'

const replaceRoute = router.replace as (url: string) => void
const pushRoute = router.push as (url: string) => void

/**
 * Mobile navigation adapter using expo-router
 */
export const navigationAdapter: NavigationAdapter = {
  navigate(url: string, options?: { replace?: boolean }): void {
    try {
      if (options?.replace) {
        replaceRoute(url)
      } else {
        pushRoute(url)
      }
    } catch (error) {
      console.error('[Navigation] Error navigating to:', url, error)
      throw error
    }
  },
}
