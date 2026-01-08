import { cleanup } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as ReactNative from 'react-native'

afterEach(() => {
  cleanup()
  jest.clearAllMocks()
})

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

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
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
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

jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light')

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
