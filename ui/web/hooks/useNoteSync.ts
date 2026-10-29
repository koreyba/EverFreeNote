import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { OfflineQueueService } from '@core/services/offlineQueue'
import { OfflineSyncManager } from '@core/services/offlineSyncManager'
import { OfflineCacheService } from '@core/services/offlineCache'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import { webNetworkStatus } from '@ui/web/adapters/networkStatus'
import { isPostgrestNoRowsError } from '@core/utils/postgrest'
import { getPendingOwnerNotes, subscribeOwnerNoteWrites } from '@ui/web/lib/ownerNoteWrites'
import { countUnverifiedNotes, isMatchingLegacySnapshot, matchesQueuedSnapshot, queueForOwner, queueOwners, snapshotEvidence, visibleLegacyNoteIds } from '@ui/web/lib/offlineOwnership'
import type { MutationQueueItem, MutationQueueItemInput, CachedNote, OfflineStorageAdapter } from '@core/types/offline'
import type { Note, NoteInsert, NoteUpdate } from '@core/types/domain'
import type { User } from '@supabase/supabase-js'

const MISSING_REMOTE_NOTE = 'This note is unavailable on the server. Local changes remain on this device.'
const LEGACY_CLAIM_FAILED = 'The device could not safely retain this note’s account ownership. Local changes remain here.'

interface UseNoteSyncProps {
    user: User | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createNoteMutation: { mutateAsync: (args: any) => Promise<any> }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateNoteMutation: { mutateAsync: (args: any) => Promise<any> }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deleteNoteMutation: { mutateAsync: (args: any) => Promise<any> }
    verifyLegacyNotes?: (ids: string[], userId: string) => Promise<Note[]>
    getSessionSnapshot?: () => { userId: string | null; epoch: number }
}

