'use client'

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { updateWorkspaceTab, type NoteWorkspaceState } from '@core/services/noteWorkspaceTabs'
import type { NoteViewModel } from '@core/types/domain'

export type WorkspaceWriteLease = { signal: AbortSignal; finish: () => void }

type WorkspaceMemory = {
  read: (userId: string) => NoteWorkspaceState | null
  remember: (state: NoteWorkspaceState, epoch?: number) => void
  clear: (userId: string, epoch?: number) => void
  rememberCreate: (userId: string, tabId: string, note: NoteViewModel, epoch?: number) => void
  forgetCreate: (userId: string, tabId: string, epoch?: number) => void
  discardOwner: (userId: string, epoch?: number) => void
  activateOwner: (userId: string, epoch?: number) => void
  beginWrite: (userId: string, tabId: string, epoch?: number) => WorkspaceWriteLease | undefined
  cancelTabWrites: (userId: string, tabId: string, epoch?: number) => void
  cancelOwnerWrites: (userId: string, epoch?: number) => void
  hasPendingWrites: (userId: string, tabId?: string) => boolean
}

const NO_MEMORY: WorkspaceMemory = {
  read: () => null,
  remember: () => {},
  clear: () => {},
  rememberCreate: () => {},
  forgetCreate: () => {},
  discardOwner: () => {},
  activateOwner: () => {},
  beginWrite: () => undefined,
  cancelTabWrites: () => {},
  cancelOwnerWrites: () => {},
  hasPendingWrites: () => false,
}

const WorkspaceMemoryContext = createContext<WorkspaceMemory>(NO_MEMORY)

/** Volatile, account-scoped safety net for navigation within one document. */
export function WorkspaceMemoryProvider({ children }: { children: ReactNode }) {
  const snapshots = useRef(new Map<string, NoteWorkspaceState>())
  const creates = useRef(new Map<string, Map<string, NoteViewModel>>())
  const discardedEpochs = useRef(new Map<string, number>())
  const activeEpochs = useRef(new Map<string, number>())
  const writes = useRef(new Map<string, Map<string, Set<AbortController>>>())
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      // Never reveal the owner or contents, but protect another account's
      // volatile work if this browser document is about to be discarded.
      if (Array.from(snapshots.current.values()).some(state => state.tabs.some(tab => tab.saveState !== 'saved'))) {
        event.preventDefault()
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [])
  const memory = useMemo<WorkspaceMemory>(() => {
    const isStale = (userId: string, epoch?: number) => epoch !== undefined && (
      (discardedEpochs.current.get(userId) ?? -1) >= epoch ||
      (activeEpochs.current.get(userId) ?? -1) > epoch
    )
    const cancelWrites = (userId: string, tabId?: string) => {
      for (const [id, pending] of writes.current.get(userId) ?? []) {
        if (tabId === undefined || id === tabId) pending.forEach(controller => controller.abort())
      }
    }
    return {
      read: (userId) => snapshots.current.get(userId) ?? null,
      remember: (state, epoch) => {
        if (!state.userId || isStale(state.userId, epoch)) return
        let next = state
        const ownerCreates = creates.current.get(state.userId)
        for (const tab of state.tabs) {
          const note = ownerCreates?.get(tab.id)
          if (!tab.noteId && note) next = updateWorkspaceTab(next, tab.id, { note, noteId: note.id })
        }
        snapshots.current.set(state.userId, next)
      },
      clear: (userId, epoch) => {
        if (!isStale(userId, epoch)) snapshots.current.delete(userId)
      },
      rememberCreate: (userId, tabId, note, epoch) => {
        if (note.user_id !== userId || isStale(userId, epoch)) return
        const ownerCreates = creates.current.get(userId) ?? new Map<string, NoteViewModel>()
        ownerCreates.set(tabId, note)
        creates.current.set(userId, ownerCreates)
      },
      forgetCreate: (userId, tabId, epoch) => {
        if (isStale(userId, epoch)) return
        const ownerCreates = creates.current.get(userId)
        ownerCreates?.delete(tabId)
        if (ownerCreates?.size === 0) creates.current.delete(userId)
      },
      discardOwner: (userId, epoch) => {
        if (isStale(userId, epoch)) return
        cancelWrites(userId)
        if (epoch !== undefined) discardedEpochs.current.set(userId, Math.max(epoch, discardedEpochs.current.get(userId) ?? -1))
        snapshots.current.delete(userId)
        creates.current.delete(userId)
      },
      activateOwner: (userId, epoch) => {
        if (epoch !== undefined && !isStale(userId, epoch)) activeEpochs.current.set(userId, epoch)
      },
      beginWrite: (userId, tabId, epoch) => {
        const controller = new AbortController()
        if (isStale(userId, epoch)) {
          controller.abort()
          return { signal: controller.signal, finish: () => {} }
        }
        const ownerWrites = writes.current.get(userId) ?? new Map<string, Set<AbortController>>()
        const tabWrites = ownerWrites.get(tabId) ?? new Set<AbortController>()
        tabWrites.add(controller)
        ownerWrites.set(tabId, tabWrites)
        writes.current.set(userId, ownerWrites)
        let finished = false
        return {
          signal: controller.signal,
          finish: () => {
            if (finished) return
            finished = true
            tabWrites.delete(controller)
            if (tabWrites.size === 0) ownerWrites.delete(tabId)
            if (ownerWrites.size === 0) writes.current.delete(userId)
          },
        }
      },
      cancelTabWrites: (userId, tabId, epoch) => {
        if (!isStale(userId, epoch)) cancelWrites(userId, tabId)
      },
      cancelOwnerWrites: (userId, epoch) => {
        if (!isStale(userId, epoch)) cancelWrites(userId)
      },
      hasPendingWrites: (userId, tabId) => {
        const ownerWrites = writes.current.get(userId)
        return tabId === undefined ? Boolean(ownerWrites?.size) : Boolean(ownerWrites?.get(tabId)?.size)
      },
    }
  }, [])

  return <WorkspaceMemoryContext.Provider value={memory}>{children}</WorkspaceMemoryContext.Provider>
}

export function useWorkspaceMemory(): WorkspaceMemory {
  return useContext(WorkspaceMemoryContext)
}
