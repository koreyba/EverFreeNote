import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { OfflineQueueService } from '@core/services/offlineQueue'
import { OfflineSyncManager } from '@core/services/offlineSyncManager'
import { OfflineCacheService } from '@core/services/offlineCache'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import { webNetworkStatus } from '@ui/web/adapters/networkStatus'
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
            if (item.operation === 'create') {
                const payload = item.payload as Partial<NoteInsert> & { userId?: string }
                await createMutationRef.current.mutateAsync({
                    title: payload.title ?? 'Untitled',
                    description: payload.description ?? '',
                    tags: payload.tags ?? [],
                    userId: payload.userId ?? currentUser.id,
                })
            } else if (item.operation === 'update') {
                const payload = item.payload as Partial<NoteUpdate>
                await updateMutationRef.current.mutateAsync({
                    id: item.noteId,
                    title: payload.title ?? 'Untitled',
                    description: payload.description ?? '',
                    tags: payload.tags ?? [],
                })
            } else if (item.operation === 'delete') {
                await deleteMutationRef.current.mutateAsync({ id: item.noteId, silent: true })
            }
        },
        onSuccess: async (item: MutationQueueItemInput) => {
            await offlineCacheRef.current.deleteNote(item.noteId)
            const cached = await offlineCacheRef.current.loadNotes()
            setOfflineOverlay(cached)
            const queue = await offlineQueueRef.current.getQueue()
            setPendingCount(queue.filter((q) => q.status === 'pending').length)
            setFailedCount(queue.filter((q) => q.status === 'failed').length)
        },
    })

    // Create syncManager effect to avoid reading refs during render
    const syncManagerRef = useRef<OfflineSyncManager | null>(null)

    useEffect(() => {
        if (!syncManagerRef.current) {
            syncManagerRef.current = new OfflineSyncManager(
                webOfflineStorageAdapter,
                (item) => syncCallbacksRef.current.performSync(item),
                webNetworkStatus,
                (item) => syncCallbacksRef.current.onSuccess(item)
            )
        }
    }, [])

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
            const idsToRemove = cached.filter((c) => c.status !== 'synced' || c.deleted).map((c) => c.id)
            if (idsToRemove.length) {
                for (const id of idsToRemove) {
                    await offlineCache.deleteNote(id)
                }
                cached = await offlineCache.loadNotes()
            }
        }
        setOfflineOverlay(cached)
        const pending = queue.filter((q) => q.status === 'pending').length
        const failed = queue.filter((q) => q.status === 'failed').length
        setPendingCount(pending)
        setFailedCount(failed)
        if (pending === 0) onPendingZero?.()
    }, [offlineQueue, offlineCache])

    useEffect(() => {
        void refreshQueueState()
    }, [refreshQueueState])

    useEffect(() => {
        return () => {
            syncManagerRef.current?.dispose()
        }
    }, [])

    useEffect(() => {
        let updateInterval: ReturnType<typeof setInterval> | null = null

        const clearUpdateInterval = () => {
            if (updateInterval) {
                clearInterval(updateInterval)
                updateInterval = null
            }
        }

        const handleOnline = () => {
            setIsOffline(false)
            updateInterval = setInterval(() => void refreshQueueState(clearUpdateInterval), 1000)
            void refreshQueueState(clearUpdateInterval)
            setTimeout(() => void refreshQueueState(clearUpdateInterval), 2000)
        }
        const handleOffline = () => {
            setIsOffline(true)
            clearUpdateInterval()
        }
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
            clearUpdateInterval()
        }
    }, [refreshQueueState])

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
