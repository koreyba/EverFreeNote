import type { OfflineStorageAdapter, CachedNote, MutationQueueItem } from '../types/offline'
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

  async removeSyncedTombstones(notes: CachedNote[], signal?: AbortSignal): Promise<string[]> {
    return this.storage.removeSyncedTombstones?.(notes, signal) ?? []
  }

  async claimLegacySnapshot(note: CachedNote, item: MutationQueueItem, ownerId: string, signal?: AbortSignal): Promise<boolean> {
    return this.storage.claimLegacySnapshot?.(note, item, ownerId, signal) ?? false
  }

  async getLegacyClaims(ownerId: string, notes: CachedNote[]): Promise<string[]> {
    return this.storage.getLegacyClaims?.(ownerId, notes) ?? []
  }

  async patchSyncedTags(patches: Array<{ expected: CachedNote; tags: string[] }>): Promise<string[]> {
    return this.storage.patchSyncedTags?.(patches) ?? []
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
