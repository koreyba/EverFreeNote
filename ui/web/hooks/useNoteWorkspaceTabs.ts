import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  activateWorkspaceTab,
  addWorkspaceTab,
  canAddWorkspaceTab,
  closeWorkspaceTab,
  createNoteWorkspaceState,
  findWorkspaceTabByNoteId,
  getActiveWorkspaceTab,
  openNoteInWorkspace,
  resetWorkspaceTabsForNotes,
  updateWorkspaceTab,
  type NoteWorkspaceTabPatch,
} from '@core/services/noteWorkspaceTabs'
import type { NoteViewModel } from '@core/types/domain'
import { readNoteWorkspaceState, writeNoteWorkspaceState } from '@ui/web/lib/noteWorkspaceStorage'
import { useWorkspaceMemory } from '@ui/web/providers/WorkspaceMemoryProvider'

const INITIAL_TAB_ID = 'note-tab-initial'

export function useNoteWorkspaceTabs(userId: string | null = null, epoch?: number) {
  const memory = useWorkspaceMemory()
  // Keep the server render and the first browser render identical. The real
  // tab ID is loaded from sessionStorage immediately after hydration.
  const [state, setState] = useState(() => createNoteWorkspaceState(() => INITIAL_TAB_ID))
  const [hydratedUserId, setHydratedUserId] = useState<string | null | undefined>(undefined)
  const [readableUserId, setReadableUserId] = useState<string | null>(null)
  const emptyState = useMemo(() => createNoteWorkspaceState(() => INITIAL_TAB_ID, userId), [userId])

  useEffect(() => {
    // The first render must be identical on server and client. sessionStorage is
    // loaded after hydration, then the controller applies the restored active tab.
    // Re-running on a userId change is what keeps one account's cached notes
    // from being restored for the next account to sign in here.
    if (userId === null) {
      // No account is known yet. In particular, do not overwrite a saved
      // workspace while Supabase is still restoring its session.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear the outgoing account's in-memory state
      setState(emptyState)
      setHydratedUserId(undefined)
      setReadableUserId(null)
      return
    }
    memory.activateOwner(userId, epoch)
    let storageReadable = true
    const restored = readNoteWorkspaceState({ userId, onStorageFailure: () => { storageReadable = false } })
    setState(memory.read(userId) ?? restored)
    setHydratedUserId(userId)
    setReadableUserId(storageReadable ? userId : null)
  }, [emptyState, epoch, memory, userId])

  // Only persist once the state belongs to the account currently signed in,
  // otherwise the outgoing account's tabs get rewritten under the new user.
  const hydrated = userId !== null && hydratedUserId === userId && state.userId === userId
  // Never expose the outgoing account while the next account is hydrating.
  const visibleState = hydrated ? state : emptyState
  const visibleStateRef = useRef(visibleState)
  useEffect(() => { visibleStateRef.current = visibleState }, [visibleState])

  // Persistence runs on every workspace change, so the warning is raised once
  // per session — the alternative is a toast on each keystroke.
  const warnedAboutDroppedTabsRef = useRef(false)
  const warnedAboutUnavailableWorkspaceRef = useRef(false)

  useEffect(() => {
    if (!hydrated) return
    // Keep the volatile copy current after returning from another route. This
    // also prevents a stale draft from resurfacing after it has been saved or
    // discarded and the account is later selected again in this document.
    if (state.tabs.some(tab => tab.saveState !== 'saved')) memory.remember(state, epoch)
    else if (userId) memory.clear(userId, epoch)
    // If the read failed, a previous workspace may still exist. Keep the new
    // state in memory instead of replacing an unknown snapshot with a blank.
    const { persisted, droppedTabIds } = readableUserId === userId
      ? writeNoteWorkspaceState(state)
      : { persisted: false, droppedTabIds: [] }
    const readFailed = readableUserId !== userId
    const hasWork = state.tabs.some(tab => (
      tab.noteId || tab.draft.title || tab.draft.description || tab.draft.tags
    ))
    if (!persisted && !warnedAboutUnavailableWorkspaceRef.current && (readFailed || hasWork)) {
      warnedAboutUnavailableWorkspaceRef.current = true
      toast.warning('Open tabs could not be remembered', {
        description: readFailed
          ? 'Open tabs could not be restored. Save your changes before reloading.'
          : 'Save your changes before reloading; notes may need to be reopened.',
      })
    }
    if (droppedTabIds.length === 0 || warnedAboutDroppedTabsRef.current) return

    warnedAboutDroppedTabsRef.current = true
    toast.warning('Too many long notes are open to remember them all', {
      description: 'Some tabs will not come back after a reload. Close a few to keep the rest.',
    })
  }, [epoch, hydrated, memory, readableUserId, state, userId])

  const addTab = useCallback(() => {
    // Allocate before the state update so callers can identify this exact tab
    // even when other workspace actions are queued at the same time.
    const tabId = createNoteWorkspaceState().activeTabId
    setState((current) => addWorkspaceTab(current, () => tabId))
    return tabId
  }, [])

  const activateTab = useCallback((tabId: string) => {
    setState((current) => activateWorkspaceTab(current, tabId))
  }, [])

  const openNote = useCallback((note: NoteViewModel, tabId?: string) => {
    const current = visibleStateRef.current
    if (userId && !findWorkspaceTabByNoteId(current, note.id)) {
      memory.forgetCreate(userId, tabId ?? current.activeTabId, epoch)
    }
    setState((current) => openNoteInWorkspace(current, note, tabId))
  }, [epoch, memory, userId])

  const updateTab = useCallback((tabId: string, patch: NoteWorkspaceTabPatch) => {
    setState((current) => updateWorkspaceTab(current, tabId, patch))
  }, [])

  const updateTabForNote = useCallback((tabId: string, noteId: string | null, patch: NoteWorkspaceTabPatch) => {
    setState((current) => {
      const tab = current.tabs.find((candidate) => candidate.id === tabId)
      return tab && tab.noteId === noteId ? updateWorkspaceTab(current, tabId, patch) : current
    })
  }, [])

  const updateSavedTags = useCallback((snapshots: Array<{ id: string; tags: string[] }>) => {
    const tagsById = new Map(snapshots.map((note) => [note.id, note.tags]))
    setState((current) => {
      let next = current
      for (const tab of current.tabs) {
        const tags = tab.noteId ? tagsById.get(tab.noteId) : undefined
        if (!tab.note || tab.saveState !== 'saved' || !tags) continue
        next = updateWorkspaceTab(next, tab.id, {
          note: { ...tab.note, tags },
          draft: { tags: tags.join(', ') },
        })
      }
      return next
    })
  }, [])

  const closeTab = useCallback((tabId: string) => {
    if (userId) memory.forgetCreate(userId, tabId, epoch)
    setState((current) => closeWorkspaceTab(current, tabId))
  }, [epoch, memory, userId])

  const resetTabsForNotes = useCallback((noteIds: readonly string[]) => {
    if (userId) {
      for (const tab of visibleStateRef.current.tabs) {
        if (tab.noteId && noteIds.includes(tab.noteId)) memory.forgetCreate(userId, tab.id, epoch)
      }
    }
    setState((current) => resetWorkspaceTabsForNotes(current, noteIds))
  }, [epoch, memory, userId])

  const activeTab = useMemo(() => getActiveWorkspaceTab(visibleState), [visibleState])
  const findTabByNoteId = useCallback((noteId: string | null | undefined) => (
    findWorkspaceTabByNoteId(visibleState, noteId)
  ), [visibleState])
  const canAddTab = canAddWorkspaceTab(visibleState)

  return {
    ...visibleState,
    activeTab,
    hydrated,
    storageReadable: hydrated && readableUserId === userId,
    addTab,
    activateTab,
    openNote,
    updateTab,
    updateTabForNote,
    updateSavedTags,
    closeTab,
    resetTabsForNotes,
    findTabByNoteId,
    canAddTab,
  }
}
