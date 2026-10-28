import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useNotesQuery } from './useNotesQuery'
import { useCreateNote, useUpdateNote, useDeleteNote, useRemoveTag } from './useNotesMutations'
import { useInfiniteScroll } from './useInfiniteScroll'
import type { NoteViewModel, SearchResult } from '@core/types/domain'
import type { CachedNote } from '@core/types/offline'
import { useNoteAuth } from './useNoteAuth'
import { useNoteSearch } from './useNoteSearch'
import { useNoteSelection } from './useNoteSelection'
import { useNoteSync } from './useNoteSync'
import { useNoteData } from './useNoteData'
import { useNoteRefresh } from './useNoteRefresh'
import { useNoteSaveHandlers } from './useNoteSaveHandlers'
import { useNoteBulkActions } from './useNoteBulkActions'
import { useNoteWorkspaceTabs } from './useNoteWorkspaceTabs'
import { useGuardedSignOut } from './useGuardedSignOut'
import { MOBILE_BREAKPOINT } from './use-mobile'
import type { NoteDraftSnapshot, NoteViewSession } from '@core/services/noteWorkspaceTabs'
import type { NoteEditorHandle } from '@ui/web/components/features/notes/NoteEditor'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'
import { NoteService } from '@core/services/notes'
import {
  renameTagInNotes,
  deleteTagFromNotes,
  cleanUnusedOrEmptyTagsInNotes,
} from '@core/services/tags'
import { type NotesUiStateSnapshot } from '@ui/web/lib/settingsNavigationState'
import { readNoteWorkspaceState } from '@ui/web/lib/noteWorkspaceStorage'
import { clearActiveSettingsNoteReturnPath } from '@ui/web/lib/aiIndexNavigationState'
import { mergeNoteFields, pickLatestNote } from '@core/utils/noteSnapshot'


export type EditFormState = {
  title: string
  description: string
  tags: string
}

type AIPaginationControls = {
  resetAIResults: () => void
  loadMoreAI: () => void
}

type TagChange = <T extends { tags?: string[] }>(notes: T[]) => T[]

const ownerlessNotice = 'Some cached notes have an unknown account and could not be reconciled. They are kept locally; changes affecting them are blocked.'
const ownerlessBlock = 'Some cached notes with an unknown account would be changed. They were kept for safety.'

function changeTouchesCachedNotes(change: TagChange, notes: CachedNote[]): boolean {
  return change(notes).some((note, index) => note !== notes[index])
}

function hasUnsyncedCachedNotes(notes: CachedNote[], userId: string): boolean {
  return notes.some((note) => (
    (!note.user_id || note.user_id === userId) &&
    (note.status !== 'synced' || Boolean(note.pendingOps?.length))
  ))
}

