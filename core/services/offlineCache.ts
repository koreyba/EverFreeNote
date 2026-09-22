import type { OfflineStorageAdapter, CachedNote } from '../types/offline'
import { OFFLINE_CACHE_LIMIT_BYTES } from '../constants/offline'

export class OfflineCacheService {
  constructor(private readonly storage: OfflineStorageAdapter) {}

  async loadNotes(limit?: number, offset?: number): Promise<CachedNote[]> {
    return this.storage.loadNotes({ limit, offset })
  }

  async saveNote(note: CachedNote): Promise<void> {
    await this.storage.saveNote(note)
    await this.enforceLimit()
  }

  async saveNotes(notes: CachedNote[]): Promise<void> {
    await this.storage.saveNotes(notes)
    await this.enforceLimit()
  }

  async deleteNote(noteId: string): Promise<void> {
    await this.storage.deleteNote(noteId)
  }

  async removeSyncedNotes(notes: CachedNote[], signal?: AbortSignal): Promise<string[]> {
    // Adapters without conditional deletion retain their cache rather than risking edits.
    return this.storage.removeSyncedNotes?.(notes, signal) ?? []
  }

  async markSynced(noteId: string, updatedAt: string, expectedUpdatedAt?: string): Promise<void> {
    await this.storage.markSynced(noteId, updatedAt, expectedUpdatedAt)
  }

  async enforceLimit(): Promise<void> {
    // Конкретная стратегия очистки реализуется в адаптере (LRU/updated_at).
    await this.storage.enforceLimit()
  }

  getCacheLimitBytes(): number {
    return OFFLINE_CACHE_LIMIT_BYTES
  }
}
