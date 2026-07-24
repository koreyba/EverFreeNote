import { act, renderHook } from '../testUtils'
import { mobileNetworkStatusProvider } from '@ui/mobile/adapters/networkStatus'

jest.unmock('@ui/mobile/hooks/useNetworkStatus')

import { useNetworkStatus } from '@ui/mobile/hooks/useNetworkStatus'

describe('hooks/useNetworkStatus', () => {
  const mockIsOnline = mobileNetworkStatusProvider.isOnline as jest.Mock
  const mockSubscribe = mobileNetworkStatusProvider.subscribe as jest.Mock
  const mockUnsubscribe = jest.fn()
  let currentCallback: ((online: boolean) => void) | null = null

  beforeEach(() => {
    jest.clearAllMocks()
    currentCallback = null
    mockIsOnline.mockReturnValue(true)
    mockSubscribe.mockImplementation((cb: (online: boolean) => void) => {
      currentCallback = cb
      return mockUnsubscribe
    })
  })

  it('returns initial online status as true when provider is online', () => {
    mockIsOnline.mockReturnValue(true)

    const { result } = renderHook(() => useNetworkStatus())

    expect(result.current).toBe(true)
    expect(mockSubscribe).toHaveBeenCalledTimes(1)
  })

  it('returns initial online status as false when provider is offline', () => {
    mockIsOnline.mockReturnValue(false)

    const { result } = renderHook(() => useNetworkStatus())

    expect(result.current).toBe(false)
  })

  it('updates state when subscription callback triggers', () => {
    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current).toBe(true)

    act(() => {
      currentCallback?.(false)
    })
    expect(result.current).toBe(false)

    act(() => {
      currentCallback?.(true)
    })
    expect(result.current).toBe(true)
  })

  it('unsubscribes from provider on unmount', () => {
    const { unmount } = renderHook(() => useNetworkStatus())

    expect(mockSubscribe).toHaveBeenCalledTimes(1)
    expect(mockUnsubscribe).not.toHaveBeenCalled()

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })
})
