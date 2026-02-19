import { act, cleanup } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as ReactNative from 'react-native'
import { notifyManager } from '@tanstack/react-query'

afterEach(() => {
  cleanup()
  jest.clearAllMocks()
})

notifyManager.setNotifyFunction((notify) => {
  act(notify)
})

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: () => ({}),
    useSharedValue: (initial: unknown) => ({ value: initial }),
    withTiming: (value: unknown) => value,
    withSpring: (value: unknown) => value,
  }
})

jest.mock('@react-navigation/bottom-tabs', () => ({
  useBottomTabBarHeight: () => 50,
}))

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}))

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
}))

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}))

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock')
  return mock.default ?? mock
})

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useNavigation: () => ({ setOptions: jest.fn() }),
}))

jest.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: jest.fn(() =>
      Promise.resolve({
        isConnected: true,
        isInternetReachable: true,
      })
    ),
    addEventListener: jest.fn(() => jest.fn()),
  },
  addEventListener: jest.fn(() => jest.fn()),
}))

jest.mock('@ui/mobile/adapters/networkStatus', () => ({
  mobileNetworkStatusProvider: {
    isOnline: jest.fn(() => true),
    subscribe: jest.fn(() => {
      // Return unsubscribe function
      return jest.fn()
    }),
  },
}))

jest.mock('@ui/mobile/hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(() => true), // Online by default
}))

jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light')
jest.spyOn(ReactNative.Keyboard, 'addListener').mockImplementation((_eventType, _listener) => {
  return { remove: jest.fn() } as unknown as ReactNative.EmitterSubscription
})

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>
mockAsyncStorage.setItem.mockResolvedValue(undefined)
mockAsyncStorage.getItem.mockResolvedValue(null)

globalThis.fetch = jest.fn() as unknown as typeof fetch

jest.mock('isomorphic-dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: jest.fn((html: string, config?: { ALLOWED_TAGS?: string[] }) => {
      if (!config?.ALLOWED_TAGS) {
        return html
      }
      if (config.ALLOWED_TAGS.length === 0) {
        // stripHtml - remove all tags
        return html.replace(/<[^>]*>/g, '')
      }
      // Basic sanitization mock - remove dangerous tags
      return html
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/on\w+='[^']*'/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/<(object|embed|form|input|button)[^>]*>/gi, '')
    }),
  },
}))
