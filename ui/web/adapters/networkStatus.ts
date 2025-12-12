import type { NetworkStatusProvider } from '@core/types/offline'

const isBrowser = typeof window !== 'undefined'

export const webNetworkStatus: NetworkStatusProvider = {
  isOnline() {
    if (!isBrowser) return true
    return navigator.onLine
  },
  subscribe(callback) {
    if (!isBrowser) {
      callback(true)
      return () => {}
    }
    const handleOnline = () => callback(true)
    const handleOffline = () => callback(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  },
}
