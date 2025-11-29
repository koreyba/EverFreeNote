import type { StorageAdapter } from '@core/adapters/storage'

export const webStorageAdapter: StorageAdapter = {
  async getItem(key: string) {
    return Promise.resolve(localStorage.getItem(key))
  },
  async setItem(key: string, value: string) {
    localStorage.setItem(key, value)
    return Promise.resolve()
  },
  async removeItem(key: string) {
    localStorage.removeItem(key)
    return Promise.resolve()
  },
}
