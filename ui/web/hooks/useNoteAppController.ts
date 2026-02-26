import { useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

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

export type EditFormState = {
  title: string
  description: string
  tags: string
}

export function useNoteAppController() {
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
    handleEditNote,
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
    ftsSearchResult
  } = useNoteSearch(user?.id)

  // -- Notes query --
  const notesQuery = useNotesQuery({
    userId: user?.id,
    searchQuery,
    selectedTag: filterByTag,
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
    showFTSResults,
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
  useEffect(() => {
    selectedNoteRef.current = selectedNote
  }, [selectedNote])

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
  const { selectAllVisible, deleteSelectedNotes } = useNoteBulkActions({
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
    showFTSResults,
    mergedFtsData,
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
    handleSelectNote(note)
    setLastSavedAt(null)
  }, [flushPendingEditorSave, handleSelectNote, setLastSavedAt, setIsEditing])

  const wrappedHandleCreateNote = useCallback(async () => {
    await flushPendingEditorSave()
    handleCreateNote()
    setLastSavedAt(null)
  }, [flushPendingEditorSave, handleCreateNote, setLastSavedAt])

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
    handleSearchResultClick(resolveSearchResult(note))
    setLastSavedAt(null)
  }, [flushPendingEditorSave, handleSearchResultClick, resolveSearchResult, setLastSavedAt, setIsEditing])

  return {
    registerNoteEditorRef,
    // State
    user,
    loading: authLoadingState,
    selectedNote,
    searchQuery,
    isEditing,
    setIsEditing,
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
    handleEditNote,
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
    deleteSelectedNotes,

    // Helpers
    invalidateNotes: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  }
}

export type NoteAppController = ReturnType<typeof useNoteAppController>
