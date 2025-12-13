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

  async markSynced(noteId: string, updatedAt: string): Promise<void> {
    await this.storage.markSynced(noteId, updatedAt)
  }

  async enforceLimit(): Promise<void> {
    // Конкретная стратегия очистки реализуется в адаптере (LRU/updated_at).
    await this.storage.enforceLimit()
  }

  getCacheLimitBytes(): number {
    return OFFLINE_CACHE_LIMIT_BYTES
  }
}
