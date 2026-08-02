import { OfflineSyncManager } from '@core/services/offlineSyncManager'
import { mobileOfflineStorageAdapter } from '../adapters/offlineStorage'
import { mobileNetworkStatusProvider } from '../adapters/networkStatus'
import { NoteService } from '@core/services/notes'
import type { MutationQueueItem } from '@core/types/offline'
import type { Note } from '@core/types/domain'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isPostgrestNoRowsError } from '@core/utils/postgrest'
import { databaseService } from './database'

type ErrorWithCode = Error & { code?: string }
const isUniqueViolation = (error: unknown): boolean => {
    return typeof error === 'object'
        && error !== null
        && 'code' in error
        && (error as ErrorWithCode).code === '23505'
}

const syncCreate = async (item: MutationQueueItem, noteService: NoteService): Promise<void> => {
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
}

const syncUpdate = async (item: MutationQueueItem, noteService: NoteService): Promise<void> => {
    const payload = item.payload as Partial<Note> & { user_id?: string }
    const localNote = await databaseService.getLocalNoteById(item.noteId)
    const noteData = {
        title: payload.title ?? localNote?.title ?? 'Untitled',
        description: payload.description ?? localNote?.description ?? '',
        tags: payload.tags ?? localNote?.tags ?? [],
        userId: payload.user_id ?? localNote?.user_id ?? '',
    }

    try {
        const updated = await noteService.updateNote(item.noteId, {
            title: noteData.title,
            description: noteData.description,
            tags: noteData.tags,
        })
        await databaseService.saveNotes([{ ...updated, is_synced: 1, is_deleted: 0 }])
    } catch (error) {
        if (!isPostgrestNoRowsError(error)) throw error

        const created = await noteService.createNote({
            id: item.noteId,
            title: noteData.title,
            description: noteData.description,
            tags: noteData.tags,
            userId: noteData.userId,
        })
        await databaseService.saveNotes([{ ...created, is_synced: 1, is_deleted: 0 }])
    }
}

const syncTagMutation = async (item: MutationQueueItem, noteService: NoteService): Promise<void> => {
    const payload = item.payload
    const tag = typeof payload.tag === 'string' ? payload.tag.trim() : undefined
    const userId = typeof payload.user_id === 'string' ? payload.user_id.trim() : undefined
    const replacement = typeof payload.replacement === 'string'
        ? payload.replacement.trim()
        : undefined
    if (!tag || !userId || (item.operation === 'renameTag' && !replacement)) {
        throw new Error(`Invalid ${item.operation} queue payload`)
    }

    const changedNotes = item.operation === 'renameTag'
        ? await noteService.renameTag(userId, tag, replacement ?? '')
        : await noteService.deleteTag(userId, tag)

    if (changedNotes.length > 0) {
        await databaseService.saveNotes(changedNotes.map((note) => ({
            ...note,
            is_synced: 1,
            is_deleted: 0,
        })))
    }
}

const performSync = async (item: MutationQueueItem, noteService: NoteService): Promise<void> => {
    switch (item.operation) {
        case 'create':
            await syncCreate(item, noteService)
            return
        case 'update':
            await syncUpdate(item, noteService)
            return
        case 'renameTag':
        case 'deleteTag':
            await syncTagMutation(item, noteService)
            return
        case 'delete':
            await noteService.deleteNote(item.noteId)
            return
    }
}

export class MobileSyncService {
    private manager: OfflineSyncManager | null = null

    init(supabase: SupabaseClient) {
        if (this.manager) return

        const noteService = new NoteService(supabase)

        this.manager = new OfflineSyncManager(
            mobileOfflineStorageAdapter,
            (item) => performSync(item, noteService),
            mobileNetworkStatusProvider
        )
    }

    getManager() {
        if (!this.manager) throw new Error('SyncService not initialized')
        return this.manager
    }
}

export const mobileSyncService = new MobileSyncService()
