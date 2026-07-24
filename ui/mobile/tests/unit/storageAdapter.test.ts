import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import {
  asyncStorageAdapter,
  secureStorageAdapter,
  storageAdapter,
} from '../../adapters/storage'

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}))

describe('storage adapters', () => {
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>
  const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('asyncStorageAdapter', () => {
    describe('getItem', () => {
      it('returns value from AsyncStorage.getItem', async () => {
        mockAsyncStorage.getItem.mockResolvedValueOnce('stored-value')

        const result = await asyncStorageAdapter.getItem('test-key')

        expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('test-key')
        expect(result).toBe('stored-value')
      })

      it('returns null when item is not found', async () => {
        mockAsyncStorage.getItem.mockResolvedValueOnce(null)

        const result = await asyncStorageAdapter.getItem('missing-key')

        expect(result).toBeNull()
      })

      it('logs error and returns null when AsyncStorage.getItem throws', async () => {
        const error = new Error('AsyncStorage failure')
        mockAsyncStorage.getItem.mockRejectedValueOnce(error)
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

        const result = await asyncStorageAdapter.getItem('error-key')

        expect(result).toBeNull()
        expect(consoleErrorSpy).toHaveBeenCalledWith('[AsyncStorage] getItem error:', error)

        consoleErrorSpy.mockRestore()
      })
    })

    describe('setItem', () => {
      it('calls AsyncStorage.setItem with key and value', async () => {
        mockAsyncStorage.setItem.mockResolvedValueOnce(undefined)

        await asyncStorageAdapter.setItem('key1', 'val1')

        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('key1', 'val1')
      })

      it('logs and re-throws error when AsyncStorage.setItem fails', async () => {
        const error = new Error('Disk full')
        mockAsyncStorage.setItem.mockRejectedValueOnce(error)
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

        await expect(asyncStorageAdapter.setItem('key1', 'val1')).rejects.toThrow('Disk full')
        expect(consoleErrorSpy).toHaveBeenCalledWith('[AsyncStorage] setItem error:', error)

        consoleErrorSpy.mockRestore()
      })
    })

    describe('removeItem', () => {
      it('calls AsyncStorage.removeItem with key', async () => {
        mockAsyncStorage.removeItem.mockResolvedValueOnce(undefined)

        await asyncStorageAdapter.removeItem('key1')

        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('key1')
      })

      it('logs and re-throws error when AsyncStorage.removeItem fails', async () => {
        const error = new Error('Remove failed')
        mockAsyncStorage.removeItem.mockRejectedValueOnce(error)
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

        await expect(asyncStorageAdapter.removeItem('key1')).rejects.toThrow('Remove failed')
        expect(consoleErrorSpy).toHaveBeenCalledWith('[AsyncStorage] removeItem error:', error)

        consoleErrorSpy.mockRestore()
      })
    })
  })

  describe('secureStorageAdapter', () => {
    describe('getItem', () => {
      it('returns value from SecureStore.getItemAsync', async () => {
        mockSecureStore.getItemAsync.mockResolvedValueOnce('secret-token')

        const result = await secureStorageAdapter.getItem('auth-token')

        expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('auth-token')
        expect(result).toBe('secret-token')
      })

      it('returns null when item is not found', async () => {
        mockSecureStore.getItemAsync.mockResolvedValueOnce(null)

        const result = await secureStorageAdapter.getItem('missing-token')

        expect(result).toBeNull()
      })

      it('logs error and returns null when SecureStore.getItemAsync throws', async () => {
        const error = new Error('Keychain inaccessible')
        mockSecureStore.getItemAsync.mockRejectedValueOnce(error)
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

        const result = await secureStorageAdapter.getItem('error-token')

        expect(result).toBeNull()
        expect(consoleErrorSpy).toHaveBeenCalledWith('[SecureStore] getItem error:', error)

        consoleErrorSpy.mockRestore()
      })
    })

    describe('setItem', () => {
      it('calls SecureStore.setItemAsync with WHEN_UNLOCKED_THIS_DEVICE_ONLY options', async () => {
        mockSecureStore.setItemAsync.mockResolvedValueOnce(undefined)

        await secureStorageAdapter.setItem('auth-token', 'my-secret')

        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('auth-token', 'my-secret', {
          keychainAccessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
        })
      })

      it('logs and re-throws error when SecureStore.setItemAsync fails', async () => {
        const error = new Error('SecureStore write error')
        mockSecureStore.setItemAsync.mockRejectedValueOnce(error)
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

        await expect(secureStorageAdapter.setItem('auth-token', 'my-secret')).rejects.toThrow(
          'SecureStore write error'
        )
        expect(consoleErrorSpy).toHaveBeenCalledWith('[SecureStore] setItem error:', error)

        consoleErrorSpy.mockRestore()
      })
    })

    describe('removeItem', () => {
      it('calls SecureStore.deleteItemAsync with key', async () => {
        mockSecureStore.deleteItemAsync.mockResolvedValueOnce(undefined)

        await secureStorageAdapter.removeItem('auth-token')

        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth-token')
      })

      it('logs and re-throws error when SecureStore.deleteItemAsync fails', async () => {
        const error = new Error('SecureStore delete error')
        mockSecureStore.deleteItemAsync.mockRejectedValueOnce(error)
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

        await expect(secureStorageAdapter.removeItem('auth-token')).rejects.toThrow(
          'SecureStore delete error'
        )
        expect(consoleErrorSpy).toHaveBeenCalledWith('[SecureStore] removeItem error:', error)

        consoleErrorSpy.mockRestore()
      })
    })
  })

  describe('storageAdapter export', () => {
    it('exports storageAdapter as asyncStorageAdapter', () => {
      expect(storageAdapter).toBe(asyncStorageAdapter)
    })
  })
})
