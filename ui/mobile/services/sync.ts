import { OfflineSyncManager } from '@core/services/offlineSyncManager'
import { mobileOfflineStorageAdapter } from '../adapters/offlineStorage'
import { mobileNetworkStatusProvider } from '../adapters/networkStatus'
import { NoteService } from '@core/services/notes'
import type { MutationQueueItem } from '@core/types/offline'
import type { Note } from '@core/types/domain'
import type { SupabaseClient } from '@supabase/supabase-js'
import { databaseService } from './database'

type ErrorWithCode = Error & { code?: string }
const isUniqueViolation = (error: unknown): boolean => {
    return typeof error === 'object'
        && error !== null
        && 'code' in error
        && (error as ErrorWithCode).code === '23505'
}

export class MobileSyncService {
    private manager: OfflineSyncManager | null = null

    init(supabase: SupabaseClient) {
        if (this.manager) return

        const noteService = new NoteService(supabase)

        const performSync = async (item: MutationQueueItem) => {
            switch (item.operation) {
                case 'create': {
                    const payload = item.payload as Partial<Note> & { user_id?: string }
                    try {
                        const created = await noteService.createNote({
                            id: item.noteId,
                            title: payload.title ?? '',
                            description: payload.description ?? '',
                            tags: payload.tags ?? [],
                            userId: payload.user_id ?? ''
                        })
                        await databaseService.saveNotes([{ ...created, is_synced: 1, is_deleted: 0 }])
                    } catch (error) {
                        // If we retried after a partial success, treat duplicate key as success (idempotent create)
                        if (isUniqueViolation(error)) return
                        throw error
                    }
                    break
                }
                case 'update':
                    {
                        const updated = await noteService.updateNote(item.noteId, item.payload)
                        await databaseService.saveNotes([{ ...updated, is_synced: 1, is_deleted: 0 }])
                    }
                    break
                case 'delete':
                    await noteService.deleteNote(item.noteId)
                    break
            }
        }

        this.manager = new OfflineSyncManager(
            mobileOfflineStorageAdapter,
            performSync,
            mobileNetworkStatusProvider
        )
    }

    getManager() {
        if (!this.manager) throw new Error('SyncService not initialized')
        return this.manager
    }
}

export const mobileSyncService = new MobileSyncService()
