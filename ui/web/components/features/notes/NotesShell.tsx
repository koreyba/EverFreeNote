"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

import { cn } from "@ui/web/lib/utils"
import { Sidebar } from "@/components/features/notes/Sidebar"
import { NoteList } from "@/components/features/notes/NoteList"
import { NoteEditor, type NoteEditorHandle, type PendingChunkFocus } from "@/components/features/notes/NoteEditor"
import { NoteView } from "@/components/features/notes/NoteView"
import { EmptyState } from "@/components/features/notes/EmptyState"
import { SearchResultsPanel } from "@/components/features/notes/SearchResultsPanel"
import { NotesGraphView } from "@/components/features/notes/NotesGraphView"
import type { SearchResultsPanelHandle } from "@/components/features/notes/SearchResultsPanel"
import type { Note } from "@core/types/domain"
import type { NoteAppController } from "@ui/web/hooks/useNoteAppController"
import { normalizeTagList } from "@ui/web/lib/tags"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"
import { WordPressSettingsService } from "@core/services/wordpressSettings"
import { ApiKeysSettingsService } from "@core/services/apiKeysSettings"
import { saveSettingsReturnState } from "@ui/web/lib/settingsNavigationState"
import { consumeActiveSettingsNoteReturnPath } from "@ui/web/lib/aiIndexNavigationState"

type NoteRecord = Note & {
  content?: string | null
  headline?: string | null
  rank?: number | null
}

type NotesShellProps = {
  controller: NoteAppController
}

