import { AppState, type AppStateStatus } from 'react-native'
import { renderHook, act } from '@testing-library/react-native'
import { useOfflineSync } from '@ui/mobile/hooks/useOfflineSync'
import { useNetworkStatus } from '@ui/mobile/hooks/useNetworkStatus'
import { mobileSyncService } from '@ui/mobile/services/sync'

jest.mock('@ui/mobile/hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(),
}))

jest.mock('@ui/mobile/services/sync', () => ({
  mobileSyncService: {
    getManager: jest.fn(),
  },
}))

describe('useOfflineSync', () => {
  const mockUseNetworkStatus = useNetworkStatus as jest.Mock
  const mockMobileSyncService = mobileSyncService as jest.Mocked<typeof mobileSyncService>
  let appStateListener: ((status: AppStateStatus) => void) | null = null
  const mockRemoveSubscription = jest.fn()
  const mockDrainQueue = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    appStateListener = null
    mockUseNetworkStatus.mockReturnValue(true)
    mockMobileSyncService.getManager.mockReturnValue({
      drainQueue: mockDrainQueue,
    } as unknown as ReturnType<typeof mobileSyncService.getManager>)

    jest.spyOn(AppState, 'addEventListener').mockImplementation((type: string, listener: unknown) => {
      if (type === 'change') {
        appStateListener = listener as (status: AppStateStatus) => void
      }
      return { remove: mockRemoveSubscription } as ReturnType<typeof AppState.addEventListener>
    })
  })

  it('subscribes to AppState change on mount and unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useOfflineSync())

    expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(mockRemoveSubscription).not.toHaveBeenCalled()

    unmount()

    expect(mockRemoveSubscription).toHaveBeenCalledTimes(1)
  })

  it('calls mobileSyncService.getManager().drainQueue() when AppState becomes active and online', () => {
    mockUseNetworkStatus.mockReturnValue(true)
    renderHook(() => useOfflineSync())

    expect(appStateListener).not.toBeNull()

    act(() => {
      appStateListener?.('active')
    })

    expect(mockMobileSyncService.getManager).toHaveBeenCalledTimes(1)
    expect(mockDrainQueue).toHaveBeenCalledTimes(1)
  })

  it('does nothing when AppState changes to non-active states (background or inactive)', () => {
    mockUseNetworkStatus.mockReturnValue(true)
    renderHook(() => useOfflineSync())

    act(() => {
      appStateListener?.('background')
    })

    expect(mockMobileSyncService.getManager).not.toHaveBeenCalled()
    expect(mockDrainQueue).not.toHaveBeenCalled()

    act(() => {
      appStateListener?.('inactive')
    })

    expect(mockMobileSyncService.getManager).not.toHaveBeenCalled()
    expect(mockDrainQueue).not.toHaveBeenCalled()
  })

  it('does nothing when AppState becomes active but network is offline', () => {
    mockUseNetworkStatus.mockReturnValue(false)
    renderHook(() => useOfflineSync())

    act(() => {
      appStateListener?.('active')
    })

    expect(mockMobileSyncService.getManager).not.toHaveBeenCalled()
    expect(mockDrainQueue).not.toHaveBeenCalled()
  })

  it('safely handles exceptions when mobileSyncService.getManager() throws an error', () => {
    mockUseNetworkStatus.mockReturnValue(true)
    mockMobileSyncService.getManager.mockImplementation(() => {
      throw new Error('Sync manager not initialized')
    })

    renderHook(() => useOfflineSync())

    expect(() => {
      act(() => {
        appStateListener?.('active')
      })
    }).not.toThrow()

    expect(mockMobileSyncService.getManager).toHaveBeenCalledTimes(1)
    expect(mockDrainQueue).not.toHaveBeenCalled()
  })
})
