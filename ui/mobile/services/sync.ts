import { OfflineSyncManager } from '@core/services/offlineSyncManager'
import { mobileOfflineStorageAdapter } from '../adapters/offlineStorage'
import { mobileNetworkStatusProvider } from '../adapters/networkStatus'
import { NoteService } from '@core/services/notes'
import type { MutationQueueItem } from '@core/types/offline'
import type { Note } from '@core/types/domain'
import type { SupabaseClient } from '@supabase/supabase-js'

export class MobileSyncService {
    private manager: OfflineSyncManager | null = null

    init(supabase: SupabaseClient) {
        if (this.manager) return

        const noteService = new NoteService(supabase)

        const performSync = async (item: MutationQueueItem) => {
            switch (item.operation) {
                case 'create': {
                    const payload = item.payload as Partial<Note> & { user_id?: string }
                    await noteService.createNote({
                        title: payload.title ?? '',
                        description: payload.description ?? '',
                        tags: payload.tags ?? [],
                        userId: payload.user_id ?? ''
                    })
                    break
                }
                case 'update':
                    await noteService.updateNote(item.noteId, item.payload)
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
