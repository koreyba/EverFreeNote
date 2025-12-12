import type { CachedNote, MutationQueueItem, MutationStatus, OfflineStorageAdapter } from '@core/types/offline'
import { OFFLINE_CACHE_LIMIT_BYTES } from '@core/constants/offline'

const DB_NAME = 'everfreenote-offline'
const DB_VERSION = 2 // Bump version for index migration
const NOTES_STORE = 'notes'
const QUEUE_STORE = 'queue'

const hasIndexedDB = typeof indexedDB !== 'undefined'

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onupgradeneeded = (event) => {
      const db = request.result
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        db.createObjectStore(NOTES_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' })
        queueStore.createIndex('status', 'status', { unique: false })
        queueStore.createIndex('clientUpdatedAt', 'clientUpdatedAt', { unique: false })
      } else if (event.oldVersion < 2) {
        // Add indexes to existing store
        const tx = request.transaction
        if (tx) {
          const queueStore = tx.objectStore(QUEUE_STORE)
          if (!queueStore.indexNames.contains('status')) {
            queueStore.createIndex('status', 'status', { unique: false })
          }
          if (!queueStore.indexNames.contains('clientUpdatedAt')) {
            queueStore.createIndex('clientUpdatedAt', 'clientUpdatedAt', { unique: false })
          }
        }
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

const withStore = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> => {
  const db = await getDB()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    let fnResult: T

    // Set handlers BEFORE executing fn to avoid race condition
    // IndexedDB auto-commits when no pending operations remain
    tx.oncomplete = () => resolve(fnResult)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)

    try {
      const result = fn(store)
      if (result instanceof Promise) {
        result
          .then((r) => { fnResult = r })
          .catch((err) => {
            tx.abort()
            reject(err)
          })
      } else {
        fnResult = result
      }
    } catch (err) {
      tx.abort()
      reject(err)
    }
  })
}

// Fallback на localStorage, если IndexedDB недоступен
const localFallback = (() => {
  const NOTES_KEY = 'offline_notes'
  const QUEUE_KEY = 'offline_queue'
  const readJson = <T>(key: string): T[] => {
    if (typeof localStorage === 'undefined') return []
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return []
      return JSON.parse(raw) as T[]
    } catch {
      return []
    }
  }
  const writeJson = (key: string, value: unknown) => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(key, JSON.stringify(value))
  }
  return {
    loadNotes: ({ limit, offset }: { limit?: number; offset?: number } = {}) => {
      const notes = readJson<CachedNote>(NOTES_KEY)
      const start = offset ?? 0
      const end = limit ? start + limit : undefined
      return notes.slice(start, end)
    },
    saveNote: (note: CachedNote) => {
      const notes = readJson<CachedNote>(NOTES_KEY)
      const idx = notes.findIndex((n) => n.id === note.id)
      if (idx >= 0) notes[idx] = note
      else notes.push(note)
      writeJson(NOTES_KEY, notes)
    },
    saveNotes: (list: CachedNote[]) => {
      writeJson(NOTES_KEY, list)
    },
    deleteNote: (id: string) => {
      const notes = readJson<CachedNote>(NOTES_KEY).filter((n) => n.id !== id)
      writeJson(NOTES_KEY, notes)
    },
    getQueue: () => readJson<MutationQueueItem>(QUEUE_KEY),
    upsertQueueItem: (item: MutationQueueItem) => {
      const queue = readJson<MutationQueueItem>(QUEUE_KEY)
      const idx = queue.findIndex((q) => q.id === item.id)
      if (idx >= 0) queue[idx] = item
      else queue.push(item)
      writeJson(QUEUE_KEY, queue)
    },
    upsertQueue: (items: MutationQueueItem[]) => writeJson(QUEUE_KEY, items),
    popQueueBatch: (size: number) => {
      const queue = readJson<MutationQueueItem>(QUEUE_KEY)
      const batch = queue.slice(0, size)
      writeJson(QUEUE_KEY, queue.slice(size))
      return batch
    },
    getPendingBatch: (size: number) => {
      const queue = readJson<MutationQueueItem>(QUEUE_KEY)
      return queue.filter((q) => q.status === 'pending').slice(0, size)
    },
    removeQueueItems: (ids: string[]) => {
      const idSet = new Set(ids)
      const queue = readJson<MutationQueueItem>(QUEUE_KEY).filter((q) => !idSet.has(q.id))
      writeJson(QUEUE_KEY, queue)
    },
    markSynced: (id: string, updatedAt: string) => {
      const notes = readJson<CachedNote>(NOTES_KEY)
      const idx = notes.findIndex((n) => n.id === id)
      if (idx >= 0) {
        notes[idx].status = 'synced'
        notes[idx].updatedAt = updatedAt
        notes[idx].pendingOps = []
        writeJson(NOTES_KEY, notes)
      }
    },
    markQueueItemStatus: (id: string, status: MutationStatus, lastError?: string) => {
      const queue = readJson<MutationQueueItem>(QUEUE_KEY)
      const idx = queue.findIndex((q) => q.id === id)
      if (idx >= 0) {
        queue[idx].status = status
        queue[idx].lastError = lastError
        writeJson(QUEUE_KEY, queue)
      }
    },
    enforceLimit: () => {
      const notes = readJson<CachedNote>(NOTES_KEY)
      const queue = readJson<MutationQueueItem>(QUEUE_KEY)
      let size = JSON.stringify(notes).length + JSON.stringify(queue).length
      if (size <= OFFLINE_CACHE_LIMIT_BYTES) return
      const sorted = [...notes].sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt))
      while (sorted.length && size > OFFLINE_CACHE_LIMIT_BYTES) {
        sorted.shift()
        size = JSON.stringify(sorted).length + JSON.stringify(queue).length
      }
      writeJson(NOTES_KEY, sorted)
    },
    clearAll: () => {
      if (typeof localStorage === 'undefined') return
      localStorage.removeItem(NOTES_KEY)
      localStorage.removeItem(QUEUE_KEY)
    },
  }
})()

