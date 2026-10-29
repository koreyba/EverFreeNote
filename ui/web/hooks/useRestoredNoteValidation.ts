import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { NoteWorkspaceTab } from '@core/services/noteWorkspaceTabs'
import type { CachedNote, MutationQueueItem } from '@core/types/offline'
import type { NoteService } from '@core/services/notes'
import { noteListRevision } from '@ui/web/lib/noteListRevision'
import { snapshotEvidence } from '@ui/web/lib/offlineOwnership'

type Session = { userId: string | null; epoch: number }
type Status = 'idle' | 'checking' | 'offline' | 'error'
type Options = {
  ownerId: string | null
  epoch?: number
  restoredTabs: NoteWorkspaceTab[] | null
  currentTabs: NoteWorkspaceTab[]
  offline: boolean
  storageReady: boolean
  storageError: boolean
  pendingCount: number
  failedCount: number
  hasPendingWorkspaceWrites: boolean
  hasPendingWritesForTab: (tabId: string) => boolean
  cache: { loadNotes: () => Promise<CachedNote[]> }
  queue: { getQueue: () => Promise<MutationQueueItem[]> }
  noteService: Pick<NoteService, 'getExistingNoteIds'>
  queryClient: QueryClient
  getSessionSnapshot?: () => Session
  onUnavailable: (ids: string[]) => void
  onAvailable: (ids: string[]) => void
}

/** Check existence only: the restored tab, draft and local cache are never rewritten. */
export function useRestoredNoteValidation(options: Options) {
  const latest = useRef(options)
  useLayoutEffect(() => { latest.current = options }, [options])
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ ownerId: string | null; epoch?: number; status: Status }>({ ownerId: null, status: 'idle' })
  const retry = useCallback(() => setAttempt(value => value + 1), [])

  useEffect(() => {
    const onFocus = () => { if (document.visibilityState !== 'hidden') retry() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [retry])

  const { ownerId, epoch, restoredTabs, offline, storageReady, storageError, pendingCount, failedCount, hasPendingWorkspaceWrites } = options
  const openRestoredKey = JSON.stringify((restoredTabs ?? []).flatMap(original => (
    original.note?.user_id === ownerId && options.currentTabs.some(tab => tab.id === original.id && tab.noteId === original.noteId && tab.note === original.note && Boolean(tab.noteId))
      ? [original.id] : []
  )))
  useEffect(() => {
    if (!ownerId || !restoredTabs || openRestoredKey === '[]') return
    // Capture collaborators at the start of each check. Their object identities
    // do not define a new account or restored workspace.
    const { cache, queue, noteService, queryClient, getSessionSnapshot } = latest.current
    const restored = restoredTabs.filter(tab => tab.noteId && tab.note?.id === tab.noteId && tab.note.user_id === ownerId &&
      latest.current.currentTabs.some(current => current.id === tab.id && current.noteId === tab.noteId && current.note === tab.note))
    if (!restored.length) return
    const started = getSessionSnapshot?.()
    if (started && (started.userId !== ownerId || started.epoch !== epoch)) return
    const controller = new AbortController()
    const revision = noteListRevision(queryClient, ownerId)
    let active = true
    let timeout: ReturnType<typeof setTimeout> | undefined
    const isCurrent = () => {
      const current = getSessionSnapshot?.()
      const sameSession = active && !controller.signal.aborted && latest.current.ownerId === ownerId && latest.current.epoch === epoch &&
        (!started || (current?.userId === started.userId && current.epoch === started.epoch))
      if (sameSession && noteListRevision(queryClient, ownerId) !== revision) {
        // A delete changed the data while this request was in flight. Start a
        // fresh check for any restored tabs that still exist.
        retry()
        return false
      }
      return sameSession
    }
    const setCurrentStatus = (status: Status) => { if (isCurrent()) setResult({ ownerId, epoch, status }) }
    if (offline) {
      setCurrentStatus('offline')
    } else if (!storageReady) {
      setCurrentStatus('checking')
    } else if (storageError) {
      setCurrentStatus('error')
    } else {
      setCurrentStatus('checking')
      timeout = setTimeout(() => {
        if (isCurrent()) {
          setCurrentStatus('error')
          controller.abort()
        }
      }, 15000)
      const availableAtStart = latest.current.onAvailable
      const eligible = (cached: CachedNote[], queued: MutationQueueItem[]) => restored.filter(original => {
        const tab = latest.current.currentTabs.find(candidate => candidate.id === original.id && candidate.noteId === original.noteId && candidate.note === original.note)
        if (!tab || !tab.noteId || latest.current.hasPendingWritesForTab(tab.id)) return false
        // A create may still be in flight or queued. Its absence is not a deletion.
        if (queued.some(item => item.noteId === tab.noteId && item.operation === 'create')) return false
        const local = cached.find(note => note.id === tab.noteId && note.user_id === ownerId)
        if (!local) return tab.saveState === 'saved'
        return local.status === 'synced' && !local.deleted && !local.pendingOps?.length
      })
      void (async () => {
        try {
          const [cached, queued] = await Promise.all([cache.loadNotes(), queue.getQueue()])
          if (!isCurrent()) return
          const candidates = eligible(cached, queued)
          if (!candidates.length) { setCurrentStatus('idle'); return }
          const ids = candidates.map(tab => tab.noteId!)
          const snapshots = new Map(cached.filter(note => note.user_id === ownerId && ids.includes(note.id)).map(note => [note.id, snapshotEvidence(note)]))
          const found = new Set(await noteService.getExistingNoteIds(ids, ownerId, controller.signal))
          if (!isCurrent()) return
          const [cachedNow, queuedNow] = await Promise.all([cache.loadNotes(), queue.getQueue()])
          if (!isCurrent()) return
          const currentSnapshots = new Map(cachedNow.filter(note => note.user_id === ownerId && ids.includes(note.id)).map(note => [note.id, snapshotEvidence(note)]))
          const eligibleNow = eligible(cachedNow, queuedNow).filter(tab => ids.includes(tab.noteId!))
          const stillEligible = eligibleNow.filter(tab => snapshots.get(tab.noteId!) === currentSnapshots.get(tab.noteId!))
          const available = stillEligible.filter(tab => found.has(tab.noteId!)).map(tab => tab.noteId!)
          const missing = stillEligible.filter(tab => !found.has(tab.noteId!)).map(tab => tab.noteId!)
          if (available.length) availableAtStart(available)
          if (missing.length) latest.current.onUnavailable(missing)
          if (stillEligible.length !== eligibleNow.length) { retry(); return }
          setCurrentStatus('idle')
        } catch (error) {
          if (!isCurrent()) return
          console.warn('Could not verify restored notes:', error)
          setCurrentStatus('error')
        } finally {
          if (timeout) clearTimeout(timeout)
        }
      })()
    }
    return () => { active = false; controller.abort(); if (timeout) clearTimeout(timeout) }
  }, [attempt, epoch, failedCount, hasPendingWorkspaceWrites, offline, openRestoredKey, ownerId, pendingCount, restoredTabs, retry, storageError, storageReady])

  return { status: openRestoredKey !== '[]' && result.ownerId === ownerId && result.epoch === epoch ? result.status : 'idle', retry } as const
}
