import { useCallback, useEffect, useMemo, useState } from 'react'
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

const INITIAL_TAB_ID = 'note-tab-initial'

export function useNoteWorkspaceTabs(userId: string | null = null) {
  // Keep the server render and the first browser render identical. The real
  // tab ID is loaded from sessionStorage immediately after hydration.
  const [state, setState] = useState(() => createNoteWorkspaceState(() => INITIAL_TAB_ID))
  const [hydratedUserId, setHydratedUserId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    // The first render must be identical on server and client. sessionStorage is
    // loaded after hydration, then the controller applies the restored active tab.
    // Re-running on a userId change is what keeps one account's cached notes
    // from being restored for the next account to sign in here.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is a browser-only hydration source
    setState(readNoteWorkspaceState({ userId }))
    setHydratedUserId(userId)
  }, [userId])

  // Only persist once the state belongs to the account currently signed in,
  // otherwise the outgoing account's tabs get rewritten under the new user.
  const hydrated = hydratedUserId === userId

  useEffect(() => {
    if (!hydrated) return
    writeNoteWorkspaceState(state)
  }, [hydrated, state])

  const addTab = useCallback(() => {
    setState((current) => addWorkspaceTab(current))
  }, [])

  const activateTab = useCallback((tabId: string) => {
    setState((current) => activateWorkspaceTab(current, tabId))
  }, [])

  const openNote = useCallback((note: NoteViewModel, tabId?: string) => {
    setState((current) => openNoteInWorkspace(current, note, tabId))
  }, [])

  const updateTab = useCallback((tabId: string, patch: NoteWorkspaceTabPatch) => {
    setState((current) => updateWorkspaceTab(current, tabId, patch))
  }, [])

  const closeTab = useCallback((tabId: string) => {
    setState((current) => closeWorkspaceTab(current, tabId))
  }, [])

  const resetTabsForNotes = useCallback((noteIds: readonly string[]) => {
    setState((current) => resetWorkspaceTabsForNotes(current, noteIds))
  }, [])

  const activeTab = useMemo(() => getActiveWorkspaceTab(state), [state])
  const findTabByNoteId = useCallback((noteId: string | null | undefined) => (
    findWorkspaceTabByNoteId(state, noteId)
  ), [state])
  const canAddTab = canAddWorkspaceTab(state)

  return {
    ...state,
    activeTab,
    hydrated,
    addTab,
    activateTab,
    openNote,
    updateTab,
    closeTab,
    resetTabsForNotes,
    findTabByNoteId,
    canAddTab,
  }
}
