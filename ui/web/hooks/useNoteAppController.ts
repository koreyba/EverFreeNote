import { useEffect, useCallback, useMemo, useRef } from 'react'
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
import type { NoteEditorHandle } from '@ui/web/components/features/notes/NoteEditor'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'
import { NoteService } from '@core/services/notes'
import { type NotesUiStateSnapshot } from '@ui/web/lib/settingsNavigationState'
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
    selectedNote,
    setSelectedNote,
    isEditing,
    setIsEditing,
    deleteDialogOpen,
    setDeleteDialogOpen,
    noteToDelete,
    setNoteToDelete,
    selectedNoteIds,
    selectionMode,
    bulkDeleting,
    setBulkDeleting,
    handleSelectNote,
    handleSearchResultClick,
    handleEditNote: handleEditNoteRaw,
    handleCreateNote,
    handleDeleteNote,
    enterSelectionMode,
    exitSelectionMode,
    toggleNoteSelection,
    selectAllVisible: selectAllVisibleCallback,
    clearSelection,
  } = useNoteSelection()

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
        void queryClient.invalidateQueries({ queryKey: ['notes'] })
        void queryClient.invalidateQueries({ queryKey: ['aiSearch'] })
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
    await flushPendingEditorSave()
    if (note?.id && selectedNoteRef.current?.id === note.id) {
      setIsEditing(false)
      setLastSavedAt(null)
      return
    }
    const openableNote = note ? await resolveOpenableNote(note) : null
    if (note && !openableNote) return
    handleSelectNote(openableNote)
    setLastSavedAt(null)
  }, [flushPendingEditorSave, handleSelectNote, resolveOpenableNote, setLastSavedAt, setIsEditing])

  const wrappedHandleCreateNote = useCallback(async () => {
    await flushPendingEditorSave()
    handleCreateNote()
    setLastSavedAt(null)
  }, [flushPendingEditorSave, handleCreateNote, setLastSavedAt])

  const wrappedHandleEditNote = useCallback(async (note: NoteViewModel) => {
    const requestId = ++latestEditRequestRef.current
    await flushPendingEditorSave()
    if (requestId !== latestEditRequestRef.current) return
    const openableNote = await resolveOpenableNote(note)
    if (!openableNote) {
      handleSelectNote(null)
      return
    }
    handleEditNoteRaw(openableNote)
    setLastSavedAt(null)
  }, [flushPendingEditorSave, handleEditNoteRaw, handleSelectNote, resolveOpenableNote, setLastSavedAt])

  const handleTagClick = useCallback(async (tag: string) => {
    await flushPendingEditorSave()
    onTagClick(tag)
    setSelectedNote(null)
    setIsEditing(false)
    setLastSavedAt(null)
  }, [flushPendingEditorSave, onTagClick, setSelectedNote, setIsEditing, setLastSavedAt])

  const wrappedHandleSearchResultClick = useCallback(async (note: SearchResult) => {
    await flushPendingEditorSave()
    if (note?.id && selectedNoteRef.current?.id === note.id) {
      setIsEditing(false)
      setLastSavedAt(null)
      return
    }
    const openableNote = await resolveOpenableNote(resolveSearchResult(note))
    if (!openableNote) return
    handleSearchResultClick(openableNote)
    setLastSavedAt(null)
  }, [flushPendingEditorSave, handleSearchResultClick, resolveOpenableNote, resolveSearchResult, setLastSavedAt, setIsEditing])

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
    await flushPendingEditorSave()
    const selectedNoteForSnapshot = selectedNoteRef.current

    return {
      selectedNoteId: selectedNoteForSnapshot?.id ?? null,
      selectedNote: selectedNoteForSnapshot ?? null,
      isEditing,
      isSearchPanelOpen,
      searchQuery,
      filterByTag,
    }
  }, [filterByTag, flushPendingEditorSave, isEditing, isSearchPanelOpen, searchQuery, selectedNoteRef])

  const restoreUiState = useCallback(async (snapshot: NotesUiStateSnapshot) => {
    // Temporary bridge for the /settings route. The contract is intentionally narrow
    // and should not keep expanding forever. If returning from settings needs richer
    // workspace history, move the primary notes UI state into route/history instead.
    let restoredSelectedNote = snapshot.selectedNoteId
      ? pickLatestNote([
        notesRef.current.find((note) => note.id === snapshot.selectedNoteId),
        snapshot.selectedNote,
      ]) ?? null
      : null

    if (!restoredSelectedNote && snapshot.selectedNoteId) {
      try {
        restoredSelectedNote = await noteService.getNote(snapshot.selectedNoteId)
      } catch {
        restoredSelectedNote = null
      }
    }

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

    setIsSearchPanelOpen(snapshot.isSearchPanelOpen || Boolean(snapshot.searchQuery) || Boolean(snapshot.filterByTag))
    const canRestoreEditing =
      snapshot.isEditing &&
      (restoredSelectedNote !== null || snapshot.selectedNoteId === null)

    setSelectedNote(restoredSelectedNote)
    setIsEditing(canRestoreEditing)
  }, [
    handleClearTagFilter,
    handleSearch,
    noteService,
    notesRef,
    onTagClick,
    resetFtsResults,
    setIsEditing,
    setIsSearchPanelOpen,
    setSelectedNote,
  ])

  return {
    registerNoteEditorRef,
    // State
    user,
    loading: authLoadingState,
    selectedNote,
    searchQuery,
    isEditing,
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
    handleSaveNote,
    handleReadNote,
    handleAutoSave,
    handleDeleteNote,
    confirmDeleteNote,
    handleRemoveTagFromNote,
    handleSelectNote: wrappedHandleSelectNote,
    handleSearchResultClick: wrappedHandleSearchResultClick,
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
