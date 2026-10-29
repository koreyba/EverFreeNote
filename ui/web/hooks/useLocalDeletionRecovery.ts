import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CachedNote } from '@core/types/offline'
import type { OfflineCacheService } from '@core/services/offlineCache'
import { forgetLocalDeletionRecovery, getLocalDeletionRecoveries, rememberLocalDeletionRecovery, subscribeLocalDeletionRecovery, type LocalDeletionRecovery } from '@ui/web/lib/localDeletionRecovery'

type Session = { userId: string | null; epoch: number }
export type LocalDeletionPlan = { ownerId: string; session?: Session; snapshots: Map<string, CachedNote> }
type Cache = Pick<OfflineCacheService, 'loadNotes' | 'removeSyncedNotes'>
const noRecoveries: LocalDeletionRecovery[] = []

/** Retain the exact local snapshot if confirmed server deletion cannot clean it safely. */
export function useLocalDeletionRecovery(ownerId: string | null, cache: Cache, getSessionSnapshot?: () => Session) {
  const [recoveryState, setRecoveryState] = useState(() => ({ ownerId, entries: getLocalDeletionRecoveries(ownerId ?? undefined) }))
  const recoveries = recoveryState.ownerId === ownerId ? recoveryState.entries : noRecoveries
  const abortRef = useRef(new AbortController())

  useEffect(() => {
    const abort = new AbortController()
    abortRef.current = abort
    const refresh = () => setRecoveryState({ ownerId, entries: getLocalDeletionRecoveries(ownerId ?? undefined) })
    refresh()
    const unsubscribe = subscribeLocalDeletionRecovery(refresh)
    return () => { abort.abort(); unsubscribe() }
  }, [ownerId])

  const isCurrent = useCallback((owner: string, session?: Session) => {
    if (!getSessionSnapshot) return owner === ownerId
    if (!session || session.userId !== owner) return false
    const now = getSessionSnapshot()
    return now.userId === session.userId && now.epoch === session.epoch
  }, [getSessionSnapshot, ownerId])

  const prepare = useCallback(async (ids: readonly string[]): Promise<LocalDeletionPlan> => {
    const session = getSessionSnapshot?.()
    if (!ownerId || !isCurrent(ownerId, session)) throw new Error('Account changed before deletion.')
    const idSet = new Set(ids)
    const cached = await cache.loadNotes()
    if (!isCurrent(ownerId, session)) throw new Error('Account changed before deletion.')
    return { ownerId, session, snapshots: new Map(cached.filter(note => idSet.has(note.id)).map(note => [note.id, note])) }
  }, [cache, getSessionSnapshot, isCurrent, ownerId])

  const removeUnchangedSnapshot = useCallback(async (owner: string, snapshot: CachedNote, signal: AbortSignal): Promise<boolean> => {
    // Never infer ownership or discard an unsynced draft. The adapter checks
    // the exact snapshot and queue together in its IndexedDB transaction.
    if (snapshot.user_id === owner && snapshot.status === 'synced' && !snapshot.deleted && !snapshot.pendingOps?.length) {
      const removed = await cache.removeSyncedNotes([snapshot], signal)
      if (removed.includes(snapshot.id)) return true
    }
    return !(await cache.loadNotes()).some(note => note.id === snapshot.id)
  }, [cache])

  const complete = useCallback(async (id: string, plan: LocalDeletionPlan): Promise<boolean> => {
    const snapshot = plan.snapshots.get(id)
    if (!snapshot || (snapshot.user_id && snapshot.user_id !== plan.ownerId)) return true
    if (isCurrent(plan.ownerId, plan.session)) {
      try {
        if (await removeUnchangedSnapshot(plan.ownerId, snapshot, abortRef.current.signal) && isCurrent(plan.ownerId, plan.session)) return true
      } catch (error) {
        console.warn('Failed to remove the local note copy:', error)
      }
    }
    rememberLocalDeletionRecovery(plan.ownerId, snapshot)
    return false
  }, [isCurrent, removeUnchangedSnapshot])

  const retry = useCallback(async (): Promise<{ cleaned: LocalDeletionRecovery[]; remaining: number }> => {
    const session = getSessionSnapshot?.()
    if (!ownerId || !isCurrent(ownerId, session)) throw new Error('Account changed before local cleanup.')
    const cleaned: LocalDeletionRecovery[] = []
    for (const recovery of getLocalDeletionRecoveries(ownerId)) {
      if (!isCurrent(ownerId, session)) break
      try {
        const removed = await removeUnchangedSnapshot(ownerId, recovery.snapshot, abortRef.current.signal)
        if (!isCurrent(ownerId, session)) break
        if (removed && forgetLocalDeletionRecovery(ownerId, recovery)) {
          cleaned.push(recovery)
        }
      } catch (error) {
        console.warn('Failed to retry local note cleanup:', error)
      }
    }
    return { cleaned, remaining: getLocalDeletionRecoveries(ownerId).length }
  }, [getSessionSnapshot, isCurrent, ownerId, removeUnchangedSnapshot])

  return useMemo(() => ({ recoveries, prepare, complete, retry }), [recoveries, prepare, complete, retry])
}
