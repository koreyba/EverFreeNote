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
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => jest.fn()),
}))

jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light')

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>
mockAsyncStorage.setItem.mockResolvedValue(undefined)
mockAsyncStorage.getItem.mockResolvedValue(null)

globalThis.fetch = jest.fn() as unknown as typeof fetch
