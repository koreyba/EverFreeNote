import type { Note } from './domain'

export type NoteSyncStatus = 'synced' | 'pending' | 'failed'
export type MutationOperation = 'create' | 'update' | 'delete'
export type MutationStatus = 'pending' | 'failed' | 'synced'

export interface CachedNote extends Partial<Note> {
  id: string
  status: NoteSyncStatus
  tags?: string[]
  content?: string | null
  updatedAt: string
  pendingOps?: MutationOperation[]
}

export interface MutationQueueItem {
  id: string
  noteId: string
  operation: MutationOperation
  payload: Partial<Note>
  clientUpdatedAt: string
  status: MutationStatus
  attempts?: number
  lastError?: string
}

export type MutationQueueItemInput = Omit<MutationQueueItem, 'id' | 'status'> & {
  id?: string
  status?: MutationStatus
}

export interface SyncState {
  lastSyncAt?: string
  isOnline: boolean
  queueSize: number
}

export interface OfflineStorageAdapter {
  loadNotes(params?: { limit?: number; offset?: number }): Promise<CachedNote[]>
  saveNote(note: CachedNote): Promise<void>
  saveNotes(notes: CachedNote[]): Promise<void>
  deleteNote(noteId: string): Promise<void>
  getQueue(): Promise<MutationQueueItem[]>
  upsertQueueItem(item: MutationQueueItem): Promise<void>
  upsertQueue(items: MutationQueueItem[]): Promise<void>
  popQueueBatch(batchSize: number): Promise<MutationQueueItem[]>
  markSynced(noteId: string, updatedAt: string): Promise<void>
  markQueueItemStatus(id: string, status: MutationStatus, lastError?: string): Promise<void>
  enforceLimit(): Promise<void>
  clearAll(): Promise<void>
}

export interface SyncManager {
  enqueue(item: MutationQueueItemInput): Promise<void>
  drainQueue(options?: { batchSize?: number }): Promise<void>
  handleOnline(): Promise<void>
  handleOffline(): void
  getState(): Promise<SyncState>
}

export interface NetworkStatusProvider {
  isOnline(): boolean
  subscribe(callback: (online: boolean) => void): () => void
}
