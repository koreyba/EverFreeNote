import type { CachedNote, MutationQueueItem, MutationStatus, OfflineStorageAdapter } from '@core/types/offline'
import { OFFLINE_CACHE_LIMIT_BYTES } from '@core/constants/offline'
import { matchesQueuedSnapshot, queueOwners } from '@ui/web/lib/offlineOwnership'

const DB_NAME = 'everfreenote-offline'
const DB_VERSION = 2 // Bump version for index migration
const NOTES_STORE = 'notes'
const QUEUE_STORE = 'queue'

const hasIndexedDB = typeof indexedDB !== 'undefined'

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
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
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction error'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))

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

const matchesSyncedSnapshot = (expected: CachedNote, current?: CachedNote) => (
  current?.status === 'synced' && !current.deleted && !current.pendingOps?.length &&
  // A matching timestamp is insufficient if another writer reused it. A false
  // mismatch only retains the snapshot for a later reconciliation.
  JSON.stringify(current) === JSON.stringify(expected)
)
const matchesSyncedTombstone = (expected: CachedNote, current?: CachedNote) => (
  Boolean(expected.user_id) && expected.deleted === true && expected.status === 'synced' &&
  current?.deleted === true && current.status === 'synced' && !current.pendingOps?.length &&
  JSON.stringify(current) === JSON.stringify(expected)
)

const canClaimLegacySnapshot = (expected: CachedNote, current: CachedNote | undefined, item: MutationQueueItem, queue: MutationQueueItem[], ownerId: string) => (
  Boolean(current && !current.user_id && JSON.stringify(current) === JSON.stringify(expected) &&
    queue.some(entry => entry.id === item.id && JSON.stringify(entry) === JSON.stringify(item)) &&
    queue.filter(entry => entry.noteId === expected.id).every(entry => queueOwners(entry).every(owner => owner === ownerId)) &&
    queueOwners(item).includes(ownerId) && matchesQueuedSnapshot(current, item))
)