const readAll = async <T>(storeName: string): Promise<T[]> => {
  return withStore<T[]>(storeName, 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result as T[])
      req.onerror = () => reject(req.error)
    })
  })
}

const writeItem = async (storeName: string, value: unknown) => {
  return withStore(storeName, 'readwrite', (store) => {
    store.put(value)
    return
  })
}

const deleteItem = async (storeName: string, id: string) => {
  return withStore(storeName, 'readwrite', (store) => {
    store.delete(id)
    return
  })
}

export const webOfflineStorageAdapter: OfflineStorageAdapter = hasIndexedDB
  ? {
      async loadNotes(params = {}) {
        const notes = await readAll<CachedNote>(NOTES_STORE)
        const start = params.offset ?? 0
        const end = params.limit ? start + params.limit : undefined
        return notes.slice(start, end)
      },

      async saveNote(note) {
        await writeItem(NOTES_STORE, note)
      },

      async saveNotes(notes) {
        await withStore(NOTES_STORE, 'readwrite', (store) => {
          notes.forEach((n) => store.put(n))
          return
        })
      },

      async deleteNote(noteId) {
        await deleteItem(NOTES_STORE, noteId)
      },

      async getQueue() {
        return readAll<MutationQueueItem>(QUEUE_STORE)
      },

      async upsertQueueItem(item) {
        await writeItem(QUEUE_STORE, item)
      },

      async upsertQueue(items) {
        await withStore(QUEUE_STORE, 'readwrite', (store) => {
          store.clear()
          items.forEach((i) => store.put(i))
          return
        })
      },

      async popQueueBatch(batchSize) {
        const queue = await readAll<MutationQueueItem>(QUEUE_STORE)
        // сортируем по clientUpdatedAt, чтобы сохранять последовательность
        const sorted = [...queue].sort((a, b) => Date.parse(a.clientUpdatedAt) - Date.parse(b.clientUpdatedAt))
        const batch = sorted.slice(0, batchSize)
        const restIds = new Set(batch.map((b) => b.id))
        const rest = queue.filter((q) => !restIds.has(q.id))
        await withStore(QUEUE_STORE, 'readwrite', (store) => {
          store.clear()
          rest.forEach((i) => store.put(i))
          return
        })
        return batch
      },

      async getPendingBatch(batchSize) {
        // Use index for efficient query of pending items
        return withStore<MutationQueueItem[]>(QUEUE_STORE, 'readonly', (store) => {
          return new Promise((resolve, reject) => {
            const results: MutationQueueItem[] = []
            try {
              const index = store.index('status')
              const request = index.openCursor(IDBKeyRange.only('pending'))
              request.onsuccess = () => {
                const cursor = request.result
                if (cursor && results.length < batchSize) {
                  results.push(cursor.value as MutationQueueItem)
                  cursor.continue()
                } else {
                  // Sort by clientUpdatedAt
                  results.sort((a, b) => Date.parse(a.clientUpdatedAt) - Date.parse(b.clientUpdatedAt))
                  resolve(results)
                }
              }
              request.onerror = () => reject(request.error)
            } catch {
              // Fallback if index doesn't exist yet
              const request = store.getAll()
              request.onsuccess = () => {
                const all = request.result as MutationQueueItem[]
                const pending = all
                  .filter((q) => q.status === 'pending')
                  .sort((a, b) => Date.parse(a.clientUpdatedAt) - Date.parse(b.clientUpdatedAt))
                resolve(pending.slice(0, batchSize))
              }
              request.onerror = () => reject(request.error)
            }
          })
        })
      },

      async removeQueueItems(ids) {
        if (!ids.length) return
        await withStore(QUEUE_STORE, 'readwrite', (store) => {
          ids.forEach((id) => store.delete(id))
          return
        })
      },

      async markSynced(noteId, updatedAt) {
        const notes = await readAll<CachedNote>(NOTES_STORE)
        const idx = notes.findIndex((n) => n.id === noteId)
        if (idx >= 0) {
          notes[idx].status = 'synced'
          notes[idx].updatedAt = updatedAt
          notes[idx].pendingOps = []
          await withStore(NOTES_STORE, 'readwrite', (store) => {
            store.put(notes[idx])
            return
          })
        }
      },

      async markQueueItemStatus(id, status, lastError) {
        const queue = await readAll<MutationQueueItem>(QUEUE_STORE)
        const idx = queue.findIndex((q) => q.id === id)
        if (idx >= 0) {
          queue[idx].status = status
          queue[idx].lastError = lastError
          await writeItem(QUEUE_STORE, queue[idx])
        }
      },

      async enforceLimit() {
        const notes = await readAll<CachedNote>(NOTES_STORE)
        const queue = await readAll<MutationQueueItem>(QUEUE_STORE)
        let size = JSON.stringify(notes).length + JSON.stringify(queue).length
        if (size <= OFFLINE_CACHE_LIMIT_BYTES) return
        const sorted = [...notes].sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt))
        while (sorted.length && size > OFFLINE_CACHE_LIMIT_BYTES) {
          sorted.shift()
          size = JSON.stringify(sorted).length + JSON.stringify(queue).length
        }
        await withStore(NOTES_STORE, 'readwrite', (store) => {
          store.clear()
          sorted.forEach((n) => store.put(n))
          return
        })
      },

      async clearAll() {
        const db = await getDB()
        await Promise.all([
          withStore(NOTES_STORE, 'readwrite', (store) => {
            store.clear()
            return
          }),
          withStore(QUEUE_STORE, 'readwrite', (store) => {
            store.clear()
            return
          }),
        ])
        db.close()
      },
    }
  : {
      // fallback на localStorage
      async loadNotes(params = {}) {
        return localFallback.loadNotes(params)
      },
      async saveNote(note) {
        localFallback.saveNote(note)
      },
      async saveNotes(notes) {
        localFallback.saveNotes(notes)
      },
      async deleteNote(noteId) {
        localFallback.deleteNote(noteId)
      },
      async getQueue() {
        return localFallback.getQueue()
      },
      async upsertQueueItem(item) {
        localFallback.upsertQueueItem(item)
      },
      async upsertQueue(items) {
        localFallback.upsertQueue(items)
      },
      async popQueueBatch(batchSize) {
        return localFallback.popQueueBatch(batchSize)
      },
      async getPendingBatch(batchSize) {
        return localFallback.getPendingBatch(batchSize)
      },
      async removeQueueItems(ids) {
        localFallback.removeQueueItems(ids)
      },
      async markSynced(noteId, updatedAt) {
        localFallback.markSynced(noteId, updatedAt)
      },
      async markQueueItemStatus(id, status, lastError) {
        localFallback.markQueueItemStatus(id, status, lastError)
      },
      async enforceLimit() {
        localFallback.enforceLimit()
      },
      async clearAll() {
        localFallback.clearAll()
      },
    }