export function useNoteSync({
    user,
    createNoteMutation,
    updateNoteMutation,
    deleteNoteMutation,
    verifyLegacyNotes,
    getSessionSnapshot,
}: UseNoteSyncProps) {
    const userId = user?.id
    const [offlineOverlay, setOfflineOverlay] = useState<CachedNote[]>([])
    const [pendingOwnerNotes, setPendingOwnerNotes] = useState<CachedNote[]>(() => userId ? getPendingOwnerNotes(userId) : [])
    const pendingOwnerNotesRef = useRef(pendingOwnerNotes)
    const [legacyVisibility, setLegacyVisibility] = useState<{ userId?: string; evidence: Map<string, string> }>({ evidence: new Map() })
    const verifiedRef = useRef<{ userId?: string; evidence: Map<string, string> }>({ evidence: new Map() })
    const [localHealth, setLocalHealth] = useState<{ userId?: string; ready: boolean; error: boolean; unverified: number; unqueued: number; missingRemote: boolean; claimBlocked: boolean }>({ ready: false, error: false, unverified: 0, unqueued: 0, missingRemote: false, claimBlocked: false })
    const visibleOfflineOverlay = useMemo(() => {
        if (!userId) return []
        const legacy = legacyVisibility.userId === userId ? legacyVisibility.evidence : new Map<string, string>()
        const visible = offlineOverlay.filter(note => note.user_id === userId || (
            !note.user_id && legacy.get(note.id) === snapshotEvidence(note)
        )).map(note => note.user_id ? note : { ...note, user_id: userId })
        const ownPendingNotes = pendingOwnerNotes.filter(note => note.user_id === userId)
        if (!ownPendingNotes.length) return visible
        const byId = new Map(visible.map(note => [note.id, note]))
        ownPendingNotes.forEach(note => byId.set(note.id, note))
        return Array.from(byId.values())
    }, [legacyVisibility, offlineOverlay, pendingOwnerNotes, userId])
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
    const queueStateBarrier = useRef<Promise<void>>(Promise.resolve())
    const reconciliationAbortRef = useRef<AbortController | null>(null)
    const retryLegacyRef = useRef<(() => Promise<void>) | null>(null)
    const sessionIsCurrent = useCallback((started?: { userId: string | null; epoch: number }) => {
        if (!started || !getSessionSnapshot) return true
        const current = getSessionSnapshot()
        return current.userId === started.userId && current.epoch === started.epoch
    }, [getSessionSnapshot])

    // Only serialize local queue/cache reconciliation; network requests never hold this lock.
    const withQueueStateUpdate = useCallback(async <T,>(action: () => Promise<T>): Promise<T> => {
        const previous = queueStateBarrier.current
        let release = () => {}
        queueStateBarrier.current = new Promise<void>((resolve) => { release = resolve })
        await previous
        try {
            return await action()
        } finally {
            release()
        }
    }, [])

    const loadEvidence = useCallback(async (cached: CachedNote[], ownerId?: string) => {
        if (!ownerId) return new Map<string, string>()
        const session = verifiedRef.current.userId === ownerId ? verifiedRef.current.evidence : new Map<string, string>()
        const evidence = new Map(session)
        const claimed = new Set(await offlineCache.getLegacyClaims(ownerId, cached))
        for (const note of cached) if (claimed.has(note.id)) evidence.set(note.id, snapshotEvidence(note))
        return evidence
    }, [offlineCache])

    const scopedStorage = useMemo<OfflineStorageAdapter>(() => {
        const read = async () => {
            const [queue, cached] = await Promise.all([offlineQueue.getQueue(), offlineCache.loadNotes()])
            if (!userId || userRef.current?.id !== userId) return []
            const evidence = await loadEvidence(cached, userId)
            if (userRef.current?.id !== userId) return []
            return queueForOwner(queue, cached, userId, evidence)
        }
        return {
            ...webOfflineStorageAdapter,
            getQueue: read,
            getPendingBatch: async size => (await read()).filter(item => item.status === 'pending')
                .sort((a, b) => Date.parse(a.clientUpdatedAt) - Date.parse(b.clientUpdatedAt)).slice(0, size),
            upsertQueueItem: item => webOfflineStorageAdapter.upsertQueueItem(item),
            removeQueueItems: ids => webOfflineStorageAdapter.removeQueueItems(ids),
            markQueueItemStatus: (id, status, error) => webOfflineStorageAdapter.markQueueItemStatus(id, status, error),
        }
    }, [offlineCache, offlineQueue, userId, loadEvidence])

    const applyQueueState = useCallback((queue: MutationQueueItem[], cached: CachedNote[], ownerId: string | undefined, evidence: ReadonlyMap<string, string>) => {
        const visible = visibleLegacyNoteIds(cached, queue, ownerId, evidence)
        const authorized = new Map(cached.filter(note => visible.has(note.id)).map(note => [note.id, snapshotEvidence(note)]))
        const ownQueue = queueForOwner(queue, cached, ownerId, evidence)
        const queuedIds = new Set(ownQueue.map(item => item.noteId))
        const writingIds = new Set(ownerId ? getPendingOwnerNotes(ownerId).map(note => note.id) : [])
        const unqueued = cached.filter(note => note.user_id === ownerId && !note.deleted && note.status !== 'synced' &&
            !queuedIds.has(note.id) && !writingIds.has(note.id)).length
        setOfflineOverlay(cached)
        setLegacyVisibility({ userId: ownerId, evidence: authorized })
        setLocalHealth({ userId: ownerId, ready: true, error: false, unverified: countUnverifiedNotes(queue, cached, ownerId, evidence), unqueued, missingRemote: ownQueue.some(item => item.lastError === MISSING_REMOTE_NOTE), claimBlocked: ownQueue.some(item => item.lastError === LEGACY_CLAIM_FAILED) })
        setPendingCount(ownQueue.filter(item => item.status === 'pending').length)
        setFailedCount(ownQueue.filter(item => item.status === 'failed').length)
        return ownQueue
    }, [])

    useEffect(() => {
        const abort = new AbortController()
        reconciliationAbortRef.current = abort
        return () => { abort.abort(); if (reconciliationAbortRef.current === abort) reconciliationAbortRef.current = null }
    }, [userId])

    useEffect(() => {
        userRef.current = user
        createMutationRef.current = createNoteMutation
        updateMutationRef.current = updateNoteMutation
        deleteMutationRef.current = deleteNoteMutation
        offlineCacheRef.current = offlineCache
        offlineQueueRef.current = offlineQueue
        if (verifiedRef.current.userId !== user?.id) verifiedRef.current = { userId: user?.id, evidence: new Map() }
    }, [user, createNoteMutation, updateNoteMutation, deleteNoteMutation, offlineCache, offlineQueue])

    const syncCallbacksRef = useRef({
        performSync: async (item: MutationQueueItemInput, expectedOwner: string, isActive: () => boolean) => {
            const currentUser = userRef.current
            if (!currentUser || currentUser.id !== expectedOwner || !isActive()) {
                throw new Error('User not authenticated - sync skipped')
            }
            const ownerId = item.payload.user_id ?? (item.payload as { userId?: string }).userId
            if (ownerId && ownerId !== currentUser.id) throw new Error('Queued note belongs to another account')
            const [allQueue, cached] = await Promise.all([offlineQueueRef.current.getQueue(), offlineCacheRef.current.loadNotes()])
            const evidence = await loadEvidence(cached, currentUser.id)
            const candidate = item as MutationQueueItem
            const queue = [...allQueue.filter(entry => entry.id !== candidate.id), candidate]
            if (!isActive() || userRef.current?.id !== expectedOwner || !queueForOwner(queue, cached, expectedOwner, evidence).some(entry => entry.id === candidate.id)) {
                throw new Error('Queued note owner cannot be verified for this account')
            }
            const legacy = cached.find(note => note.id === candidate.noteId && !note.user_id)
            if (legacy && queueOwners(candidate).includes(expectedOwner) && matchesQueuedSnapshot(legacy, candidate)) {
                try {
                    const claimed = await offlineCacheRef.current.claimLegacySnapshot(legacy, candidate, expectedOwner, reconciliationAbortRef.current?.signal)
                    if (!claimed) throw new Error('Claim changed')
                } catch {
                    throw new Error(LEGACY_CLAIM_FAILED)
                }
                if (!isActive() || userRef.current?.id !== expectedOwner) throw new Error('Account changed before synchronization')
            }
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
                    // Absence may be a deletion on another device. Preserve the
                    // queued edit for an explicit recovery decision.
                    throw new Error(MISSING_REMOTE_NOTE)
                }
            } else if (item.operation === 'delete') {
                await deleteMutationRef.current.mutateAsync({ id: item.noteId, silent: true })
            }
        },
        onFailure: (ownerId: string, isActive: () => boolean) => withQueueStateUpdate(async () => {
            const queue = await offlineQueueRef.current.getQueue()
            const cached = await offlineCacheRef.current.loadNotes()
            const evidence = await loadEvidence(cached, ownerId)
            if (isActive() && userRef.current?.id === ownerId) applyQueueState(queue, cached, ownerId, evidence)
        }),
        onSuccess: (item: MutationQueueItemInput, ownerId: string, isActive: () => boolean) => withQueueStateUpdate(async () => {
            // A completed request must not delete a newer draft saved during it.
            const queue = await offlineQueueRef.current.getQueue()
            if (!queue.some((queued) => queued.noteId === item.noteId)) {
                await offlineCacheRef.current.markSynced(item.noteId, item.clientUpdatedAt, item.clientUpdatedAt)
            }
            const cached = await offlineCacheRef.current.loadNotes()
            const evidence = await loadEvidence(cached, ownerId)
            if (isActive() && userRef.current?.id === ownerId) applyQueueState(queue, cached, ownerId, evidence)
        }),
    })

    // Create syncManager effect to avoid reading refs during render
    const syncManagerRef = useRef<OfflineSyncManager | null>(null)

    useEffect(() => {
        if (!userId) return
        let active = true
        const started = getSessionSnapshot?.()
        const isActive = () => active && (!started || started.userId === userId) && sessionIsCurrent(started)
        const guardWrite = () => { if (!isActive()) throw new Error('Account changed before local synchronization') }
        const guardedStorage: OfflineStorageAdapter = {
            ...scopedStorage,
            getQueue: async () => {
                if (!isActive()) return []
                const queue = await scopedStorage.getQueue()
                return isActive() ? queue : []
            },
            getPendingBatch: async size => {
                if (!isActive()) return []
                const queue = await scopedStorage.getPendingBatch(size)
                return isActive() ? queue : []
            },
            upsertQueueItem: async item => { guardWrite(); await scopedStorage.upsertQueueItem(item) },
            removeQueueItems: async ids => { guardWrite(); await scopedStorage.removeQueueItems(ids) },
            markQueueItemStatus: async (id, status, error) => { guardWrite(); await scopedStorage.markQueueItemStatus(id, status, error) },
        }
        const manager = new OfflineSyncManager(
            guardedStorage,
            (item) => syncCallbacksRef.current.performSync(item, userId, isActive),
            webNetworkStatus,
            (item) => syncCallbacksRef.current.onSuccess(item, userId, isActive),
            () => syncCallbacksRef.current.onFailure(userId, isActive)
        )
        syncManagerRef.current = manager
        return () => {
            active = false
            manager.dispose()
            syncManagerRef.current = null
        }
    }, [getSessionSnapshot, scopedStorage, sessionIsCurrent, userId])

    const enqueueMutation = useCallback(
        async (item: MutationQueueItemInput, applyLocal?: () => Promise<void>) => {
            const enqueue = async () => {
                // A durable write started by an earlier account must still
                // complete locally after a session switch; the scoped manager
                // will only drain it for its owner.
                await offlineQueue.enqueue(item)
                await applyLocal?.()
            }
            if (applyLocal) await withQueueStateUpdate(enqueue)
            else await enqueue()
            if (syncManagerRef.current && !isOffline) {
                void syncManagerRef.current.requestDrain().catch(error => console.warn('Background note sync will retry:', error))
            }
        },
        [offlineQueue, isOffline, withQueueStateUpdate]
    )

    const enqueueBatchAndDrainIfOnline = useCallback(
        async (items: MutationQueueItemInput[], applyLocal?: () => Promise<void>) => {
            await withQueueStateUpdate(async () => {
                await offlineQueue.enqueueMany(items)
                await applyLocal?.()
            })
            if (syncManagerRef.current && !isOffline) {
                void syncManagerRef.current.requestDrain().catch((error) => {
                    console.warn('Background note sync will retry:', error)
                })
            }
        },
        [offlineQueue, isOffline, withQueueStateUpdate]
    )

    const refreshRevisionRef = useRef(0)
    const refreshQueueState = useCallback((onPendingZero?: () => void) => {
        const revision = ++refreshRevisionRef.current
        const ownerId = userRef.current?.id
        const started = getSessionSnapshot?.()
        return withQueueStateUpdate(async () => {
            try {
                const queue = await offlineQueue.getQueue()
                let cached = await offlineCache.loadNotes()
                const signal = reconciliationAbortRef.current?.signal
                const tombstones = cached.filter(note => note.user_id === ownerId && note.deleted && note.status === 'synced')
                if (ownerId && tombstones.length && signal && !signal.aborted && sessionIsCurrent(started)) {
                    const removed = await offlineCache.removeSyncedTombstones(tombstones, signal)
                    if (removed.length) cached = await offlineCache.loadNotes()
                }
                if (revision !== refreshRevisionRef.current || userRef.current?.id !== ownerId || !sessionIsCurrent(started)) return false
                const evidence = await loadEvidence(cached, ownerId)
                if (revision !== refreshRevisionRef.current || userRef.current?.id !== ownerId || !sessionIsCurrent(started)) return false
                const ownQueue = applyQueueState(queue, cached, ownerId, evidence)
                if (!ownQueue.some(item => item.status === 'pending')) onPendingZero?.()
                return true
            } catch (error) {
                if (revision === refreshRevisionRef.current && userRef.current?.id === ownerId && sessionIsCurrent(started)) {
                    setLocalHealth(previous => ({
                        ...(previous.userId === ownerId ? previous : { unverified: 0, unqueued: 0, missingRemote: false, claimBlocked: false }),
                        userId: ownerId, ready: true, error: true,
                    }))
                }
                throw error
            }
        })
    }, [offlineQueue, offlineCache, withQueueStateUpdate, applyQueueState, getSessionSnapshot, sessionIsCurrent, loadEvidence])

    useEffect(() => {
        if (!userId || !verifyLegacyNotes) return
        let active = true
        const started = getSessionSnapshot?.()
        const isActive = () => active && (!started || started.userId === userId) && sessionIsCurrent(started)
        const verify = async () => {
            if (!navigator.onLine) return
            const cached = await offlineCache.loadNotes()
            if (!isActive() || userRef.current?.id !== userId) return
            const legacy = cached.filter(note => !note.user_id && !note.deleted && note.created_at)
            if (!legacy.length) return
            const remote: Note[] = []
            for (let offset = 0; offset < legacy.length; offset += 100) {
                remote.push(...await verifyLegacyNotes(legacy.slice(offset, offset + 100).map(note => note.id), userId))
                if (!isActive() || userRef.current?.id !== userId) return
            }
            const byId = new Map(remote.map(note => [note.id, note]))
            const evidence = new Map<string, string>()
            for (const note of legacy) {
                const server = byId.get(note.id)
                if (server && isMatchingLegacySnapshot(note, server, userId)) evidence.set(note.id, snapshotEvidence(note))
            }
            const previous = verifiedRef.current.userId === userId ? verifiedRef.current.evidence : new Map<string, string>()
            const changed = previous.size !== evidence.size || [...evidence].some(([id, value]) => previous.get(id) !== value)
            verifiedRef.current = { userId, evidence }
            await refreshQueueState()
            if (changed && isActive() && userRef.current?.id === userId) void syncManagerRef.current?.requestDrain().catch(() => {})
        }
        const retry = () => { void verify().catch(() => {}) }
        retryLegacyRef.current = verify
        retry()
        window.addEventListener('online', retry)
        window.addEventListener('focus', retry)
        return () => {
            active = false
            if (retryLegacyRef.current === verify) retryLegacyRef.current = null
            window.removeEventListener('online', retry)
            window.removeEventListener('focus', retry)
        }
    }, [getSessionSnapshot, offlineCache, refreshQueueState, sessionIsCurrent, userId, verifyLegacyNotes])

    const retryLocalVerification = useCallback(async () => {
        try {
            await refreshQueueState()
            await retryLegacyRef.current?.()
            await syncManagerRef.current?.requestDrain()
            await refreshQueueState()
        } catch (error) {
            console.warn('Local data could not be checked:', error)
        }
    }, [refreshQueueState])

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
        let active = true
        if (!userId) {
            pendingOwnerNotesRef.current = []
            return
        }
        const readPending = () => {
            const notes = getPendingOwnerNotes(userId)
            pendingOwnerNotesRef.current = notes
            setPendingOwnerNotes(notes)
        }
        const unsubscribe = subscribeOwnerNoteWrites(userId, saved => {
            if (saved) {
                // Install the completed write before removing its in-memory
                // snapshot, so the new session cannot briefly show stale data.
                refreshRevisionRef.current += 1
                setOfflineOverlay(previous => [...previous.filter(note => note.id !== saved.id), saved])
                void refreshQueueState().catch(() => {})
            }
            readPending()
        })
        const current = getPendingOwnerNotes(userId)
        const missedCompletion = pendingOwnerNotesRef.current.some(note => !current.some(pending => pending.id === note.id))
        if (missedCompletion) {
            const catchUp = async () => {
                while (active) {
                    if (await refreshQueueState()) { if (active) readPending(); return }
                }
            }
            void catchUp().catch(() => {})
        } else {
            readPending()
            void refreshQueueState().catch(() => {})
        }
        return () => { active = false; unsubscribe() }
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
            updateInterval = setInterval(() => { void refreshQueueState(clearUpdateInterval).catch(() => {}) }, 1000)
            void refreshQueueState(clearUpdateInterval).catch(() => {})
            delayedRefreshId = setTimeout(() => {
                delayedRefreshId = null
                void refreshQueueState(clearUpdateInterval).catch(() => {})
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
        offlineOverlay: visibleOfflineOverlay,
        setOfflineOverlay,
        syncStateReady: Boolean(userId && localHealth.userId === userId && localHealth.ready),
        storageReadError: Boolean(userId && localHealth.userId === userId && localHealth.error),
        legacyUnverifiedCount: localHealth.userId === userId ? localHealth.unverified : 0,
        unqueuedLocalCount: localHealth.userId === userId ? localHealth.unqueued : 0,
        unavailableRemoteEdits: Boolean(userId && localHealth.userId === userId && localHealth.missingRemote),
        legacyClaimBlocked: Boolean(userId && localHealth.userId === userId && localHealth.claimBlocked),
        retryLocalVerification,
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
