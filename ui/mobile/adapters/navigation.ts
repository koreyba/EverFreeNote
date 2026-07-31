import { router } from 'expo-router'
import type { NavigationAdapter } from '@core/adapters/navigation'

/**
 * Mobile navigation adapter using expo-router
 */
export const navigationAdapter: NavigationAdapter = {
  navigate(url: string, options?: { replace?: boolean }): void {
    try {
      if (options?.replace) {
        ;(router.replace as (url: string) => void)(url)
      } else {
        ;(router.push as (url: string) => void)(url)
      }
    } catch (error) {
      console.error('[Navigation] Error navigating to:', url, error)
      throw error
    }
  },
}
