import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import type { StorageAdapter } from '@core/adapters/storage'

/**
 * Mobile storage adapter using AsyncStorage for non-sensitive data
 */
export const asyncStorageAdapter: StorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key)
    } catch (error) {
      console.error('[AsyncStorage] getItem error:', error)
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value)
    } catch (error) {
      console.error('[AsyncStorage] setItem error:', error)
      throw error
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key)
    } catch (error) {
      console.error('[AsyncStorage] removeItem error:', error)
      throw error
    }
  },
}

/**
 * Secure storage adapter for sensitive data (tokens, credentials)
 * Uses device keychain/keystore
 */
export const secureStorageAdapter: StorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key)
    } catch (error) {
      console.error('[SecureStore] getItem error:', error)
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      })
    } catch (error) {
      console.error('[SecureStore] setItem error:', error)
      throw error
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key)
    } catch (error) {
      console.error('[SecureStore] removeItem error:', error)
      throw error
    }
  },
}

/**
 * Default storage adapter - uses AsyncStorage for general storage
 * Use secureStorageAdapter for auth tokens and sensitive data
 */
export const storageAdapter = asyncStorageAdapter
