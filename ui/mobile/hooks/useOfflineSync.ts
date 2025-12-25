import { useEffect } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { mobileSyncService } from '@ui/mobile/services/sync'
import { useNetworkStatus } from './useNetworkStatus'

export function useOfflineSync() {
  const isOnline = useNetworkStatus()

  useEffect(() => {
    const handleAppState = (nextAppState: AppStateStatus) => {
      if (nextAppState !== 'active') return
      if (!isOnline) return

      try {
        void mobileSyncService.getManager().drainQueue()
      } catch {
        // Sync manager may not be initialized yet (e.g. before auth session is ready).
      }
    }

    const subscription = AppState.addEventListener('change', handleAppState)
    return () => {
      subscription.remove()
    }
  }, [isOnline])
}

