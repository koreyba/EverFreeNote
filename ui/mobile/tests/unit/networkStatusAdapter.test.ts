import NetInfo, { NetInfoState } from '@react-native-community/netinfo'

jest.unmock('@ui/mobile/adapters/networkStatus')

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => jest.fn()),
}))

import {
  MobileNetworkStatusProvider,
  mobileNetworkStatusProvider,
} from '@ui/mobile/adapters/networkStatus'

describe('MobileNetworkStatusProvider', () => {
  const mockNetInfoFetch = NetInfo.fetch as jest.Mock
  const mockAddEventListener = NetInfo.addEventListener as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockNetInfoFetch.mockResolvedValue({ isConnected: true } as NetInfoState)
    mockAddEventListener.mockReturnValue(jest.fn())
  })

  it('defaults isOnline to true initially', () => {
    mockNetInfoFetch.mockReturnValue(new Promise(() => {}))
    const provider = new MobileNetworkStatusProvider()
    expect(provider.isOnline()).toBe(true)
  })

  it('updates isOnline based on initial NetInfo.fetch resolution', async () => {
    let resolveFetch!: (state: Partial<NetInfoState>) => void
    const fetchPromise = new Promise<Partial<NetInfoState>>((resolve) => {
      resolveFetch = resolve
    })
    mockNetInfoFetch.mockReturnValue(fetchPromise)

    const provider = new MobileNetworkStatusProvider()
    expect(provider.isOnline()).toBe(true)

    resolveFetch({ isConnected: false })
    await fetchPromise

    expect(provider.isOnline()).toBe(false)
  })

  it('handles null or undefined isConnected property from NetInfo', async () => {
    mockNetInfoFetch.mockResolvedValue({ isConnected: null } as unknown as NetInfoState)
    const provider = new MobileNetworkStatusProvider()

    await Promise.resolve()

    expect(provider.isOnline()).toBe(false)
  })

  it('subscribes to NetInfo changes and invokes callback with updated online status', () => {
    type NetInfoListener = (state: Partial<NetInfoState>) => void
    let listener!: NetInfoListener
    const unsubscribeMock = jest.fn()

    mockAddEventListener.mockImplementation((cb: NetInfoListener) => {
      listener = cb
      return unsubscribeMock
    })

    const provider = new MobileNetworkStatusProvider()
    const callback = jest.fn()

    const unsubscribe = provider.subscribe(callback)

    expect(mockAddEventListener).toHaveBeenCalledTimes(1)
    expect(unsubscribe).toBe(unsubscribeMock)

    listener({ isConnected: false })

    expect(provider.isOnline()).toBe(false)
    expect(callback).toHaveBeenCalledWith(false)

    listener({ isConnected: true })

    expect(provider.isOnline()).toBe(true)
    expect(callback).toHaveBeenCalledWith(true)
  })

  it('exports a singleton instance mobileNetworkStatusProvider', () => {
    expect(mobileNetworkStatusProvider).toBeInstanceOf(MobileNetworkStatusProvider)
    expect(typeof mobileNetworkStatusProvider.isOnline).toBe('function')
    expect(typeof mobileNetworkStatusProvider.subscribe).toBe('function')
  })
})
