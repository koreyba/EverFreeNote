import type { OfflineStorageAdapter, CachedNote, MutationQueueItem, MutationStatus } from '@core/types/offline'
import { databaseService } from '../services/database'
import type { Note } from '@core/types/domain'

export const mobileOfflineStorageAdapter: OfflineStorageAdapter = {
    async loadNotes(_params) {
        // This is a bit simplified, usually we need userId here
        // But for the adapter interface, we might need to handle it or use a global userId
        return [] // TODO: Implement with userId support
    },

    async saveNote(note: CachedNote) {
        await databaseService.saveNotes([note as unknown as Note])
    },

    async saveNotes(notes: CachedNote[]) {
        await databaseService.saveNotes(notes as unknown as Note[])
    },

    async deleteNote(noteId: string) {
        // Implement delete in DB (mark as is_deleted)
        const db = await databaseService.init()
        await db.runAsync('UPDATE notes SET is_deleted = 1 WHERE id = ?', [noteId])
    },

    async getQueue(): Promise<MutationQueueItem[]> {
        return await databaseService.getQueue()
    },

    async upsertQueueItem(item: MutationQueueItem) {
        await databaseService.upsertQueueItem(item)
    },

    async upsertQueue(items: MutationQueueItem[]) {
        for (const item of items) {
            await databaseService.upsertQueueItem(item)
        }
    },

    async getPendingBatch(batchSize: number): Promise<MutationQueueItem[]> {
        const queue = await databaseService.getQueue()
        return queue.filter(i => i.status === 'pending').slice(0, batchSize)
    },

    async removeQueueItems(ids: string[]) {
        await databaseService.removeQueueItems(ids)
    },

    async markSynced(noteId: string, updatedAt: string) {
        const db = await databaseService.init()
        await db.runAsync('UPDATE notes SET is_synced = 1, updated_at = ? WHERE id = ?', [updatedAt, noteId])
    },

    async markQueueItemStatus(id: string, status: MutationStatus, lastError?: string) {
        await databaseService.markQueueItemStatus(id, status, lastError)
    },

    async enforceLimit() {
        // Optional: cleanup old notes if DB is too large
    },

    async clearAll() {
        const db = await databaseService.init()
        await db.execAsync('DELETE FROM notes; DELETE FROM mutation_queue;')
    },

    // Deprecated method
    async popQueueBatch(batchSize: number) {
        const batch = await this.getPendingBatch(batchSize)
        await this.removeQueueItems(batch.map(i => i.id))
        return batch
    }
}