export function NotesShell({ controller }: NotesShellProps) {
  const router = useRouter()
  const noteEditorRef = React.useRef<NoteEditorHandle | null>(null)
  const searchPanelRef = React.useRef<SearchResultsPanelHandle | null>(null)
  const { supabase } = useSupabase()
  const wordpressSettingsService = React.useMemo(() => new WordPressSettingsService(supabase), [supabase])
  const apiKeysService = React.useMemo(() => new ApiKeysSettingsService(supabase), [supabase])
  const [wordpressConfigured, setWordpressConfigured] = React.useState(false)

  const [pendingChunkFocus, setPendingChunkFocus] = React.useState<PendingChunkFocus | null>(null)
  const [showGraphView, setShowGraphView] = React.useState(false)

  React.useEffect(() => {
    controller.registerNoteEditorRef(noteEditorRef)
  }, [controller])

  const user = controller.user
  const { data: apiKeysStatus } = useQuery({
    queryKey: ['apiKeysStatus', user?.id],
    queryFn: () => apiKeysService.getStatus(),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(user?.id),
  })
  const hasGeminiApiKey = apiKeysStatus?.gemini?.configured ?? false

  const {
    notesDisplayed,
    notesTotal,
    selectionMode,
    selectedCount,
    bulkDeleting,
    exitSelectionMode,
    selectAllVisible,
    deleteSelectedNotes,
    filterByTag,
    handleClearTagFilter,
    handleCreateNote,
    handleSignOut,
    pendingCount,
    failedCount,
    isOffline,
    selectedNote,
    isEditing,
    handleSelectNote,
    isSearchPanelOpen,
    setIsSearchPanelOpen,
  } = controller

  const refreshWordPressStatus = React.useCallback(async () => {
    try {
      const status = await wordpressSettingsService.getStatus()
      setWordpressConfigured(status.configured)
    } catch {
      setWordpressConfigured(false)
    }
  }, [wordpressSettingsService])

  React.useEffect(() => {
    void refreshWordPressStatus()
  }, [refreshWordPressStatus, user?.id])

  const handleOpenInContext = React.useCallback(async (noteId: string, charOffset: number, chunkLength: number) => {
    let note = controller.notes.find((n) => n.id === noteId)

    if (!note) {
      // Note not in the current paginated list — fetch it from the DB
      try {
        const { data } = await supabase
          .from('notes')
          .select('id, title, description, tags, created_at, updated_at, user_id')
          .eq('id', noteId)
          .maybeSingle()
        if (!data) return
        note = data as Note
      } catch (error) {
        console.error("Failed to fetch note for open-in-context", { noteId, error })
        return
      }
    }
    if (!note) return  // TypeScript: narrowing lost after await + let reassignment

    const nextPendingChunkFocus = {
      requestId: `${noteId}:${charOffset}:${chunkLength}:${Date.now()}`,
      noteId,
      charOffset,
      chunkLength,
    }
    setPendingChunkFocus(nextPendingChunkFocus)

    if (controller.selectedNote?.id === noteId && controller.isEditing) {
      return
    }

    await controller.handleEditNote(note)
  }, [controller, supabase])

  const showEditor = !!(selectedNote || isEditing)
  
  const handleOpenGraphView = React.useCallback(() => {
    setShowGraphView(true)
  }, [])

  const handleCloseGraphView = React.useCallback(() => {
    setShowGraphView(false)
  }, [])

  const handleGraphNodeClick = React.useCallback((noteId: string) => {
    const note = controller.notes.find((n) => n.id === noteId)
    if (note) {
      // Keep graph view open and open the note in the editor
      handleSelectNote(note).catch(() => {
        // Error handling in handleSelectNote
      })
    }
  }, [controller.notes, handleSelectNote])

  const handleOpenSearchPanel = React.useCallback(() => {
    if (isSearchPanelOpen) {
      searchPanelRef.current?.focusInput()
      return
    }
    setIsSearchPanelOpen(true)
  }, [isSearchPanelOpen, setIsSearchPanelOpen])

  const handlePendingChunkFocusApplied = React.useCallback((requestId: string) => {
    setPendingChunkFocus((current) => (current?.requestId === requestId ? null : current))
  }, [])

  const handleOpenSettings = React.useCallback(async () => {
    const notesUiState = await controller.captureSettingsReturnState()

    if (typeof globalThis.location !== "undefined") {
      saveSettingsReturnState({
        returnPath: `${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash}`,
        notesUiState,
      })
    }

    router.push("/settings")
  }, [controller, router])

  const handleBackFromNote = React.useCallback(() => {
    const settingsReturnPath = consumeActiveSettingsNoteReturnPath()
    if (settingsReturnPath) {
      router.push(settingsReturnPath)
      return
    }

    handleSelectNote(null).catch(() => {
      // Fire-and-forget: wrappedHandleSelectNote already owns error handling.
    })
  }, [handleSelectNote, router])

  return (
    <div
      className="flex h-[100dvh] max-h-[100dvh] min-h-[100svh] bg-muted/20 overflow-hidden"
      data-testid="notes-shell"
    >
      <Sidebar
        user={user!}
        filterByTag={filterByTag}
        notesDisplayed={notesDisplayed}
        notesTotal={notesTotal}
        pendingCount={pendingCount}
        failedCount={failedCount}
        isOffline={isOffline}
        selectionMode={selectionMode}
        selectedCount={selectedCount}
        bulkDeleting={bulkDeleting}
        onExitSelectionMode={exitSelectionMode}
        onSelectAll={selectAllVisible}
        onBulkDelete={deleteSelectedNotes}
        onClearTagFilter={handleClearTagFilter}
        onOpenSettings={() => void handleOpenSettings()}
        onCreateNote={handleCreateNote}
        onSignOut={handleSignOut}
        onOpenSearch={handleOpenSearchPanel}
        onOpenGraphView={handleOpenGraphView}
        className={cn((showEditor || isSearchPanelOpen || showGraphView) ? "hidden md:flex" : "w-full md:w-80")}
        data-testid="sidebar-container"
      >
        <ListPane controller={controller} />
      </Sidebar>

      {isSearchPanelOpen && (
        <SearchResultsPanel
          ref={searchPanelRef}
          controller={controller}
          hasGeminiApiKey={hasGeminiApiKey}
          onOpenInContext={handleOpenInContext}
          onClose={() => setIsSearchPanelOpen(false)}
          className={cn(showEditor || showGraphView ? "hidden md:flex" : "w-full min-w-[300px] md:min-w-0")}
        />
      )}

      {showGraphView && (
        <div className={cn(
          "flex-1 flex flex-col h-full overflow-hidden bg-background",
          (showEditor || isSearchPanelOpen) ? "hidden md:flex" : "w-full"
        )}>
          <div className="border-b p-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Notes Graph View</h2>
            <Button variant="ghost" size="sm" onClick={handleCloseGraphView}>
              Close
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <NotesGraphView
              notes={controller.notes}
              onNodeClick={handleGraphNodeClick}
            />
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex-1 flex min-h-0 flex-col h-full overflow-hidden",
          !showEditor ? "hidden md:flex" : "w-full"
        )}
        data-testid="editor-container"
      >
        <EditorPane
          controller={controller}
          onBack={handleBackFromNote}
          noteEditorRef={noteEditorRef}
          wordpressConfigured={wordpressConfigured}
          pendingChunkFocus={pendingChunkFocus}
          onPendingChunkFocusApplied={handlePendingChunkFocusApplied}
        />
      </div>

      <DeleteNoteDialog controller={controller} />
    </div>
  )
}