const claimPrefix = 'offline_owner_claim_v1:'
const claimKey = (ownerId: string, noteId: string) => `${claimPrefix}${encodeURIComponent(ownerId)}:${encodeURIComponent(noteId)}`
const snapshotHash = async (note: CachedNote): Promise<string> => {
  if (!globalThis.crypto?.subtle) throw new Error('Secure ownership verification is unavailable')
  // Status and pendingOps change when the operation is acknowledged, while
  // these fields identify the exact content and local version.
  const value = JSON.stringify([note.id, note.title, note.description, note.tags, note.updatedAt, note.created_at ?? null, Boolean(note.deleted)])
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

const clearLegacyClaims = () => {
  if (typeof localStorage === 'undefined') return
  for (let index = localStorage.length - 1; index >= 0; index--) {
    const key = localStorage.key(index)
    if (key?.startsWith(claimPrefix)) localStorage.removeItem(key)
  }
}

// Fallback на localStorage, если IndexedDB недоступен
const localFallback = (() => {
  const NOTES_KEY = 'offline_notes'
  const QUEUE_KEY = 'offline_queue'
  const readJson = <T>(key: string): T[] => {
    try {
      if (typeof localStorage === 'undefined') throw new Error('Local storage is unavailable')
      const raw = localStorage.getItem(key)
      if (!raw) return []
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) throw new Error('Invalid local data')
      return parsed as T[]
    } catch {
      // A corrupt or inaccessible key is not an empty account. Refuse writes
      // that would otherwise overwrite the only recoverable copy.
      throw new Error('Local data could not be read. Keep this site’s data and try again.')
    }
  }
  const writeJson = (key: string, value: unknown) => {
    if (typeof localStorage === 'undefined') throw new Error('Local storage is unavailable')
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
      readJson<CachedNote>(NOTES_KEY)
      writeJson(NOTES_KEY, list)
    },
    deleteNote: (id: string) => {
      const notes = readJson<CachedNote>(NOTES_KEY).filter((n) => n.id !== id)
      writeJson(NOTES_KEY, notes)
    },
    removeSyncedNotes: (expected: CachedNote[], signal?: AbortSignal) => {
      if (signal?.aborted) return []
      const notes = readJson<CachedNote>(NOTES_KEY)
      const queued = new Set(readJson<MutationQueueItem>(QUEUE_KEY).map(item => item.noteId))
      const snapshots = new Map(expected.map(note => [note.id, note]))
      const removed = notes.filter(note => {
        const snapshot = snapshots.get(note.id)
        return snapshot && !queued.has(note.id) && matchesSyncedSnapshot(snapshot, note)
      }).map(note => note.id)
      const removedIds = new Set(removed)
      writeJson(NOTES_KEY, notes.filter(note => !removedIds.has(note.id)))
      return removed
    },
    removeSyncedTombstones: (expected: CachedNote[], signal?: AbortSignal) => {
      if (signal?.aborted || !expected.length) return []
      const notes = readJson<CachedNote>(NOTES_KEY)
      const queued = new Set(readJson<MutationQueueItem>(QUEUE_KEY).map(item => item.noteId))
      const snapshots = new Map(expected.map(note => [note.id, note]))
      const removed = notes.filter(note => {
        const snapshot = snapshots.get(note.id)
        return snapshot && !queued.has(note.id) && matchesSyncedTombstone(snapshot, note)
      }).map(note => note.id)
      if (signal?.aborted) return []
      const ids = new Set(removed)
      if (ids.size) writeJson(NOTES_KEY, notes.filter(note => !ids.has(note.id)))
      return removed
    },
    claimLegacySnapshot: async (expected: CachedNote, item: MutationQueueItem, ownerId: string, signal?: AbortSignal) => {
      if (signal?.aborted || typeof localStorage === 'undefined') return false
      let notes = readJson<CachedNote>(NOTES_KEY)
      let queue = readJson<MutationQueueItem>(QUEUE_KEY)
      if (!canClaimLegacySnapshot(expected, notes.find(note => note.id === expected.id), item, queue, ownerId)) return false
      const hash = await snapshotHash(expected)
      notes = readJson<CachedNote>(NOTES_KEY)
      queue = readJson<MutationQueueItem>(QUEUE_KEY)
      if (signal?.aborted || !canClaimLegacySnapshot(expected, notes.find(note => note.id === expected.id), item, queue, ownerId)) return false
      // One independent key does not rewrite the shared legacy notes/queue arrays.
      localStorage.setItem(claimKey(ownerId, expected.id), JSON.stringify({ version: 1, hash }))
      return true
    },
    getLegacyClaims: async (ownerId: string, notes: CachedNote[]) => {
      if (typeof localStorage === 'undefined') throw new Error('Local storage is unavailable')
      const ids: string[] = []
      for (const note of notes) {
        if (note.user_id) continue
        const raw = localStorage.getItem(claimKey(ownerId, note.id))
        if (!raw) continue
        const claim: unknown = JSON.parse(raw)
        if (!claim || typeof claim !== 'object' || !('version' in claim) || claim.version !== 1 || !('hash' in claim) || typeof claim.hash !== 'string') throw new Error('Local ownership evidence could not be read')
        if (claim.hash === await snapshotHash(note)) ids.push(note.id)
      }
      return ids
    },
    patchSyncedTags: (patches: Array<{ expected: CachedNote; tags: string[] }>) => {
      if (!patches.length) return []
      const notes = readJson<CachedNote>(NOTES_KEY)
      const queued = new Set(readJson<MutationQueueItem>(QUEUE_KEY).map(item => item.noteId))
      const byId = new Map(patches.map(patch => [patch.expected.id, patch]))
      const updated: string[] = []
      const next = notes.map(note => {
        const patch = byId.get(note.id)
        if (!patch || queued.has(note.id) || !matchesSyncedSnapshot(patch.expected, note)) return note
        updated.push(note.id)
        return { ...note, tags: patch.tags }
      })
      writeJson(NOTES_KEY, next)
      return updated
    },
    getQueue: () => readJson<MutationQueueItem>(QUEUE_KEY),
    upsertQueueItem: (item: MutationQueueItem) => {
      const queue = readJson<MutationQueueItem>(QUEUE_KEY)
      const idx = queue.findIndex((q) => q.id === item.id)
      if (idx >= 0) queue[idx] = item
      else queue.push(item)
      writeJson(QUEUE_KEY, queue)
    },
    upsertQueue: (items: MutationQueueItem[]) => { readJson<MutationQueueItem>(QUEUE_KEY); writeJson(QUEUE_KEY, items) },
    appendQueueItems: (items: MutationQueueItem[]) => {
      const queue = new Map(readJson<MutationQueueItem>(QUEUE_KEY).map(item => [item.id, item]))
      items.forEach(item => queue.set(item.id, item))
      writeJson(QUEUE_KEY, Array.from(queue.values()))
    },
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
    markSynced: (id: string, updatedAt: string, expectedUpdatedAt?: string) => {
      const notes = readJson<CachedNote>(NOTES_KEY)
      const idx = notes.findIndex((n) => n.id === id)
      if (idx >= 0 && (expectedUpdatedAt === undefined || notes[idx].updatedAt === expectedUpdatedAt)) {
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
      clearLegacyClaims()
    },
  }
})()

