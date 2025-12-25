import { router, Href } from 'expo-router'
import type { NavigationAdapter } from '@core/adapters/navigation'

/**
 * Mobile navigation adapter using expo-router
 */
export const navigationAdapter: NavigationAdapter = {
  navigate(url: string, options?: { replace?: boolean }): void {
    try {
      if (options?.replace) {
        router.replace(url as Href)
      } else {
        router.push(url as Href)
      }
    } catch (error) {
      console.error('[Navigation] Error navigating to:', url, error)
      throw error
    }
  },
}