export function useNoteAppController() {
  const { supabase, user: providerUser } = useSupabase()

  // -- Auth --
  const {
    user,
    loading: authLoadingState,
    handleSignInWithGoogle,
    handleTestLogin,
    handleSkipAuth,
    handleSignOut: performSignOut,
    handleDeleteAccount,
    deleteAccountLoading
  } = useNoteAuth()

  // -- Selection --
  const {
    selectedNote: legacySelectedNote,
    isEditing: legacyIsEditing,
    setSelectedNote: setLegacySelectedNote,
    setIsEditing: setLegacyIsEditing,
    deleteDialogOpen,
    setDeleteDialogOpen,
    noteToDelete,
    setNoteToDelete,
    selectedNoteIds,
    selectionMode,
    bulkDeleting,
    setBulkDeleting,
    handleDeleteNote,
    enterSelectionMode,
    exitSelectionMode,
    toggleNoteSelection,
    selectAllVisible: selectAllVisibleCallback,
    clearSelection,
    handleSelectNote: handleSelectNoteLegacy,
    handleSearchResultClick: handleSearchResultClickLegacy,
    handleEditNote: handleEditNoteRaw,
    handleCreateNote,
  } = useNoteSelection()

  // -- Notes workspace tabs --
  // The existing selection hook still owns bulk-selection/dialog state. The
  // selected note and editor mode are now derived from the active workspace tab
  // so every save/navigation consumer observes the same session.
  // The auth hook mirrors provider state in an effect. During an account
  // transition those values can disagree for one render; do not expose or
  // persist either workspace until they identify the same account.
  const workspaceUserId = user && providerUser?.id === user.id ? user.id : null
  const workspace = useNoteWorkspaceTabs(workspaceUserId)
  const {
    activeTab,
    hydrated: workspaceHydrated,
    storageReadable: workspaceStorageReadable,
    tabs,
    activeTabId,
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
  } = workspace
  const workspaceContextRef = useRef({ userId: workspaceUserId, tabId: activeTabId, mode: activeTab.mode, revision: 0 })
  useEffect(() => {
    const previous = workspaceContextRef.current
    if (previous.userId !== workspaceUserId || previous.tabId !== activeTabId || previous.mode !== activeTab.mode) {
      workspaceContextRef.current = { userId: workspaceUserId, tabId: activeTabId, mode: activeTab.mode, revision: previous.revision + 1 }
    }
  }, [activeTab.mode, activeTabId, workspaceUserId])
  const selectedNote = activeTab.note
  const isEditing = activeTab.mode === 'editing'
  const [notePaneVisible, setNotePaneVisible] = useState(false)
  const [tabPendingClose, setTabPendingClose] = useState<{ tabId: string; label: string } | null>(null)
  const legacyBridgeAppliedRef = useRef(false)

  const setSelectedNote = useCallback((value: NoteViewModel | null | ((previous: NoteViewModel | null) => NoteViewModel | null)) => {
    const currentNote = activeTab.note
    const note = typeof value === 'function' ? value(currentNote) : value
    updateTab(activeTabId, {
      note,
      noteId: note?.id ?? null,
    })
  }, [activeTab.note, activeTabId, updateTab])

  const setIsEditing = useCallback((value: boolean | ((previous: boolean) => boolean)) => {
    const editing = typeof value === 'function' ? value(isEditing) : value
    updateTab(activeTabId, { mode: editing ? 'editing' : 'reading' })
  }, [activeTabId, isEditing, updateTab])

  useEffect(() => {
    if (!workspaceHydrated || legacyBridgeAppliedRef.current) return
    legacyBridgeAppliedRef.current = true
    if (activeTab.note || (!legacySelectedNote && !legacyIsEditing)) return
    updateTab(activeTabId, {
      ...(legacySelectedNote ? { note: legacySelectedNote, noteId: legacySelectedNote.id } : {}),
      mode: legacyIsEditing ? 'editing' : 'reading',
    })
  }, [
    activeTab.note,
    legacyIsEditing,
    legacySelectedNote,
    activeTabId,
    updateTab,
    workspaceHydrated,
  ])

  // -- Editor ref (cross-cutting: bridges UI editor with save/navigation logic) --
  const noteEditorRef = useRef<React.RefObject<NoteEditorHandle | null> | null>(null)
  const workspaceViewCaptureRef = useRef<(() => void) | null>(null)
  const addingTabRef = useRef(false)
  const tagMutationInProgressRef = useRef(false)
  const deferredTagNavigationRef = useRef(false)

  const registerNoteEditorRef = useCallback((ref: React.RefObject<NoteEditorHandle | null>) => {
    noteEditorRef.current = ref
  }, [])

  const registerWorkspaceViewCapture = useCallback((capture: (() => void) | null) => {
    workspaceViewCaptureRef.current = capture
  }, [])

  const flushPendingEditorSave = useCallback(async () => {
    if (!isEditing) return
    const handle = noteEditorRef.current?.current
    if (!handle) return
    await handle.flushPendingSave()
  }, [isEditing])

  const captureActiveTabSession = useCallback(() => {
    // Reading panes debounce their scroll persistence. Capture their latest
    // positions before a transition mounts a different presenter for a tab.
    workspaceViewCaptureRef.current?.()
    const session = noteEditorRef.current?.current?.captureSession?.()
    if (!session) return

    updateTab(activeTabId, {
      draft: session.draft as NoteDraftSnapshot,
      view: session.view as NoteViewSession,
    })
  }, [activeTabId, updateTab])

  /**
   * Captures the outgoing tab session and flushes pending autosave work.
   * Returns `false` when the flush fails so callers abort the transition:
   * the failed tab keeps its draft and error state and the user can retry.
   * Never rejects — save errors are already surfaced on the tab itself.
   */
  const flushAndCaptureActiveTab = useCallback(async (): Promise<boolean> => {
    captureActiveTabSession()
    try {
      await flushPendingEditorSave()
      return true
    } catch {
      return false
    }
  }, [captureActiveTabSession, flushPendingEditorSave])

  // -- Infrastructure --
  const queryClient = useQueryClient()
  const noteService = useMemo(() => new NoteService(supabase), [supabase])
  const createNoteMutation = useCreateNote()
  const updateNoteMutation = useUpdateNote()
  const deleteNoteMutation = useDeleteNote()
  const removeTagMutation = useRemoveTag()

  // -- Sync & Offline --
  const {
    offlineOverlay,
    setOfflineOverlay,
    pendingCount,
    setPendingCount,
    failedCount,
    setFailedCount,
    isOffline,
    lastSavedAt,
    setLastSavedAt,
    offlineCache,
    enqueueMutation,
    enqueueBatchAndDrainIfOnline,
    offlineQueueRef
  } = useNoteSync({
    user,
    createNoteMutation,
    updateNoteMutation,
    deleteNoteMutation
  })

  // -- Search --
  const {
    searchQuery,
    filterByTag,
    isSearchPanelOpen,
    setIsSearchPanelOpen,
    handleSearch,
    handleTagClick: onTagClick,
    handleClearTagFilter,
    showFTSResults,
    aggregatedFtsData,
    ftsObserverTarget,
    ftsHasMore,
    ftsLoadingMore,
    ftsAccumulatedResults,
    loadMoreFts,
    ftsSearchResult,
    resetFtsResults,
    showTagOnlyResults,
    tagOnlyResults,
    tagOnlyTotal,
    tagOnlyLoading,
    tagOnlyHasMore,
    tagOnlyLoadingMore,
    loadMoreTagOnly,
  } = useNoteSearch(user?.id)

  // -- Notes query --
  const notesQuery = useNotesQuery({
    userId: user?.id,
    // Main notes list must stay stable while search is rendered in SearchResultsPanel.
    searchQuery: '',
    // Tag filtering is now scoped to search panel results only.
    selectedTag: null,
    enabled: !!user,
  })

  // -- Computed note data --
  const {
    notes,
    resolveSearchResult,
    mergedFtsData,
    notesDisplayed,
    notesTotal,
    selectedCount,
    notesRef,
  } = useNoteData({
    notesQuery,
    offlineOverlay,
    aggregatedFtsData,
    selectedNoteIds,
  })

  // -- Infinite Scroll --
  const observerTarget = useInfiniteScroll(
    notesQuery.fetchNextPage,
    notesQuery.hasNextPage,
    notesQuery.isFetchingNextPage,
    { threshold: 0.8, rootMargin: '200px' }
  )

  // Ref to avoid stale closure in save handlers and nav wrappers
  const selectedNoteRef = useRef(selectedNote)
  const latestEditRequestRef = useRef(0)
  const latestSelectRequestRef = useRef(0)
  const latestSearchClickRequestRef = useRef(0)
  useEffect(() => {
    selectedNoteRef.current = selectedNote
  }, [selectedNote])

  const hasPendingLocalWrites = useCallback((noteId: string) => (
    offlineOverlay.some((note) => (
      note.id === noteId &&
      (
        note.status !== 'synced' ||
        Boolean(note.pendingOps?.some((operation) => operation !== 'delete'))
      )
    ))
  ), [offlineOverlay])

  const { refreshList: refreshNotes, refreshNote: refreshSelectedNote } = useNoteRefresh({
    userId: user?.id,
    tabId: activeTabId,
    note: selectedNote ?? undefined,
    isEditing,
    noteService,
    queryClient,
    offlineCache,
    hasPendingChanges: id => hasPendingLocalWrites(id) || tabs.some(tab => (
      tab.noteId === id && (tab.saveState !== 'saved' ||
        (tab.mode === 'editing' && tab.id === activeTabId && notePaneVisible))
    )),
    onCachedNotesRemoved: removed => {
      const revisions = new Map(removed.map(note => [note.id, note.updatedAt]))
      setOfflineOverlay(current => current.filter(note => (
        revisions.get(note.id) !== note.updatedAt || note.status !== 'synced' || Boolean(note.pendingOps?.length)
      )))
      resetTabsForNotes(removed.map(note => note.id))
      if (selectedNote && revisions.has(selectedNote.id)) setNotePaneVisible(false)
    },
    onNoteRefreshed: (note) => updateTab(activeTabId, {
      note,
      draft: { title: note.title, description: note.description ?? '', tags: (note.tags ?? []).join(', ') },
    }),
    onNoteDeleted: async (id) => {
      resetTabsForNotes([id])
      setNotePaneVisible(false)
      await offlineCache.deleteNote(id)
      setOfflineOverlay((current) => current.filter((note) => note.id !== id))
      await queryClient.invalidateQueries({ queryKey: ['notes', user?.id] })
      toast.info('This note was deleted on another device.')
    },
  })

  const resolveOpenableNote = useCallback(async <T extends NoteViewModel | SearchResult>(note: T): Promise<T | null> => {
    if (isOffline || hasPendingLocalWrites(note.id)) {
      return note
    }

    try {
      const remoteResult = await noteService.getNoteStatus(note.id)
      if (remoteResult.status === 'found') {
        return pickLatestNote([
          mergeNoteFields(note, remoteResult.note),
          note,
        ]) ?? mergeNoteFields(note, remoteResult.note)
      }

      if (remoteResult.status === 'not_found') {
        await offlineCache.deleteNote(note.id)
        setOfflineOverlay((current) => current.filter((cachedNote) => cachedNote.id !== note.id))
        toast.error('This note was deleted on another device.')
        queryClient.invalidateQueries({ queryKey: ['notes'] }).catch(() => {})
        queryClient.invalidateQueries({ queryKey: ['aiSearch'] }).catch(() => {})
        return null
      }

      console.warn('Transient error checking note status, using local version:', remoteResult.error)
    } catch (error) {
      console.warn('Failed to check note status, using local version:', error)
    }

    return note
  }, [hasPendingLocalWrites, isOffline, noteService, offlineCache, setOfflineOverlay, queryClient])

  // -- Save handlers --
  const {
    saving,
    autoSaving,
    handleAutoSave,
    handleSaveNote,
    handleReadNote,
    confirmDeleteNote,
    waitForPendingNoteWrites,
    handleRemoveTagFromNote,
  } = useNoteSaveHandlers({
    user,
    isOffline,
    offlineCache,
    enqueueMutation,
    offlineQueueRef,
    setOfflineOverlay,
    setPendingCount,
    setFailedCount,
    setLastSavedAt,
    createNoteMutation,
    updateNoteMutation,
    deleteNoteMutation,
    removeTagMutation,
    selectedNote,
    setSelectedNote,
    setIsEditing,
    noteToDelete,
    setDeleteDialogOpen,
    setNoteToDelete,
    notes,
    notesRef,
    selectedNoteRef,
  })

  const prepareNotesForDeletion = useCallback(async (noteIds: readonly string[]) => {
    // The only mounted editor belongs to the active tab, even in split view.
    // Keep its live draft and finish autosave before touching its delete.
    if (activeTab.noteId && noteIds.includes(activeTab.noteId)) {
      if (!(await flushAndCaptureActiveTab())) {
        throw new Error('Could not save the open note. Retry before deleting.')
      }
    }
    try {
      await waitForPendingNoteWrites(noteIds)
    } catch {
      throw new Error('Could not save the selected note. Retry before deleting.')
    }
  }, [activeTab.noteId, flushAndCaptureActiveTab, waitForPendingNoteWrites])

  const confirmDeleteNoteWithWorkspace = useCallback(async () => {
    const deletedNoteId = noteToDelete?.id ?? null
    if (!deletedNoteId) return
    try {
      await prepareNotesForDeletion([deletedNoteId])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the note before deleting.')
      setDeleteDialogOpen(false)
      setNoteToDelete(null)
      return
    }
    // The save handler clears the active tab's noteId before we run, so the
    // tab that shows the note must be resolved before the delete.
    const tabHoldingNote = deletedNoteId ? findTabByNoteId(deletedNoteId) : null
    const deleted = await confirmDeleteNote()
    // A deleted note must not survive in any workspace tab: a stale tab would
    // keep rendering it (or its draft as the tab label) and typing there
    // would re-create the note.
    if (deleted && deletedNoteId) {
      resetTabsForNotes([deletedNoteId])
      if (tabHoldingNote) {
        updateTab(tabHoldingNote.id, {
          note: null,
          noteId: null,
          mode: 'reading',
          draft: { title: '', description: '', tags: '' },
          view: { scrollTop: 0, titleSelection: undefined, editorSelection: undefined },
          saveState: 'saved',
          saveError: null,
        })
      }
    }
  }, [confirmDeleteNote, findTabByNoteId, noteToDelete, prepareNotesForDeletion, resetTabsForNotes, setDeleteDialogOpen, setNoteToDelete, updateTab])

  const handleDraftChange = useCallback((draft: NoteDraftSnapshot) => {
    updateTab(activeTabId, {
      draft,
      saveState: 'dirty',
      saveError: null,
    })
  }, [activeTabId, updateTab])

  const handleViewSessionChange = useCallback((view: Partial<NoteViewSession>) => {
    updateTab(activeTabId, { view })
  }, [activeTabId, updateTab])

  const handleTabViewSessionChange = useCallback((tabId: string, noteId: string | null, view: Partial<NoteViewSession>) => {
    updateTabForNote(tabId, noteId, { view })
  }, [updateTabForNote])

  const savedTabRevisionRef = useRef(new Map<string, number>())
  const markTabSaved = useCallback((tabId: string) => {
    savedTabRevisionRef.current.set(tabId, (savedTabRevisionRef.current.get(tabId) ?? 0) + 1)
  }, [])

  const handleAutoSaveWithWorkspace = useCallback(async (data: {
    noteId?: string
    title: string
    description: string
    tags: string
  }) => {
    updateTab(activeTabId, {
      draft: { title: data.title, description: data.description, tags: data.tags },
      saveState: 'saving',
      saveError: null,
    })
    try {
      if (tagMutationInProgressRef.current) throw new Error('Wait for the tag update to finish, then retry saving.')
      const result = await handleAutoSave(data)
      markTabSaved(activeTabId)
      updateTab(activeTabId, { saveState: 'saved', saveError: null })
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      updateTab(activeTabId, { saveState: 'error', saveError: message })
      throw error
    }
  }, [activeTabId, handleAutoSave, markTabSaved, updateTab])

  const handleSaveNoteWithWorkspace = useCallback(async (data: {
    title: string
    description: string
    tags: string
  }) => {
    updateTab(activeTabId, {
      draft: data,
      saveState: 'saving',
      saveError: null,
    })
    try {
      if (tagMutationInProgressRef.current) throw new Error('Wait for the tag update to finish, then retry saving.')
      await handleSaveNote(data)
      markTabSaved(activeTabId)
      updateTab(activeTabId, { saveState: 'saved', saveError: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      updateTab(activeTabId, { saveState: 'error', saveError: message })
    }
  }, [activeTabId, handleSaveNote, markTabSaved, updateTab])

  const handleReadNoteWithWorkspace = useCallback(async (data: {
    title: string
    description: string
    tags: string
  }) => {
    updateTab(activeTabId, {
      draft: data,
      saveState: 'saving',
      saveError: null,
    })
    try {
      if (tagMutationInProgressRef.current) throw new Error('Wait for the tag update to finish, then retry saving.')
      await handleReadNote(data)
      markTabSaved(activeTabId)
      updateTab(activeTabId, { saveState: 'saved', saveError: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      updateTab(activeTabId, { saveState: 'error', saveError: message })
    }
  }, [activeTabId, handleReadNote, markTabSaved, updateTab])

  const prepareSignOut = useCallback(async () => {
    if (!workspaceHydrated) return false
    const revision = savedTabRevisionRef.current.get(activeTabId) ?? 0
    if (!(await flushAndCaptureActiveTab())) return false
    try {
      await waitForPendingNoteWrites(tabs.flatMap(tab => tab.noteId ? [tab.noteId] : []))
    } catch {
      return false
    }
    const activeSavedDuringCheck = (savedTabRevisionRef.current.get(activeTabId) ?? 0) > revision
    return workspaceStorageReadable && tabs.every(tab => tab.saveState === 'saved' || (tab.id === activeTabId && activeSavedDuringCheck))
  }, [activeTabId, flushAndCaptureActiveTab, tabs, waitForPendingNoteWrites, workspaceHydrated, workspaceStorageReadable])
  const signOutGuard = useGuardedSignOut(workspaceUserId, prepareSignOut, performSignOut)

  // -- Bulk actions --
  const { selectAllVisible, deleteSelectedNotes, deleteNotesByIds } = useNoteBulkActions({
    userId: user?.id,
    selectedNoteIds,
    isOffline,
    enqueueBatchAndDrainIfOnline,
    offlineQueueRef,
    offlineCache,
    setOfflineOverlay,
    setPendingCount,
    deleteNoteMutation,
    exitSelectionMode,
    setBulkDeleting,
    onNotesDeleted: resetTabsForNotes,
    beforeDelete: prepareNotesForDeletion,
    queryClient,
    notes,
    selectAllVisibleCallback,
  })

  // -- Nav wrappers: flush pending editor save before any navigation --
  const hideNotePane = useCallback(async (): Promise<boolean> => {
    const requestId = ++latestSelectRequestRef.current
    const flushed = await flushAndCaptureActiveTab()
    if (!flushed || requestId !== latestSelectRequestRef.current) return false
    clearActiveSettingsNoteReturnPath()
    // Hiding the pane retains the tab and its draft for later use.
    handleSelectNoteLegacy(null)
    setNotePaneVisible(false)
    setLastSavedAt(null)
    return true
  }, [flushAndCaptureActiveTab, handleSelectNoteLegacy, setLastSavedAt])

  const wrappedHandleSelectNote = useCallback(async (note: NoteViewModel | null) => {
    if (!note) {
      await hideNotePane()
      return
    }
    const requestId = ++latestSelectRequestRef.current
    const flushed = await flushAndCaptureActiveTab()
    if (!flushed || requestId !== latestSelectRequestRef.current) return
    clearActiveSettingsNoteReturnPath()

    const existingTab = findTabByNoteId(note.id)
    if (existingTab) {
      activateTab(existingTab.id)
      setNotePaneVisible(true)
      if (existingTab.id === activeTabId) {
        setLegacyIsEditing(false)
        setIsEditing(false)
      }
      setLastSavedAt(null)
      return
    }

    const openableNote = await resolveOpenableNote(note)
    if (requestId !== latestSelectRequestRef.current) return
    if (!openableNote) return
    openNote(openableNote)
    handleSelectNoteLegacy(openableNote)
    setNotePaneVisible(true)
    setLastSavedAt(null)
  }, [
    flushAndCaptureActiveTab,
    resolveOpenableNote,
    setIsEditing,
    setLastSavedAt,
    activeTabId,
    activateTab,
    findTabByNoteId,
    openNote,
    handleSelectNoteLegacy,
    setLegacyIsEditing,
    hideNotePane,
  ])

  const wrappedHandleCreateNote = useCallback(async () => {
    if (!(await flushAndCaptureActiveTab())) return
    clearActiveSettingsNoteReturnPath()
    updateTab(activeTabId, {
      note: null,
      noteId: null,
      mode: 'editing',
      draft: { title: '', description: '', tags: '' },
      view: { scrollTop: 0, titleSelection: undefined, editorSelection: undefined },
      saveState: 'saved',
      saveError: null,
    })
    handleCreateNote()
    setNotePaneVisible(true)
    setLastSavedAt(null)
  }, [activeTabId, flushAndCaptureActiveTab, handleCreateNote, setLastSavedAt, updateTab])

  const wrappedHandleEditNote = useCallback(async (note: NoteViewModel) => {
    const requestId = ++latestEditRequestRef.current
    const flushed = await flushAndCaptureActiveTab()
    if (!flushed || requestId !== latestEditRequestRef.current) return
    const openableNote = await resolveOpenableNote(note)
    if (requestId !== latestEditRequestRef.current) return
    if (!openableNote) {
      handleSelectNoteLegacy(null)
      setNotePaneVisible(false)
      return
    }

    const existingTab = findTabByNoteId(openableNote.id)
    if (existingTab) {
      activateTab(existingTab.id)
      // Only the mode changes: an unsaved dirty/error marker must survive
      // entering the editor, otherwise a failed save looks resolved.
      updateTab(existingTab.id, { mode: 'editing' })
      handleEditNoteRaw(openableNote)
    } else {
      openNote(openableNote)
      updateTab(activeTabId, { mode: 'editing' })
      handleEditNoteRaw(openableNote)
    }
    setNotePaneVisible(true)
    setLastSavedAt(null)
  }, [
    flushAndCaptureActiveTab,
    resolveOpenableNote,
    setLastSavedAt,
    activeTabId,
    activateTab,
    findTabByNoteId,
    openNote,
    updateTab,
    handleEditNoteRaw,
    handleSelectNoteLegacy,
  ])

  const handleTagClick = useCallback(async (tag: string) => {
    await flushAndCaptureActiveTab()
    clearActiveSettingsNoteReturnPath()
    onTagClick(tag)
    setLegacySelectedNote(null)
    setLegacyIsEditing(false)
    setNotePaneVisible(false)
    setLastSavedAt(null)
  }, [flushAndCaptureActiveTab, onTagClick, setLastSavedAt, setLegacySelectedNote, setLegacyIsEditing])

  const wrappedHandleSearchResultClick = useCallback(async (note: SearchResult) => {
    const requestId = ++latestSearchClickRequestRef.current
    const flushed = await flushAndCaptureActiveTab()
    if (!flushed || requestId !== latestSearchClickRequestRef.current) return
    clearActiveSettingsNoteReturnPath()
    const resolvedSearchNote = resolveSearchResult(note)
    const existingTab = findTabByNoteId(resolvedSearchNote.id)
    if (existingTab) {
      activateTab(existingTab.id)
      handleSearchResultClickLegacy(resolvedSearchNote)
      setNotePaneVisible(true)
      setLastSavedAt(null)
      return
    }
    const openableNote = await resolveOpenableNote(resolvedSearchNote)
    if (requestId !== latestSearchClickRequestRef.current) return
    if (!openableNote) return
    openNote(openableNote)
    handleSearchResultClickLegacy(openableNote)
    setNotePaneVisible(true)
    setLastSavedAt(null)
  }, [
    flushAndCaptureActiveTab,
    resolveOpenableNote,
    resolveSearchResult,
    setLastSavedAt,
    activateTab,
    findTabByNoteId,
    openNote,
    handleSearchResultClickLegacy,
  ])

  const handleAddTab = useCallback(async () => {
    if (!workspaceHydrated || !canAddTab || addingTabRef.current) return null
    addingTabRef.current = true
    try {
      if (!(await flushAndCaptureActiveTab())) return null
      const tabId = addTab()
      // On mobile, an empty tab must return to the note list so the user can
      // choose which note fills the new active slot. Desktop keeps its editor
      // pane visible through the responsive `md:flex` layout rule.
      setNotePaneVisible(false)
      return tabId
    } finally {
      addingTabRef.current = false
    }
  }, [addTab, canAddTab, flushAndCaptureActiveTab, workspaceHydrated])

  const handleActivateTab = useCallback(async (tabId: string) => {
    const targetTab = tabs.find((tab) => tab.id === tabId)
    if (!targetTab) return false
    if (tabId === activeTabId) {
      setNotePaneVisible(Boolean(targetTab.note || targetTab.mode === 'editing'))
      return true
    }
    if (!(await flushAndCaptureActiveTab())) return false
    activateTab(tabId)
    setNotePaneVisible(Boolean(targetTab.note || targetTab.mode === 'editing'))
    setLastSavedAt(null)
    return true
  }, [activateTab, activeTabId, flushAndCaptureActiveTab, setLastSavedAt, tabs])

  /**
   * Closes a tab, skipping the autosave flush when the caller has already
   * agreed to discard a failed save (flushing would only fail again).
   */
  const closeTabNow = useCallback(async (tabId: string, discardFailedSave: boolean) => {
    const tabIndex = tabs.findIndex((candidate) => candidate.id === tabId)
    if (tabIndex < 0) return
    const tab = tabs[tabIndex]
    const nextVisibleTab = tab.id === activeTabId
      ? (tabs[tabIndex + 1] ?? tabs[tabIndex - 1] ?? null)
      : tabs.find((candidate) => candidate.id === activeTabId) ?? null

    if (tab.id === activeTabId && !discardFailedSave) {
      if (!(await flushAndCaptureActiveTab())) return
    }

    closeTab(tabId)
    setNotePaneVisible(Boolean(nextVisibleTab?.note || nextVisibleTab?.mode === 'editing'))
    setLastSavedAt(null)
  }, [activeTabId, closeTab, flushAndCaptureActiveTab, setLastSavedAt, tabs])

  const handleCloseTab = useCallback(async (tabId: string) => {
    const tab = tabs.find((candidate) => candidate.id === tabId)
    if (!tab) return

    // An inactive tab has no mounted editor to flush. Ask before losing any
    // unfinished draft, even if it was restored as dirty or saving.
    if (tab.saveState === 'error' || (tab.id !== activeTabId && tab.saveState !== 'saved')) {
      // A failed save may be a brand-new note that never reached the server,
      // so the saved title can be missing — fall back to the live draft.
      setTabPendingClose({
        tabId,
        label: tab.note?.title?.trim() || tab.draft.title.trim() || 'this tab',
      })
      return
    }

    await closeTabNow(tabId, false)
  }, [activeTabId, closeTabNow, tabs])

  const confirmCloseTab = useCallback(async () => {
    const pending = tabPendingClose
    setTabPendingClose(null)
    if (pending) await closeTabNow(pending.tabId, true)
  }, [closeTabNow, tabPendingClose])

  const cancelCloseTab = useCallback(() => setTabPendingClose(null), [])

  const workspaceHydrationAppliedUserRef = useRef<string | null>(null)
  useEffect(() => {
    if (!user?.id) {
      workspaceHydrationAppliedUserRef.current = null
      return
    }
    if (!workspaceHydrated || workspaceHydrationAppliedUserRef.current === user.id) return
    workspaceHydrationAppliedUserRef.current = user.id
    const params = new URLSearchParams(window.location.search)
    const mobileDestination = window.innerWidth < MOBILE_BREAKPOINT &&
      (params.get('view') === 'notes' || params.get('search') === 'open')
    setNotePaneVisible(!mobileDestination && Boolean(activeTab.note || activeTab.mode === 'editing'))
  }, [activeTab, user?.id, workspaceHydrated])

  const aiPaginationControlsRef = useRef<AIPaginationControls>({
    resetAIResults: () => {},
    loadMoreAI: () => {},
  })

  const registerAIPaginationControls = useCallback((controls: AIPaginationControls) => {
    aiPaginationControlsRef.current = controls
  }, [])

  const resetAIResults = useCallback(() => {
    aiPaginationControlsRef.current.resetAIResults()
  }, [])

  const loadMoreAI = useCallback(() => {
    aiPaginationControlsRef.current.loadMoreAI()
  }, [])

  const captureSettingsReturnState = useCallback(async (): Promise<NotesUiStateSnapshot | null> => {
    if (!workspaceHydrated || !workspaceUserId) return null
    const contextRevision = workspaceContextRef.current.revision
    const contextIsCurrent = () => workspaceContextRef.current.revision === contextRevision
    const revision = savedTabRevisionRef.current.get(activeTabId) ?? 0
    if (!(await flushAndCaptureActiveTab())) return null
    if (!contextIsCurrent()) return null
    try {
      await waitForPendingNoteWrites(tabs.flatMap(tab => tab.noteId ? [tab.noteId] : []))
    } catch {
      toast.error('Could not finish saving. Retry before opening settings.')
      return null
    }
    if (!contextIsCurrent()) return null
    // The user may have typed while another tab's local write was in flight.
    // Drain the active editor once more immediately before leaving.
    if (!(await flushAndCaptureActiveTab()) || !contextIsCurrent()) return null

    // A tab can be evicted from sessionStorage when the workspace exceeds
    // its budget, or a write can fail while an older snapshot remains readable.
    // Only navigate if each unfinished draft survives an actual read-back.
    const activeSavedDuringCheck = (savedTabRevisionRef.current.get(activeTabId) ?? 0) > revision
    const unsavedTabs = tabs.filter(tab => tab.saveState !== 'saved' && !(tab.id === activeTabId && activeSavedDuringCheck))
    if (unsavedTabs.length > 0) {
      let storageReadable = true
      const restored = readNoteWorkspaceState({ userId: workspaceUserId, onStorageFailure: () => { storageReadable = false } })
      const draftsAreRecoverable = storageReadable && unsavedTabs.every(tab => {
        const stored = restored.tabs.find(candidate => candidate.id === tab.id)
        return stored && stored.noteId === tab.noteId && stored.mode === tab.mode
          && stored.saveState !== 'saved'
          && stored.draft.title === tab.draft.title
          && stored.draft.description === tab.draft.description
          && stored.draft.tags === tab.draft.tags
      })
      if (!draftsAreRecoverable) {
        toast.error('Some unsaved changes cannot be kept while opening settings. Save them or close their tabs first.')
        return null
      }
    }
    const selectedNoteForSnapshot = selectedNoteRef.current

    return {
      selectedNoteId: selectedNoteForSnapshot?.id ?? null,
      selectedNote: selectedNoteForSnapshot ?? null,
      isEditing,
      isSearchPanelOpen,
      searchQuery,
      filterByTag,
    }
  }, [activeTabId, filterByTag, flushAndCaptureActiveTab, isEditing, isSearchPanelOpen, searchQuery, selectedNoteRef, tabs, waitForPendingNoteWrites, workspaceHydrated, workspaceUserId])

  const resolveSettingsReturnNote = useCallback(async (snapshot: NotesUiStateSnapshot) => {
    if (!snapshot.selectedNoteId) return null

    const cachedNote = pickLatestNote([
      notesRef.current.find((note) => note.id === snapshot.selectedNoteId),
      snapshot.selectedNote,
    ])
    if (cachedNote) return cachedNote

    try {
      return await noteService.getNote(snapshot.selectedNoteId)
    } catch {
      return null
    }
  }, [noteService, notesRef])

  const restoreSettingsSearchState = useCallback((snapshot: NotesUiStateSnapshot) => {
    if (snapshot.searchQuery) {
      handleSearch(snapshot.searchQuery)
    } else {
      resetFtsResults()
    }

    if (snapshot.filterByTag) {
      onTagClick(snapshot.filterByTag)
    } else {
      handleClearTagFilter()
    }
  }, [handleClearTagFilter, handleSearch, onTagClick, resetFtsResults])

  const restoreSettingsWorkspaceState = useCallback((
    restoredSelectedNote: NoteViewModel | null,
    canRestoreEditing: boolean,
  ) => {
    const mode = canRestoreEditing ? 'editing' : 'reading'
    if (restoredSelectedNote) {
      setLegacySelectedNote(restoredSelectedNote)
      setLegacyIsEditing(canRestoreEditing)
      const existingTab = findTabByNoteId(restoredSelectedNote.id)
      if (existingTab) {
        activateTab(existingTab.id)
        updateTab(existingTab.id, { mode })
      } else {
        openNote(restoredSelectedNote)
        updateTab(activeTabId, { mode })
      }
    } else {
      setLegacySelectedNote(null)
      setLegacyIsEditing(canRestoreEditing)
      updateTab(activeTabId, {
        note: null,
        noteId: null,
        mode,
      })
    }
  }, [
    activeTabId,
    activateTab,
    findTabByNoteId,
    openNote,
    setLegacyIsEditing,
    setLegacySelectedNote,
    updateTab,
  ])

  const restoreUiState = useCallback(async (snapshot: NotesUiStateSnapshot) => {
    // Temporary bridge for the /settings route. The contract is intentionally narrow
    // and should not keep expanding forever. If returning from settings needs richer
    // workspace history, move the primary notes UI state into route/history instead.
    const restoredSelectedNote = await resolveSettingsReturnNote(snapshot)
    const canRestoreEditing = snapshot.isEditing && (
      restoredSelectedNote !== null || snapshot.selectedNoteId === null
    )

    restoreSettingsSearchState(snapshot)
    setIsSearchPanelOpen(
      snapshot.isSearchPanelOpen || Boolean(snapshot.searchQuery) || Boolean(snapshot.filterByTag),
    )
    restoreSettingsWorkspaceState(restoredSelectedNote, canRestoreEditing)
    setNotePaneVisible(Boolean(restoredSelectedNote || canRestoreEditing))
  }, [
    resolveSettingsReturnNote,
    restoreSettingsSearchState,
    restoreSettingsWorkspaceState,
    setIsSearchPanelOpen,
  ])

  // -- Main Navigation View --
  const [activeMainView, setActiveMainView] = useState<'notes' | 'tags'>(() => {
    if (typeof window === 'undefined') return 'notes'
    return new URLSearchParams(window.location.search).get('view') === 'tags' ? 'tags' : 'notes'
  })

  const syncSearchPanelFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setIsSearchPanelOpen(params.get('search') === 'open')
  }, [setIsSearchPanelOpen])

  const syncNavigationFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return
    if (tagMutationInProgressRef.current) {
      deferredTagNavigationRef.current = true
      return
    }

    const params = new URLSearchParams(window.location.search)
    setActiveMainView(params.get('view') === 'tags' ? 'tags' : 'notes')
    syncSearchPanelFromUrl()
  }, [setActiveMainView, syncSearchPanelFromUrl])

  useEffect(() => {
    // Reconcile the server-rendered notes fallback with the browser URL on mount.
    // This state update is intentional: the route may already be /?view=tags after hydration.
    syncNavigationFromUrl()
    window.addEventListener('popstate', syncNavigationFromUrl)
    return () => window.removeEventListener('popstate', syncNavigationFromUrl)
  }, [syncNavigationFromUrl])

  // -- Batch tag mutations --
  // A current count and a refresh of every loaded page are required before
  // mutating. This mitigates pagination truncation; it is not an atomic
  // snapshot across pages or a replacement for cross-device conflict control.
  const [tagCoveragePages, setTagCoveragePages] = useState<unknown>(null)
  const [tagCoverageMessage, setTagCoverageMessage] = useState<string | null>(null)
  const [tagCoverageNotice, setTagCoverageNotice] = useState<string | null>(null)
  const [checkingTagCoverage, setCheckingTagCoverage] = useState(false)
  const [tagMutationInProgress, setTagMutationInProgress] = useState(false)
  const tagMutationQueueRef = useRef<Promise<void>>(Promise.resolve())
  const tagRecoveryPendingRef = useRef<TagChange | null>(null)

  const localTagBlockReason = !workspaceHydrated
    ? 'Restoring open notes. Please wait before managing tags.'
    : isOffline
    ? 'Connect to the internet to manage tags across notes.'
    : pendingCount || failedCount
      ? 'Finish syncing your notes before managing tags.'
      : saving || autoSaving || tabs.some((tab) => tab.saveState !== 'saved')
        ? 'Save changes in open notes before managing tags.'
        : null

  const tagManagementBlockReason = localTagBlockReason ?? tagCoverageMessage ?? (
    !tagCoveragePages || tagCoveragePages !== notesQuery.data?.pages
      ? 'Check the loaded notes before managing tags.'
      : null
  )

  const verifyTagSnapshot = useCallback(async (): Promise<{ notes: NoteViewModel[]; ownerless: CachedNote[] }> => {
    if (!user) throw new Error('Sign in to manage tags.')
    if (!workspaceHydrated) throw new Error('Restoring open notes. Please wait before managing tags.')
    if (isOffline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      throw new Error('Connect to the internet to manage tags across notes.')
    }
    if (saving || autoSaving || tabs.some((tab) => tab.saveState !== 'saved')) {
      throw new Error('Save changes in open notes before managing tags.')
    }
    const queue = await offlineQueueRef.current.getQueue()
    const cached = await offlineCache.loadNotes()
    if (queue.length || hasUnsyncedCachedNotes(cached, user.id)) {
      throw new Error('Finish syncing your notes before managing tags.')
    }

    const refreshed = await notesQuery.refetch({ throwOnError: true })
    const pages = refreshed.data?.pages
    if (!pages?.length || pages.some((page) => !Number.isInteger(page.totalCount))) {
      throw new Error('Could not verify the loaded notes. Try again.')
    }
    const loadedNotes = pages.flatMap((page) => page.notes)
    const ids = loadedNotes.map((note) => note.id)
    const loadedCount = new Set(ids).size
    const { count, error } = await supabase.from('notes')
      .select('id', { count: 'exact', head: true }).eq('user_id', user.id)
    if (error || count === null) throw new Error('Could not verify the total number of notes. Try again.')
    if (loadedCount !== ids.length) {
      throw new Error('Some notes appeared more than once. Refresh and check again.')
    }
    if (loadedCount < count) {
      throw new Error(`Loaded ${loadedCount} of ${count} notes. Load more notes and check again.`)
    }
    if (loadedCount > count || pages.some((page) => page.totalCount !== count)) {
      throw new Error('Notes changed while loading. Refresh and check again.')
    }
    const existingIds = await noteService.getExistingNoteIds(ids, user.id)
    if (existingIds.length !== count) throw new Error('Notes changed while checking. Refresh and check again.')
    const verifiedIds = new Set(existingIds)
    if (tabs.some((tab) => tab.noteId && !verifiedIds.has(tab.noteId))) {
      throw new Error('An open note is no longer available. Close its tab and check again.')
    }
    // A draft or ownerless cache entry could have arrived during the server reads.
    const latestCached = await offlineCache.loadNotes()
    const latestQueue = await offlineQueueRef.current.getQueue()
    if (latestQueue.length || hasUnsyncedCachedNotes(latestCached, user.id)) {
      throw new Error('Finish syncing your notes before managing tags.')
    }
    const ownerless = latestCached.filter((note) => !note.user_id && !note.deleted && !verifiedIds.has(note.id))
    setTagCoverageNotice(ownerless.length ? ownerlessNotice : null)
    setTagCoveragePages(pages)
    setTagCoverageMessage(null)
    return { notes: loadedNotes as NoteViewModel[], ownerless }
  }, [user, workspaceHydrated, isOffline, saving, autoSaving, tabs, offlineQueueRef, offlineCache, notesQuery, supabase, noteService])

  const loadMoreTagNotes = useCallback(async () => {
    setTagCoveragePages(null)
    setTagCoverageMessage(null)
    try {
      await notesQuery.fetchNextPage({ throwOnError: true })
    } catch {
      setTagCoverageMessage('Could not load more notes. Check your connection and try again.')
    }
  }, [notesQuery])

  const persistTagChanges = useCallback(async (updated: NoteViewModel[], original: NoteViewModel[]) => {
    const changed = updated.filter((note, index) => note !== original[index])
    // Limit simultaneous requests and stop issuing more after a failure.
    for (let offset = 0; offset < changed.length; offset += 8) {
      const results = await Promise.allSettled(changed.slice(offset, offset + 8).map((note) => (
        updateNoteMutation.mutateAsync({ id: note.id, tags: note.tags, silent: true, deferCacheRefresh: true })
      )))
      if (results.some((result) => result.status === 'rejected')) {
        // A response may be lost after the server applied it. A compensating
        // update cannot safely undo an unknown outcome or a concurrent edit.
        throw new Error('The tag change may be incomplete.')
      }
    }
  }, [updateNoteMutation])

  const refreshTagMutationState = useCallback(async (change: TagChange) => {
    if (!user) throw new Error('Sign in to refresh notes.')
    const open = tabs.filter((tab) => tab.noteId && tab.note && tab.saveState === 'saved')
    const openIds = open.map((tab) => tab.noteId!)
    const refreshedOpen = await noteService.getNotesByIds(openIds, user.id)
    const refreshedOpenIds = new Set(refreshedOpen.map((note) => note.id))
    const missingOpenIds = openIds.filter((id) => !refreshedOpenIds.has(id))
    if (missingOpenIds.length) {
      const existing = await noteService.getExistingNoteIds(missingOpenIds, user.id)
      if (existing.length) throw new Error('Some open notes could not be refreshed. Try again.')
      // Keep even saved tabs: a late editor update may contain a local draft.
      throw new Error('An open note is no longer available. Close its tab and check again.')
    }
    const cached = await offlineCache.loadNotes()
    const queue = await offlineQueueRef.current.getQueue()
    if (queue.length || hasUnsyncedCachedNotes(cached, user.id)) {
      throw new Error('Finish syncing your notes before managing tags.')
    }
    const candidates = cached.filter((note) => (
      (!note.user_id || note.user_id === user.id) && note.status === 'synced' && !note.deleted && !note.pendingOps?.length
    ))
    const cachedIds = candidates.map((note) => note.id)
    const remoteCached = []
    for (let offset = 0; offset < cachedIds.length; offset += 100) {
      remoteCached.push(...await noteService.getNotesByIds(cachedIds.slice(offset, offset + 100), user.id))
    }
    const remoteTags = new Map(remoteCached.map((note) => [note.id, note.tags ?? []]))
    const missing = candidates.filter((note) => !remoteTags.has(note.id))
    if (missing.length) {
      // An incomplete response is not evidence of deletion. The exact count
      // also prevents a server row limit or temporary error from removing data.
      const existing = await noteService.getExistingNoteIds(missing.map((note) => note.id), user.id)
      if (existing.length) throw new Error('Some cached notes could not be refreshed. Try again.')
    }
    const ownerless = missing.filter((note) => !note.user_id)
    if (changeTouchesCachedNotes(change, ownerless)) throw new Error(ownerlessBlock)
    const missingOwned = missing.filter((note) => note.user_id === user.id)
    const patches = candidates.filter((note) => remoteTags.has(note.id))
      .map((expected) => ({ expected, tags: remoteTags.get(expected.id)! }))
    const updated = await offlineCache.patchSyncedTags(patches)
    if (updated.length !== patches.length) throw new Error('Some cached notes could not be refreshed safely.')
    // This conditional transaction checks the cache snapshot and queue again,
    // protecting a draft or queued write that arrived during the server reads.
    const removed = missingOwned.length ? await offlineCache.removeSyncedNotes(missingOwned) : []
    const updatedSet = new Set(updated)
    const removedSet = new Set(removed)
    const snapshots = new Map(candidates.map((note) => [note.id, note]))
    setOfflineOverlay((previous) => previous.flatMap((note) => {
      const expected = snapshots.get(note.id)
      if (!expected || JSON.stringify(note) !== JSON.stringify(expected)) return [note]
      if (removedSet.has(note.id)) return []
      return updatedSet.has(note.id) ? [{ ...note, tags: remoteTags.get(note.id)! }] : [note]
    }))
    if (removed.length !== missingOwned.length) throw new Error('Some cached notes changed while refreshing. Try again.')
    updateSavedTags(refreshedOpen.map((note) => ({ id: note.id, tags: note.tags ?? [] })))
    await notesQuery.refetch({ throwOnError: true })
    await queryClient.invalidateQueries({ queryKey: ['tags', 'all-with-counts'] })
    // The cache and queue can change during those reads. Do not claim success
    // if a new draft arrived or an unverified ownerless note now matches.
    const finalCached = await offlineCache.loadNotes()
    const finalQueue = await offlineQueueRef.current.getQueue()
    if (finalQueue.length || hasUnsyncedCachedNotes(finalCached, user.id)) {
      throw new Error('Finish syncing your notes before managing tags.')
    }
    const unverifiedOwnerless = finalCached.filter((note) => !note.user_id && !note.deleted && !remoteTags.has(note.id))
    if (changeTouchesCachedNotes(change, unverifiedOwnerless)) throw new Error(ownerlessBlock)
    setTagCoverageNotice(unverifiedOwnerless.length ? ownerlessNotice : null)
  }, [user, tabs, noteService, offlineCache, offlineQueueRef, setOfflineOverlay, updateSavedTags, notesQuery, queryClient])

  const checkTagCoverage = useCallback(async () => {
    setCheckingTagCoverage(true)
    setTagCoveragePages(null)
    try {
      await verifyTagSnapshot()
      const pendingChange = tagRecoveryPendingRef.current
      if (pendingChange) {
        await refreshTagMutationState(pendingChange)
        tagRecoveryPendingRef.current = null
        await verifyTagSnapshot()
      }
    } catch (error) {
      setTagCoveragePages(null)
      setTagCoverageMessage(error instanceof Error ? error.message : 'Could not verify the loaded notes. Try again.')
    } finally {
      setCheckingTagCoverage(false)
    }
  }, [verifyTagSnapshot, refreshTagMutationState])

  const runTagMutation = useCallback((change: TagChange, success: string) => {
    const run = async (): Promise<boolean | string> => {
      tagMutationInProgressRef.current = true
      setTagMutationInProgress(true)
      setTagCoveragePages(null)
      let writeStarted = false
      try {
        let snapshot = await verifyTagSnapshot()
        let recoveredPending = false
        const pendingChange = tagRecoveryPendingRef.current
        if (pendingChange) {
          await refreshTagMutationState(pendingChange)
          tagRecoveryPendingRef.current = null
          snapshot = await verifyTagSnapshot()
          recoveredPending = true
        }
        if (changeTouchesCachedNotes(change, snapshot.ownerless)) throw new Error(ownerlessBlock)
        const current = snapshot.notes
        const updated = change(current)
        if (updated.every((note, index) => note === current[index])) {
          const message = 'No matching tags found in the loaded notes.'
          toast.info(message)
          const previous = recoveredPending ? ' Review the refreshed notes to confirm the previous change.' : ''
          return `No tag changes were sent by this attempt. ${message}${previous}`
        }
        writeStarted = true
        await persistTagChanges(updated, current)
        await refreshTagMutationState(change)
        setTagCoveragePages(null)
        toast.success(success)
        return true
      } catch (error) {
        setTagCoveragePages(null)
        if (!writeStarted) {
          const message = error instanceof Error ? error.message : 'Could not verify the loaded notes.'
          setTagCoverageMessage(message)
          toast.error(message)
          return `No tag changes were sent by this attempt. ${message}`
        } else {
          try {
            await refreshTagMutationState(change)
            tagRecoveryPendingRef.current = null
            toast.error('The tag change may be incomplete. Notes were refreshed; review them before retrying.')
          } catch {
            tagRecoveryPendingRef.current = change
            // Even when a tab or cached snapshot cannot be reconciled, refresh
            // the list independently if the server is reachable. This is not
            // enough to clear recovery or claim the batch succeeded.
            await Promise.allSettled([
              notesQuery.refetch({ throwOnError: true }),
              queryClient.invalidateQueries({ queryKey: ['tags', 'all-with-counts'] }),
            ])
            toast.error('The tag change could not be confirmed. Reconnect and refresh your notes before retrying.')
          }
          setTagCoverageMessage('Refresh and check the notes before managing tags again.')
        }
        return false
      } finally {
        tagMutationInProgressRef.current = false
        setTagMutationInProgress(false)
        if (deferredTagNavigationRef.current) {
          deferredTagNavigationRef.current = false
          syncNavigationFromUrl()
        }
      }
    }
    const queued = tagMutationQueueRef.current.then(run, run)
    tagMutationQueueRef.current = queued.then(() => undefined, () => undefined)
    return queued
  }, [verifyTagSnapshot, persistTagChanges, refreshTagMutationState, syncNavigationFromUrl, notesQuery, queryClient])

  const handleRenameTag = useCallback((oldTag: string, newTag: string) => (
    runTagMutation((current) => renameTagInNotes(current, oldTag, newTag), `Tag "${oldTag}" renamed to "${newTag}"`)
  ), [runTagMutation])
  const handleDeleteTag = useCallback((tag: string) => (
    runTagMutation((current) => deleteTagFromNotes(current, tag), `Tag "${tag}" deleted`)
  ), [runTagMutation])
  const handleCleanTags = useCallback(() => (
    runTagMutation(cleanUnusedOrEmptyTagsInNotes, 'Cleaned up empty and duplicate tags')
  ), [runTagMutation])

  return {
    registerNoteEditorRef,
    registerWorkspaceViewCapture,
    refreshNotes,
    refreshSelectedNote,
    // State
    user,
    loading: authLoadingState,
    selectedNote,
    searchQuery,
    isEditing,
    notePaneVisible,
    tabs,
    activeTabId,
    activeTab,
    setIsEditing,
    isSearchPanelOpen,
    setIsSearchPanelOpen,
    saving,
    filterByTag,
    deleteDialogOpen,
    setDeleteDialogOpen,
    noteToDelete,
    selectionMode,
    selectedNoteIds,
    selectedCount,
    bulkDeleting,
    deleteAccountLoading,
    isOffline,
    activeMainView,
    setActiveMainView,
    handleRenameTag,
    handleDeleteTag,
    handleCleanTags,
    tagCoverageNotice,
    prepareTagManagement: flushAndCaptureActiveTab,
    tagManagementBlockReason,
    checkTagCoverage,
    loadMoreTagNotes,
    checkingTagCoverage: checkingTagCoverage || tagMutationInProgress,
    tagMutationInProgress,



    // Data

    notes,
    notesQuery,
    ftsSearchResult,
    ftsData: mergedFtsData,
    ftsResults: ftsAccumulatedResults,
    ftsHasMore,
    ftsLoadingMore,
    showFTSResults,
    showTagOnlyResults,
    tagOnlyResults,
    tagOnlyTotal,
    tagOnlyLoading,
    tagOnlyHasMore,
    tagOnlyLoadingMore,
    observerTarget,
    ftsObserverTarget,
    totalNotes: notesTotal,
    notesDisplayed,
    notesTotal,
    pendingCount,
    failedCount,
    lastSavedAt,
    autoSaving,

    // Handlers
    handleSearch,
    handleTagClick,
    handleClearTagFilter,
    handleSignInWithGoogle,
    handleTestLogin,
    handleSkipAuth,
    handleSignOut: signOutGuard.request,
    signOutPhase: signOutGuard.phase,
    cancelSignOut: signOutGuard.cancel,
    discardAndSignOut: signOutGuard.discardAndSignOut,
    handleDeleteAccount,
    handleCreateNote: wrappedHandleCreateNote,
    handleEditNote: wrappedHandleEditNote,
    handleSaveNote: handleSaveNoteWithWorkspace,
    handleReadNote: handleReadNoteWithWorkspace,
    handleAutoSave: handleAutoSaveWithWorkspace,
    handleDraftChange,
    handleViewSessionChange,
    handleTabViewSessionChange,
    handleDeleteNote,
    confirmDeleteNote: confirmDeleteNoteWithWorkspace,
    handleRemoveTagFromNote,
    handleSelectNote: wrappedHandleSelectNote,
    hideNotePane,
    handleSearchResultClick: wrappedHandleSearchResultClick,
    addTab: handleAddTab,
    activateTab: handleActivateTab,
    closeTab: handleCloseTab,
    tabPendingClose,
    confirmCloseTab,
    cancelCloseTab,
    canAddTab,
    workspaceHydrated,
    enterSelectionMode,
    exitSelectionMode,
    toggleNoteSelection,
    selectAllVisible,
    clearSelection,
    loadMoreFts,
    loadMoreTagOnly,
    resetFtsResults,
    loadMoreAI,
    resetAIResults,
    registerAIPaginationControls,
    captureSettingsReturnState,
    restoreUiState,
    deleteSelectedNotes,
    deleteNotesByIds,

    // Helpers
    invalidateNotes: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  }
}

export type NoteAppController = ReturnType<typeof useNoteAppController>
