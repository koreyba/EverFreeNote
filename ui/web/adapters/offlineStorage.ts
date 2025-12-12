import type {
  CachedNote,
  MutationQueueItem,
  OfflineStorageAdapter,
} from '@core/types/offline'
import { OFFLINE_CACHE_LIMIT_BYTES } from '@core/constants/offline'

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

const measureSize = (notes: CachedNote[], queue: MutationQueueItem[]) => {
  // Грубая оценка через длину JSON-строк
  const notesSize = JSON.stringify(notes).length
  const queueSize = JSON.stringify(queue).length
  return notesSize + queueSize
}

export const webOfflineStorageAdapter: OfflineStorageAdapter = {
  async loadNotes(params) {
    const notes = readJson<CachedNote>(NOTES_KEY)
    const start = params?.offset ?? 0
    const end = params?.limit ? start + params.limit : undefined
    return notes.slice(start, end)
  },

  async saveNote(note) {
    const notes = readJson<CachedNote>(NOTES_KEY)
    const idx = notes.findIndex((n) => n.id === note.id)
    if (idx >= 0) notes[idx] = note
    else notes.push(note)
    writeJson(NOTES_KEY, notes)
  },

  async saveNotes(newNotes) {
    const notes = readJson<CachedNote>(NOTES_KEY)
    const byId = new Map(notes.map((n) => [n.id, n]))
    newNotes.forEach((n) => byId.set(n.id, n))
    writeJson(NOTES_KEY, Array.from(byId.values()))
  },

  async deleteNote(noteId) {
    const notes = readJson<CachedNote>(NOTES_KEY).filter((n) => n.id !== noteId)
    writeJson(NOTES_KEY, notes)
  },

  async getQueue() {
    return readJson<MutationQueueItem>(QUEUE_KEY)
  },

  async upsertQueueItem(item) {
    const queue = readJson<MutationQueueItem>(QUEUE_KEY)
    const idx = queue.findIndex((q) => q.id === item.id)
    if (idx >= 0) queue[idx] = item
    else queue.push(item)
    writeJson(QUEUE_KEY, queue)
  },

  async upsertQueue(items) {
    writeJson(QUEUE_KEY, items)
  },

  async popQueueBatch(batchSize) {
    const queue = readJson<MutationQueueItem>(QUEUE_KEY)
    const batch = queue.slice(0, batchSize)
    const rest = queue.slice(batchSize)
    writeJson(QUEUE_KEY, rest)
    return batch
  },

  async markSynced(noteId, updatedAt) {
    const notes = readJson<CachedNote>(NOTES_KEY)
    const idx = notes.findIndex((n) => n.id === noteId)
    if (idx >= 0) {
      notes[idx].status = 'synced'
      notes[idx].updatedAt = updatedAt
      notes[idx].pendingOps = []
      writeJson(NOTES_KEY, notes)
    }
  },

  async markQueueItemStatus(id, status, lastError) {
    const queue = readJson<MutationQueueItem>(QUEUE_KEY)
    const idx = queue.findIndex((q) => q.id === id)
    if (idx >= 0) {
      queue[idx].status = status
      queue[idx].lastError = lastError
      writeJson(QUEUE_KEY, queue)
    }
  },

  async enforceLimit() {
    const notes = readJson<CachedNote>(NOTES_KEY)
    const queue = readJson<MutationQueueItem>(QUEUE_KEY)

    let size = measureSize(notes, queue)
    if (size <= OFFLINE_CACHE_LIMIT_BYTES) return

    // Простейшая очистка: сортируем по updatedAt и удаляем самые старые
    const sorted = [...notes].sort((a, b) => {
      const aTime = Date.parse(a.updatedAt)
      const bTime = Date.parse(b.updatedAt)
      return aTime - bTime
    })
    while (sorted.length && size > OFFLINE_CACHE_LIMIT_BYTES) {
      sorted.shift()
      size = measureSize(sorted, queue)
    }
    writeJson(NOTES_KEY, sorted)
  },

  async clearAll() {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(NOTES_KEY)
    localStorage.removeItem(QUEUE_KEY)
  },
}