const readAll = async <T>(storeName: string): Promise<T[]> => {
  return withStore<T[]>(storeName, 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result as T[])
      req.onerror = () => reject(req.error ?? new Error('Failed to read from IndexedDB store'))
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
      atomicTagPatches: true,
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

      async removeSyncedNotes(notes, signal) {
        if (!notes.length || signal?.aborted) return []
        const db = await getDB()
        if (signal?.aborted) { db.close(); return [] }
        return new Promise<string[]>((resolve, reject) => {
          const tx = db.transaction([NOTES_STORE, QUEUE_STORE], 'readwrite')
          const store = tx.objectStore(NOTES_STORE)
          const removed: string[] = []
          const abort = () => { try { tx.abort() } catch { /* The transaction already completed. */ } }
          const cleanup = () => { signal?.removeEventListener('abort', abort); db.close() }
          signal?.addEventListener('abort', abort, { once: true })
          tx.oncomplete = () => { cleanup(); resolve(removed) }
          tx.onerror = tx.onabort = () => { cleanup(); reject(tx.error ?? new Error('Cache reconciliation cancelled')) }
          const queue = tx.objectStore(QUEUE_STORE).getAll()
          queue.onsuccess = () => {
            const queued = new Set((queue.result as MutationQueueItem[]).map(item => item.noteId))
            for (const note of notes) {
              if (queued.has(note.id)) continue
              const request = store.get(note.id)
              request.onsuccess = () => {
                if (matchesSyncedSnapshot(note, request.result)) {
                  store.delete(note.id)
                  removed.push(note.id)
                }
              }
            }
          }
        })
      },

      async removeSyncedTombstones(notes, signal) {
        if (!notes.length || signal?.aborted) return []
        const db = await getDB()
        if (signal?.aborted) { db.close(); return [] }
        return new Promise<string[]>((resolve, reject) => {
          const tx = db.transaction([NOTES_STORE, QUEUE_STORE], 'readwrite')
          const store = tx.objectStore(NOTES_STORE)
          const removed: string[] = []
          const abort = () => { try { tx.abort() } catch { /* The transaction already completed. */ } }
          const cleanup = () => { signal?.removeEventListener('abort', abort); db.close() }
          signal?.addEventListener('abort', abort, { once: true })
          tx.oncomplete = () => { cleanup(); resolve(removed) }
          tx.onerror = tx.onabort = () => { cleanup(); reject(tx.error ?? new Error('Tombstone cleanup cancelled')) }
          const request = tx.objectStore(QUEUE_STORE).getAll()
          request.onsuccess = () => {
            const queued = new Set((request.result as MutationQueueItem[]).map(item => item.noteId))
            for (const expected of notes) {
              if (queued.has(expected.id)) continue
              const current = store.get(expected.id)
              current.onsuccess = () => {
                if (matchesSyncedTombstone(expected, current.result)) {
                  store.delete(expected.id)
                  removed.push(expected.id)
                }
              }
            }
          }
        })
      },

      async claimLegacySnapshot(expected, item, ownerId, signal) {
        if (signal?.aborted) return false
        const db = await getDB()
        if (signal?.aborted) { db.close(); return false }
        return new Promise<boolean>((resolve, reject) => {
          const tx = db.transaction([NOTES_STORE, QUEUE_STORE], 'readwrite')
          const store = tx.objectStore(NOTES_STORE)
          let claimed = false
          let failure: unknown
          const abort = () => { try { tx.abort() } catch { /* The transaction already completed. */ } }
          const cleanup = () => { signal?.removeEventListener('abort', abort); db.close() }
          const fail = (error: unknown) => {
            failure = error
            try { tx.abort() } catch { cleanup(); reject(error) }
          }
          signal?.addEventListener('abort', abort, { once: true })
          tx.oncomplete = () => { cleanup(); resolve(claimed) }
          tx.onerror = tx.onabort = () => { cleanup(); reject(failure ?? tx.error ?? new Error('Ownership claim cancelled')) }
          const request = tx.objectStore(QUEUE_STORE).getAll()
          request.onsuccess = () => {
            try {
              const queue = request.result as MutationQueueItem[]
              const current = store.get(expected.id)
              current.onsuccess = () => {
                try {
                  const note = current.result as CachedNote | undefined
                  if (canClaimLegacySnapshot(expected, note, item, queue, ownerId)) {
                    store.put({ ...note!, user_id: ownerId })
                    claimed = true
                  }
                } catch (error) { fail(error) }
              }
            } catch (error) { fail(error) }
          }
        })
      },

      async getLegacyClaims() { return [] },

      async patchSyncedTags(patches) {
        if (!patches.length) return []
        const db = await getDB()
        return new Promise<string[]>((resolve, reject) => {
          const tx = db.transaction([NOTES_STORE, QUEUE_STORE], 'readwrite')
          const store = tx.objectStore(NOTES_STORE)
          const updated: string[] = []
          tx.oncomplete = () => { db.close(); resolve(updated) }
          tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Cache reconciliation failed')) }
          const queue = tx.objectStore(QUEUE_STORE).getAll()
          queue.onsuccess = () => {
            const queued = new Set((queue.result as MutationQueueItem[]).map(item => item.noteId))
            for (const patch of patches) {
              if (queued.has(patch.expected.id)) continue
              const request = store.get(patch.expected.id)
              request.onsuccess = () => {
                if (matchesSyncedSnapshot(patch.expected, request.result)) {
                  store.put({ ...request.result, tags: patch.tags })
                  updated.push(patch.expected.id)
                }
              }
            }
          }
        })
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

      async appendQueueItems(items) {
        if (!items.length) return
        await withStore(QUEUE_STORE, 'readwrite', (store) => {
          items.forEach((item) => store.put(item))
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
              request.onerror = () => reject(request.error ?? new Error('Failed to query pending batch cursor'))
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
              request.onerror = () => reject(request.error ?? new Error('Failed to query pending batch fallback'))
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

      async markSynced(noteId, updatedAt, expectedUpdatedAt) {
        // Read and conditionally acknowledge in one transaction to preserve concurrent edits.
        await withStore(NOTES_STORE, 'readwrite', (store) => {
          const request = store.get(noteId)
          request.onsuccess = () => {
            const note = request.result as CachedNote
            if (note && (expectedUpdatedAt === undefined || note.updatedAt === expectedUpdatedAt)) {
              store.put({ ...note, status: 'synced', updatedAt, pendingOps: [] })
            }
          }
        })
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
      atomicTagPatches: false,
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
      async removeSyncedNotes(notes, signal) {
        return localFallback.removeSyncedNotes(notes, signal)
      },
      async removeSyncedTombstones(notes, signal) {
        return localFallback.removeSyncedTombstones(notes, signal)
      },
      async claimLegacySnapshot(note, item, ownerId, signal) {
        return localFallback.claimLegacySnapshot(note, item, ownerId, signal)
      },
      async getLegacyClaims(ownerId, notes) {
        return localFallback.getLegacyClaims(ownerId, notes)
      },
      async patchSyncedTags(patches) {
        return localFallback.patchSyncedTags(patches)
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
      async appendQueueItems(items) {
        localFallback.appendQueueItems(items)
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
      async markSynced(noteId, updatedAt, expectedUpdatedAt) {
        localFallback.markSynced(noteId, updatedAt, expectedUpdatedAt)
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
