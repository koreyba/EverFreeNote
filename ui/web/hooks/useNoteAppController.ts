import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useNotesQuery } from './useNotesQuery'
import { useCreateNote, useUpdateNote, useDeleteNote, useRemoveTag } from './useNotesMutations'
import { useInfiniteScroll } from './useInfiniteScroll'
import type { NoteViewModel, SearchResult } from '@core/types/domain'
import { useNoteAuth } from './useNoteAuth'
import { useNoteSearch } from './useNoteSearch'
import { useNoteSelection } from './useNoteSelection'
import { useNoteSync } from './useNoteSync'
import { useNoteData } from './useNoteData'
import { useNoteSaveHandlers } from './useNoteSaveHandlers'
import { useNoteBulkActions } from './useNoteBulkActions'
import { useNoteWorkspaceTabs } from './useNoteWorkspaceTabs'
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

export function useNoteAppController() {
  const { supabase } = useSupabase()

  // -- Auth --
  const {
    user,
    loading: authLoadingState,
    handleSignInWithGoogle,
    handleTestLogin,
    handleSkipAuth,
    handleSignOut,
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
  const workspace = useNoteWorkspaceTabs()
  const {
    activeTab,
    hydrated: workspaceHydrated,
    tabs,
    activeTabId,
    addTab,
    activateTab,
    openNote,
    updateTab,
    closeTab,
    findTabByNoteId,
  } = workspace
  const selectedNote = activeTab.note
  const isEditing = activeTab.mode === 'editing'
  const [notePaneVisible, setNotePaneVisible] = useState(false)
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

  const registerNoteEditorRef = useCallback((ref: React.RefObject<NoteEditorHandle | null>) => {
    noteEditorRef.current = ref
  }, [])

  const flushPendingEditorSave = useCallback(async () => {
    if (!isEditing) return
    const handle = noteEditorRef.current?.current
    if (!handle) return
    await handle.flushPendingSave()
  }, [isEditing])

  const captureActiveTabSession = useCallback(() => {
    const session = noteEditorRef.current?.current?.captureSession?.()
    if (!session) return

    updateTab(activeTabId, {
      draft: session.draft as NoteDraftSnapshot,
      view: session.view as NoteViewSession,
    })
  }, [activeTabId, updateTab])

  const flushAndCaptureActiveTab = useCallback(async () => {
    captureActiveTabSession()
    await flushPendingEditorSave()
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
    handleRemoveTagFromNote,
    persistOfflineNoteUpdates,
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
      const result = await handleAutoSave(data)
      updateTab(activeTabId, { saveState: 'saved', saveError: null })
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      updateTab(activeTabId, { saveState: 'error', saveError: message })
      throw error
    }
  }, [activeTabId, handleAutoSave, updateTab])

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
      await handleSaveNote(data)
      updateTab(activeTabId, { saveState: 'saved', saveError: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      updateTab(activeTabId, { saveState: 'error', saveError: message })
    }
  }, [activeTabId, handleSaveNote, updateTab])

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
      await handleReadNote(data)
      updateTab(activeTabId, { saveState: 'saved', saveError: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      updateTab(activeTabId, { saveState: 'error', saveError: message })
    }
  }, [activeTabId, handleReadNote, updateTab])

  // -- Bulk actions --
  const { selectAllVisible, deleteSelectedNotes, deleteNotesByIds } = useNoteBulkActions({
    selectedNoteIds,
    isOffline,
    enqueueBatchAndDrainIfOnline,
    offlineCache,
    setOfflineOverlay,
    setPendingCount,
    deleteNoteMutation,
    exitSelectionMode,
    setBulkDeleting,
    setSelectedNote,
    queryClient,
    notes,
    selectAllVisibleCallback,
  })

  // -- Nav wrappers: flush pending editor save before any navigation --
  const wrappedHandleSelectNote = useCallback(async (note: NoteViewModel | null) => {
    const requestId = ++latestSelectRequestRef.current
    await flushAndCaptureActiveTab()
    if (requestId !== latestSelectRequestRef.current) return
    clearActiveSettingsNoteReturnPath()
    if (!note) {
      // Mobile back/search navigation hides the pane without closing the tab.
      handleSelectNoteLegacy(null)
      setNotePaneVisible(false)
      setLastSavedAt(null)
      return
    }

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
  ])

  const wrappedHandleCreateNote = useCallback(async () => {
    await flushAndCaptureActiveTab()
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
    await flushAndCaptureActiveTab()
    if (requestId !== latestEditRequestRef.current) return
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
      updateTab(existingTab.id, { mode: 'editing', saveState: 'saved', saveError: null })
      handleEditNoteRaw(openableNote)
    } else {
      openNote(openableNote)
      updateTab(activeTabId, { mode: 'editing', saveState: 'saved', saveError: null })
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
    await flushAndCaptureActiveTab()
    if (requestId !== latestSearchClickRequestRef.current) return
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
    await flushAndCaptureActiveTab()
    addTab()
    // On mobile, an empty tab must return to the note list so the user can
    // choose which note fills the new active slot. Desktop keeps its editor
    // pane visible through the responsive `md:flex` layout rule.
    setNotePaneVisible(false)
  }, [addTab, flushAndCaptureActiveTab])

  const handleActivateTab = useCallback(async (tabId: string) => {
    const targetTab = tabs.find((tab) => tab.id === tabId)
    if (!targetTab) return
    if (tabId === activeTabId) {
      setNotePaneVisible(Boolean(targetTab.note || targetTab.mode === 'editing'))
      return
    }
    await flushAndCaptureActiveTab()
    activateTab(tabId)
    setNotePaneVisible(Boolean(targetTab.note || targetTab.mode === 'editing'))
    setLastSavedAt(null)
  }, [activateTab, activeTabId, flushAndCaptureActiveTab, setLastSavedAt, tabs])

  const handleCloseTab = useCallback(async (tabId: string) => {
    const tab = tabs.find((candidate) => candidate.id === tabId)
    if (!tab) return

    const tabIndex = tabs.findIndex((candidate) => candidate.id === tabId)
    const nextVisibleTab = tab.id === activeTabId
      ? (tabs[tabIndex + 1] ?? tabs[tabIndex - 1] ?? null)
      : tabs.find((candidate) => candidate.id === activeTabId) ?? null

    const discardFailedSave = tab.saveState === 'error'
      && typeof window !== 'undefined'
      && window.confirm(`Discard unsaved changes in "${tab.note?.title || 'this tab'}"?`)
    if (tab.saveState === 'error' && !discardFailedSave) return

    if (tab.id === activeTabId && !discardFailedSave) {
      try {
        await flushAndCaptureActiveTab()
      } catch {
        return
      }
    }

    closeTab(tabId)
    setNotePaneVisible(Boolean(nextVisibleTab?.note || nextVisibleTab?.mode === 'editing'))
    setLastSavedAt(null)
  }, [activeTabId, closeTab, flushAndCaptureActiveTab, setLastSavedAt, tabs])

  const workspaceHydrationAppliedRef = useRef(false)
  useEffect(() => {
    if (!workspaceHydrated || workspaceHydrationAppliedRef.current) return
    workspaceHydrationAppliedRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore pane visibility from sessionStorage
    setNotePaneVisible(Boolean(activeTab.note || activeTab.mode === 'editing'))
  }, [activeTab, workspaceHydrated])

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

  const captureSettingsReturnState = useCallback(async (): Promise<NotesUiStateSnapshot> => {
    await flushAndCaptureActiveTab()
    const selectedNoteForSnapshot = selectedNoteRef.current

    return {
      selectedNoteId: selectedNoteForSnapshot?.id ?? null,
      selectedNote: selectedNoteForSnapshot ?? null,
      isEditing,
      isSearchPanelOpen,
      searchQuery,
      filterByTag,
    }
  }, [filterByTag, flushAndCaptureActiveTab, isEditing, isSearchPanelOpen, searchQuery, selectedNoteRef])

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

    const params = new URLSearchParams(window.location.search)
    setActiveMainView(params.get('view') === 'tags' ? 'tags' : 'notes')
    syncSearchPanelFromUrl()
  }, [setActiveMainView, syncSearchPanelFromUrl])

  useEffect(() => {
    // Reconcile the server-rendered notes fallback with the browser URL on mount.
    // This state update is intentional: the route may already be /?view=tags after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- required for SSR URL reconciliation
    syncNavigationFromUrl()
    window.addEventListener('popstate', syncNavigationFromUrl)
    return () => window.removeEventListener('popstate', syncNavigationFromUrl)
  }, [syncNavigationFromUrl])

  // -- Batch Tag Mutations --
  const tagMutationQueueRef = useRef<Promise<void>>(Promise.resolve())
  const persistTagChanges = useCallback((updatedNotes: NoteViewModel[], originalNotes: NoteViewModel[]) => {
    const runMutation = async () => {
      const changedNotes = updatedNotes.filter((note, index) => note !== originalNotes[index])
      if (isOffline) {
        await persistOfflineNoteUpdates(changedNotes)
        return
      }

      const results = await Promise.allSettled(
        changedNotes.map((note) =>
          updateNoteMutation.mutateAsync({
            id: note.id,
            tags: note.tags,
          })
        )
      )
      const failedResult = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')

      if (!failedResult) return

      const rollbackResults = await Promise.allSettled(
        changedNotes.flatMap((updatedNote, index) => {
          if (results[index].status !== 'fulfilled') return []
          const originalNote = originalNotes.find((note) => note.id === updatedNote.id)
          if (!originalNote) return []
          return updateNoteMutation.mutateAsync({
            id: originalNote.id,
            tags: originalNote.tags,
          })
        })
      )
      const rollbackFailure = rollbackResults.find((result): result is PromiseRejectedResult => result.status === 'rejected')
      if (rollbackFailure) {
        throw new Error(`Tag changes failed and rollback was incomplete: ${rollbackFailure.reason instanceof Error ? rollbackFailure.reason.message : String(rollbackFailure.reason)}`)
      }

      throw failedResult.reason instanceof Error ? failedResult.reason : new Error(String(failedResult.reason))
    }

    const queuedMutation = tagMutationQueueRef.current.then(runMutation, runMutation)
    tagMutationQueueRef.current = queuedMutation.then(() => undefined, () => undefined)
    return queuedMutation
  }, [isOffline, persistOfflineNoteUpdates, updateNoteMutation])

  const handleRenameTag = useCallback(async (oldTag: string, newTag: string) => {
    const updatedNotes = renameTagInNotes(notes, oldTag, newTag)
    const changedNotes = updatedNotes.filter((note, i) => note !== notes[i])

    if (changedNotes.length === 0) return

    try {
      await persistTagChanges(updatedNotes, notes)
      toast.success(`Tag "${oldTag}" renamed to "${newTag}"`)
    } catch (error) {
      toast.error(`Failed to rename tag: ${(error as Error).message}`)
    }
  }, [notes, persistTagChanges])

  const handleDeleteTag = useCallback(async (targetTag: string) => {
    const updatedNotes = deleteTagFromNotes(notes, targetTag)
    const changedNotes = updatedNotes.filter((note, i) => note !== notes[i])

    if (changedNotes.length === 0) return

    try {
      await persistTagChanges(updatedNotes, notes)
      toast.success(`Tag "${targetTag}" deleted`)
    } catch (error) {
      toast.error(`Failed to delete tag: ${(error as Error).message}`)
    }
  }, [notes, persistTagChanges])

  const handleCleanTags = useCallback(async () => {
    const updatedNotes = cleanUnusedOrEmptyTagsInNotes(notes)
    const changedNotes = updatedNotes.filter((note, i) => note !== notes[i])

    if (changedNotes.length === 0) {
      toast.info("No empty or duplicate tags found to clean")
      return
    }

    try {
      await persistTagChanges(updatedNotes, notes)
      toast.success("Cleaned up empty and duplicate tags")
    } catch (error) {
      toast.error(`Failed to clean tags: ${(error as Error).message}`)
    }
  }, [notes, persistTagChanges])

  return {
    registerNoteEditorRef,
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
    handleSignOut,
    handleDeleteAccount,
    handleCreateNote: wrappedHandleCreateNote,
    handleEditNote: wrappedHandleEditNote,
    handleSaveNote: handleSaveNoteWithWorkspace,
    handleReadNote: handleReadNoteWithWorkspace,
    handleAutoSave: handleAutoSaveWithWorkspace,
    handleDraftChange,
    handleViewSessionChange,
    handleDeleteNote,
    confirmDeleteNote,
    handleRemoveTagFromNote,
    handleSelectNote: wrappedHandleSelectNote,
    handleSearchResultClick: wrappedHandleSearchResultClick,
    addTab: handleAddTab,
    activateTab: handleActivateTab,
    closeTab: handleCloseTab,
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

