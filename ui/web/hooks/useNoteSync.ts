import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { OfflineQueueService } from '@core/services/offlineQueue'
import { OfflineSyncManager } from '@core/services/offlineSyncManager'
import { OfflineCacheService } from '@core/services/offlineCache'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import { webNetworkStatus } from '@ui/web/adapters/networkStatus'
import { isPostgrestNoRowsError } from '@core/utils/postgrest'
import type { MutationQueueItemInput, CachedNote } from '@core/types/offline'
import type { NoteInsert, NoteUpdate } from '@core/types/domain'
import type { User } from '@supabase/supabase-js'

interface UseNoteSyncProps {
    user: User | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createNoteMutation: { mutateAsync: (args: any) => Promise<any> }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateNoteMutation: { mutateAsync: (args: any) => Promise<any> }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deleteNoteMutation: { mutateAsync: (args: any) => Promise<any> }
}

export function useNoteSync({
    user,
    createNoteMutation,
    updateNoteMutation,
    deleteNoteMutation
}: UseNoteSyncProps) {
    const [offlineOverlay, setOfflineOverlay] = useState<CachedNote[]>([])
    const [pendingCount, setPendingCount] = useState(0)
    const [failedCount, setFailedCount] = useState(0)
    const [isOffline, setIsOffline] = useState<boolean>(typeof window !== 'undefined' ? !navigator.onLine : false)
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

    const offlineQueue = useMemo(() => new OfflineQueueService(webOfflineStorageAdapter), [])
    const offlineCache = useMemo(() => new OfflineCacheService(webOfflineStorageAdapter), [])

    // Refs for sync callbacks
    const userRef = useRef(user)
    const createMutationRef = useRef(createNoteMutation)
    const updateMutationRef = useRef(updateNoteMutation)
    const deleteMutationRef = useRef(deleteNoteMutation)
    const offlineCacheRef = useRef(offlineCache)
    const offlineQueueRef = useRef(offlineQueue)

    useEffect(() => {
        userRef.current = user
        createMutationRef.current = createNoteMutation
        updateMutationRef.current = updateNoteMutation
        deleteMutationRef.current = deleteNoteMutation
        offlineCacheRef.current = offlineCache
        offlineQueueRef.current = offlineQueue
    }, [user, createNoteMutation, updateNoteMutation, deleteNoteMutation, offlineCache, offlineQueue])

    const syncCallbacksRef = useRef({
        performSync: async (item: MutationQueueItemInput) => {
            const currentUser = userRef.current
            if (!currentUser) {
                throw new Error('User not authenticated - sync skipped')
            }
            const ownerId = item.payload.user_id ?? (item.payload as { userId?: string }).userId
            if (ownerId && ownerId !== currentUser.id) throw new Error('Queued note belongs to another account')
            if (item.operation === 'create') {
                const payload = item.payload as Partial<NoteInsert> & { userId?: string }
                const data = {
                    id: item.noteId,
                    title: payload.title ?? 'Untitled',
                    description: payload.description ?? '',
                    tags: payload.tags ?? [],
                    silent: true,
                }
                try {
                    await createMutationRef.current.mutateAsync({ ...data, userId: payload.userId ?? currentUser.id })
                } catch (error) {
                    // The insert may have succeeded before its response was lost.
                    if (!error || typeof error !== 'object' || !('code' in error) || error.code !== '23505') throw error
                    await updateMutationRef.current.mutateAsync(data)
                }
            } else if (item.operation === 'update') {
                const payload = item.payload as Partial<NoteUpdate>
                try {
                    await updateMutationRef.current.mutateAsync({
                        id: item.noteId,
                        silent: true,
                        title: payload.title ?? 'Untitled',
                        description: payload.description ?? '',
                        tags: payload.tags ?? [],
                    })
                } catch (error) {
                    if (!isPostgrestNoRowsError(error)) throw error
                    // Re-create with the same ID so the user's queued edits are preserved
                    await createMutationRef.current.mutateAsync({
                        id: item.noteId,
                        silent: true,
                        title: payload.title ?? 'Untitled',
                        description: payload.description ?? '',
                        tags: payload.tags ?? [],
                        userId: currentUser.id,
                    })
                }
            } else if (item.operation === 'delete') {
                await deleteMutationRef.current.mutateAsync({ id: item.noteId, silent: true })
            }
        },
        onSuccess: async (item: MutationQueueItemInput) => {
            // A completed request must not delete a newer draft saved during it.
            const queue = await offlineQueueRef.current.getQueue()
            if (!queue.some((queued) => queued.noteId === item.noteId)) {
                await offlineCacheRef.current.markSynced(item.noteId, item.clientUpdatedAt, item.clientUpdatedAt)
            }
            const cached = await offlineCacheRef.current.loadNotes()
            setOfflineOverlay(cached.filter((note) => !note.user_id || note.user_id === userRef.current?.id))
            setPendingCount(queue.filter((q) => q.status === 'pending').length)
            setFailedCount(queue.filter((q) => q.status === 'failed').length)
        },
    })

    // Create syncManager effect to avoid reading refs during render
    const syncManagerRef = useRef<OfflineSyncManager | null>(null)

    const userId = user?.id
    useEffect(() => {
        if (!userId) return
        const manager = new OfflineSyncManager(
            webOfflineStorageAdapter,
            (item) => syncCallbacksRef.current.performSync(item),
            webNetworkStatus,
            (item) => syncCallbacksRef.current.onSuccess(item)
        )
        syncManagerRef.current = manager
        return () => {
            manager.dispose()
            syncManagerRef.current = null
        }
    }, [userId])

    const enqueueMutation = useCallback(
        async (item: MutationQueueItemInput) => {
            if (syncManagerRef.current) {
                await syncManagerRef.current.enqueue(item)
            } else {
                await offlineQueue.enqueue(item)
            }
        },
        [offlineQueue]
    )

    const enqueueBatchAndDrainIfOnline = useCallback(
        async (items: MutationQueueItemInput[]) => {
            await offlineQueue.enqueueMany(items)
            if (syncManagerRef.current && !isOffline) {
                await syncManagerRef.current.drainQueue()
            }
        },
        [offlineQueue, isOffline]
    )

    const refreshQueueState = useCallback(async (onPendingZero?: () => void) => {
        const queue = await offlineQueue.getQueue()
        let cached = await offlineCache.loadNotes()
        if (!queue.length && cached.length) {
            const idsToRemove = cached.filter((c) => c.status === 'synced' && c.deleted).map((c) => c.id)
            if (idsToRemove.length) {
                for (const id of idsToRemove) {
                    await offlineCache.deleteNote(id)
                }
                cached = await offlineCache.loadNotes()
            }
        }
        setOfflineOverlay(cached.filter((note) => !note.user_id || note.user_id === userRef.current?.id))
        const pending = queue.filter((q) => q.status === 'pending').length
        const failed = queue.filter((q) => q.status === 'failed').length
        setPendingCount(pending)
        setFailedCount(failed)
        if (pending === 0) onPendingZero?.()
    }, [offlineQueue, offlineCache])

    useEffect(() => {
        if (!userId) return
        const retrySync = async () => {
            if (document.visibilityState === 'hidden') return
            try {
                // Reachability can change without navigator.onLine or an online event.
                await syncManagerRef.current?.drainQueue()
                await refreshQueueState()
            } catch (error) {
                console.warn('Background note sync will retry:', error)
            }
        }
        const timer = setInterval(() => { void retrySync() }, 15000)
        const resume = () => { void retrySync() }
        window.addEventListener('focus', resume)
        document.addEventListener('visibilitychange', resume)
        return () => {
            clearInterval(timer)
            window.removeEventListener('focus', resume)
            document.removeEventListener('visibilitychange', resume)
        }
    }, [refreshQueueState, userId])

    useEffect(() => {
        void refreshQueueState()
    }, [refreshQueueState, userId])


    useEffect(() => {
        let updateInterval: ReturnType<typeof setInterval> | null = null

        const clearUpdateInterval = () => {
            if (updateInterval) {
                clearInterval(updateInterval)
                updateInterval = null
            }
        }

        let delayedRefreshId: ReturnType<typeof setTimeout> | null = null

        const clearDelayedRefresh = () => {
            if (delayedRefreshId) {
                clearTimeout(delayedRefreshId)
                delayedRefreshId = null
            }
        }

        const handleOnline = () => {
            setIsOffline(false)
            updateInterval = setInterval(() => void refreshQueueState(clearUpdateInterval), 1000)
            void refreshQueueState(clearUpdateInterval)
            delayedRefreshId = setTimeout(() => {
                delayedRefreshId = null
                void refreshQueueState(clearUpdateInterval)
            }, 2000)
        }
        const handleOffline = () => {
            setIsOffline(true)
            clearUpdateInterval()
            clearDelayedRefresh()
        }
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
            clearUpdateInterval()
            clearDelayedRefresh()
        }
    }, [refreshQueueState, userId])

    return {
        offlineOverlay,
        setOfflineOverlay,
        pendingCount,
        setPendingCount,
        failedCount,
        setFailedCount,
        isOffline,
        lastSavedAt,
        setLastSavedAt,
        offlineQueue,
        offlineCache,
        enqueueMutation,
        enqueueBatchAndDrainIfOnline,
        offlineQueueRef // exposing this ref for manual queue checks if needed, but ideally we shouldn't
    }
}