function ListPane({ controller }: { controller: NoteAppController }) {
  const {
    notes,
    notesQuery,
    selectedNote,
    handleSelectNote,
    selectionMode,
    selectedNoteIds,
    toggleNoteSelection,
    handleTagClick,
  } = controller

  return (
    <NoteList
      notes={notes as NoteRecord[]}
      isLoading={notesQuery.isLoading}
      selectedNoteId={selectedNote?.id}
      selectionMode={selectionMode}
      selectedIds={selectedNoteIds}
      onToggleSelect={(note) => toggleNoteSelection(note.id)}
      onSelectNote={(note) => handleSelectNote(note)}
      onTagClick={handleTagClick}
      onLoadMore={() => notesQuery.fetchNextPage()}
      hasMore={notesQuery.hasNextPage}
      isFetchingNextPage={notesQuery.isFetchingNextPage}
    />
  )
}

function EditorPane({
  controller,
  onBack,
  noteEditorRef,
  wordpressConfigured,
  pendingChunkFocus,
  onPendingChunkFocusApplied,
}: {
  controller: NoteAppController
  onBack: () => void
  noteEditorRef: React.RefObject<NoteEditorHandle | null>
  wordpressConfigured: boolean
  pendingChunkFocus: PendingChunkFocus | null
  onPendingChunkFocusApplied: (requestId: string) => void
}) {
  const {
    selectedNote,
    isEditing,
    saving,
    autoSaving,
    lastSavedAt,
    handleSaveNote,
    handleReadNote,
    handleEditNote,
    handleDeleteNote,
    handleRemoveTagFromNote,
    notes,
  } = controller

  const availableTags = React.useMemo(() => {
    const collected = notes.flatMap((note) => note.tags ?? [])
    return normalizeTagList(collected)
  }, [notes])

  if (!selectedNote && !isEditing) {
    return <EmptyState />
  }

  if (isEditing) {
    return (
      <NoteEditor
        ref={noteEditorRef}
        noteId={selectedNote?.id}
        initialTitle={selectedNote?.title ?? ""}
        initialDescription={selectedNote?.description ?? selectedNote?.content ?? ""}
        initialTags={selectedNote?.tags?.join(", ") ?? ""}
        availableTags={availableTags}
        isSaving={saving}
        onSave={handleSaveNote}
        onRead={handleReadNote}
        onAutoSave={controller.handleAutoSave}
        isAutoSaving={autoSaving}
        lastSavedAt={lastSavedAt}
        wordpressConfigured={wordpressConfigured}
        onDelete={selectedNote ? () => handleDeleteNote(selectedNote) : undefined}
        onBack={onBack}
        pendingChunkFocus={pendingChunkFocus}
        onPendingChunkFocusApplied={onPendingChunkFocusApplied}
      />
    )
  }

  if (selectedNote) {
    return (
      <NoteView
        note={selectedNote}
        onEdit={() => handleEditNote(selectedNote)}
        onDelete={() => handleDeleteNote(selectedNote)}
        onTagClick={controller.handleTagClick}
        onRemoveTag={(tag) => handleRemoveTagFromNote(selectedNote.id, tag)}
        onBack={onBack}
        wordpressConfigured={wordpressConfigured}
      />
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function DeleteNoteDialog({ controller }: { controller: NoteAppController }) {
  const {
    deleteDialogOpen,
    setDeleteDialogOpen,
    confirmDeleteNote,
    noteToDelete,
  } = controller

  return (
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Note</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{noteToDelete?.title}&quot;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDeleteNote} className="bg-red-600 hover:bg-red-700">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
