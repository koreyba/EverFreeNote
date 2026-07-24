import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  getSearchHistory,
  addSearchHistoryItem,
  clearSearchHistory,
} from '@ui/mobile/services/searchHistory'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

describe('searchHistory service', () => {
  const userId = 'user-123'
  const expectedStorageKey = `everfreenote.searchHistory.${userId}`
  const mockStorage: Record<string, string> = {}

  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key]
    }

    ;(AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => mockStorage[key] ?? null)
    ;(AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
      mockStorage[key] = value
    })
    ;(AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
      delete mockStorage[key]
    })
  })

  describe('getSearchHistory', () => {
    it('returns an empty array when storage is empty', async () => {
      const history = await getSearchHistory(userId)
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(expectedStorageKey)
      expect(history).toEqual([])
    })

    it('returns stored search history array', async () => {
      const mockData = ['react native', 'typescript']
      mockStorage[expectedStorageKey] = JSON.stringify(mockData)

      const history = await getSearchHistory(userId)
      expect(history).toEqual(['react native', 'typescript'])
    })

    it('filters out empty or whitespace-only items', async () => {
      const mockData = ['react', '  ', '', 'jest']
      mockStorage[expectedStorageKey] = JSON.stringify(mockData)

      const history = await getSearchHistory(userId)
      expect(history).toEqual(['react', 'jest'])
    })

    it('limits returned items to max 10 items', async () => {
      const mockData = Array.from({ length: 15 }, (_, i) => `item-${i + 1}`)
      mockStorage[expectedStorageKey] = JSON.stringify(mockData)

      const history = await getSearchHistory(userId)
      expect(history).toHaveLength(10)
      expect(history).toEqual([
        'item-1',
        'item-2',
        'item-3',
        'item-4',
        'item-5',
        'item-6',
        'item-7',
        'item-8',
        'item-9',
        'item-10',
      ])
    })

    it('handles non-string elements gracefully', async () => {
      const mockData = [123, 'valid query', true]
      mockStorage[expectedStorageKey] = JSON.stringify(mockData)

      const history = await getSearchHistory(userId)
      expect(history).toEqual(['123', 'valid query', 'true'])
    })

    it('returns empty array if parsed JSON is not an array', async () => {
      mockStorage[expectedStorageKey] = JSON.stringify({ key: 'value' })

      const history = await getSearchHistory(userId)
      expect(history).toEqual([])
    })

    it('returns empty array on invalid JSON', async () => {
      mockStorage[expectedStorageKey] = 'invalid-json{'

      const history = await getSearchHistory(userId)
      expect(history).toEqual([])
    })
  })

  describe('addSearchHistoryItem', () => {
    it('does not add items with length less than 2', async () => {
      mockStorage[expectedStorageKey] = JSON.stringify(['existing'])

      const resultEmpty = await addSearchHistoryItem(userId, '')
      expect(resultEmpty).toEqual(['existing'])

      const resultWhitespace = await addSearchHistoryItem(userId, '   ')
      expect(resultWhitespace).toEqual(['existing'])

      const resultSingleChar = await addSearchHistoryItem(userId, ' a ')
      expect(resultSingleChar).toEqual(['existing'])
    })

    it('adds a valid item to the front of history', async () => {
      mockStorage[expectedStorageKey] = JSON.stringify(['old query'])

      const updated = await addSearchHistoryItem(userId, 'new query')
      expect(updated).toEqual(['new query', 'old query'])
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expectedStorageKey,
        JSON.stringify(['new query', 'old query'])
      )
    })

    it('trims whitespace when adding a query', async () => {
      const updated = await addSearchHistoryItem(userId, '  search term  ')
      expect(updated).toEqual(['search term'])
    })

    it('normalizes duplicates (case-insensitive and trimmed)', async () => {
      mockStorage[expectedStorageKey] = JSON.stringify(['React Native', 'TypeScript'])

      const updated = await addSearchHistoryItem(userId, '  react native  ')
      expect(updated).toEqual(['react native', 'TypeScript'])
    })

    it('limits history to max 10 items when adding', async () => {
      const existing = Array.from({ length: 10 }, (_, i) => `item-${i + 1}`)
      mockStorage[expectedStorageKey] = JSON.stringify(existing)

      const updated = await addSearchHistoryItem(userId, 'item-new')
      expect(updated).toHaveLength(10)
      expect(updated[0]).toBe('item-new')
      expect(updated[9]).toBe('item-9')
      expect(updated).not.toContain('item-10')
    })
  })

  describe('clearSearchHistory', () => {
    it('removes history from storage', async () => {
      mockStorage[expectedStorageKey] = JSON.stringify(['query1', 'query2'])

      await clearSearchHistory(userId)
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(expectedStorageKey)

      const history = await getSearchHistory(userId)
      expect(history).toEqual([])
    })
  })
})
