"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
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

import { cn } from "@ui/web/lib/utils"
import { Sidebar } from "@/components/features/notes/Sidebar"
import { NoteList } from "@/components/features/notes/NoteList"
import { NoteEditor, type NoteEditorHandle } from "@/components/features/notes/NoteEditor"
import { NoteView } from "@/components/features/notes/NoteView"
import { EmptyState } from "@/components/features/notes/EmptyState"
import type { Note } from "@core/types/domain"
import type { NoteAppController } from "@ui/web/hooks/useNoteAppController"

type NoteRecord = Note & {
  content?: string | null
  headline?: string | null
  rank?: number | null
}

type NotesShellProps = {
  controller: NoteAppController
}

export function NotesShell({ controller }: NotesShellProps) {
  const noteEditorRef = React.useRef<NoteEditorHandle | null>(null)

  const {
    user,
    notesDisplayed,
    notesTotal,
    selectionMode,
    selectedCount,
    bulkDeleting,
    enterSelectionMode,
    exitSelectionMode,
    selectAllVisible,
    clearSelection,
    deleteSelectedNotes,
    filterByTag,
    searchQuery,
    handleSearch,
    handleClearTagFilter,
    handleCreateNote,
    handleSignOut,
    handleDeleteAccount,
    deleteAccountLoading,
    invalidateNotes,
    pendingCount,
    failedCount,
    isOffline,
    selectedNote,
    isEditing,
    handleSelectNote,
  } = controller

  const showEditor = !!(selectedNote || isEditing)

  return (
    <div className="flex h-screen max-h-screen bg-muted/20 overflow-hidden">
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
        onEnterSelectionMode={enterSelectionMode}
        onExitSelectionMode={exitSelectionMode}
        onSelectAll={selectAllVisible}
        onClearSelection={clearSelection}
        onBulkDelete={deleteSelectedNotes}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onClearTagFilter={handleClearTagFilter}
        onCreateNote={handleCreateNote}
        onSignOut={handleSignOut}
        onDeleteAccount={handleDeleteAccount}
        deleteAccountLoading={deleteAccountLoading}
        onImportComplete={invalidateNotes}
        className={cn(showEditor ? "hidden md:flex" : "w-full md:w-80")}
        data-testid="sidebar-container"
      >
        <ListPane controller={controller} noteEditorRef={noteEditorRef} />
      </Sidebar>

      <div
        className={cn(
          "flex-1 flex flex-col h-full overflow-y-auto",
          !showEditor ? "hidden md:flex" : "w-full"
        )}
        data-testid="editor-container"
      >
        <EditorPane
          controller={controller}
          onBack={() => handleSelectNote(null)}
          noteEditorRef={noteEditorRef}
        />
      </div>

      <DeleteNoteDialog controller={controller} />
    </div>
  )
}

function ListPane({ controller, noteEditorRef }: { controller: NoteAppController; noteEditorRef: React.RefObject<NoteEditorHandle | null> }) {
  const {
    notes,
    notesQuery,
    selectedNote,
    searchQuery,
    ftsSearchResult,
    showFTSResults,
    ftsData,
    ftsHasMore,
    ftsLoadingMore,
    handleSelectNote,
    selectionMode,
    selectedNoteIds,
    toggleNoteSelection,
    handleTagClick,
    handleSearchResultClick,
  } = controller

  return (
    <NoteList
      notes={notes as NoteRecord[]}
      isLoading={notesQuery.isLoading}
      selectedNoteId={selectedNote?.id}
      selectionMode={selectionMode}
      selectedIds={selectedNoteIds}
      onToggleSelect={(note) => toggleNoteSelection(note.id)}
      onSelectNote={(note) => handleSelectNote(note, noteEditorRef)}
      onTagClick={handleTagClick}
      onLoadMore={() => notesQuery.fetchNextPage()}
      hasMore={notesQuery.hasNextPage}
      isFetchingNextPage={notesQuery.isFetchingNextPage}
      ftsQuery={searchQuery}
      ftsLoading={ftsSearchResult.isLoading}
      showFTSResults={showFTSResults}
      ftsData={
        ftsData
          ? {
            total: ftsData.total,
            executionTime: ftsData.executionTime,
            results: ftsData.results,
          }
          : undefined
      }
      ftsHasMore={ftsHasMore}
      ftsLoadingMore={ftsLoadingMore}
      onLoadMoreFts={controller.loadMoreFts}
      onSearchResultClick={handleSearchResultClick}
    />
  )
}

function EditorPane({ controller, onBack, noteEditorRef }: { controller: NoteAppController; onBack: () => void; noteEditorRef: React.RefObject<NoteEditorHandle | null> }) {
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
  } = controller

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
        isSaving={saving}
        onSave={handleSaveNote}
        onRead={handleReadNote}
        onAutoSave={controller.handleAutoSave}
        isAutoSaving={autoSaving}
        lastSavedAt={lastSavedAt}
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
