import AsyncStorage from '@react-native-async-storage/async-storage'

const maxItems = 10

const storageKey = (userId: string) => `everfreenote.searchHistory.${userId}`

const normalizeQuery = (query: string) => query.trim().toLowerCase()

export async function getSearchHistory(userId: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(storageKey(userId))
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(String).filter((q) => q.trim().length > 0).slice(0, maxItems)
  } catch {
    return []
  }
}

export async function addSearchHistoryItem(userId: string, query: string): Promise<string[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return getSearchHistory(userId)

  const history = await getSearchHistory(userId)
  const normalized = normalizeQuery(trimmed)

  const next = [trimmed, ...history.filter((q) => normalizeQuery(q) !== normalized)].slice(0, maxItems)
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next))
  return next
}

export async function clearSearchHistory(userId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(userId))
}

