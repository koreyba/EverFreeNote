"use client"

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
import { NoteEditor } from "@/components/features/notes/NoteEditor"
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
        <ListPane controller={controller} />
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
    searchQuery,
    ftsSearchResult,
    showFTSResults,
    ftsData,
    ftsHasMore,
    ftsLoadingMore,
    observerTarget,
    ftsObserverTarget,
    handleSelectNote,
    selectionMode,
    selectedNoteIds,
    toggleNoteSelection,
    handleTagClick,
    handleSearchResultClick,
  } = controller

  return (
    <>
      <NoteList
        notes={notes as NoteRecord[]}
        isLoading={notesQuery.isLoading}
        selectedNoteId={selectedNote?.id}
        selectionMode={selectionMode}
        selectedIds={selectedNoteIds}
        onToggleSelect={(note) => toggleNoteSelection(note.id)}
        onSelectNote={handleSelectNote}
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

      {/* Infinite Scroll Sentinel - unified for regular and FTS results */}
      {notesQuery.hasNextPage && !showFTSResults && (
        <div ref={observerTarget} className="h-1" />
      )}
      {ftsHasMore && showFTSResults && (
        <div ref={ftsObserverTarget} className="h-1" />
      )}
    </>
  )
}

function EditorPane({ controller, onBack }: { controller: NoteAppController, onBack: () => void }) {
  const {
    selectedNote,
    isEditing,
    editForm,
    setEditForm,
    saving,
    handleSaveNote,
    handleSelectNote,
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
        title={editForm.title}
        description={editForm.description}
        tags={editForm.tags}
        isSaving={saving}
        onTitleChange={(val) => setEditForm((prev) => ({ ...prev, title: val }))}
        onDescriptionChange={(val) => setEditForm((prev) => ({ ...prev, description: val }))}
        onTagsChange={(val) => setEditForm((prev) => ({ ...prev, tags: val }))}
        onSave={handleSaveNote}
        onCancel={() => {
          if (!selectedNote) {
            handleSelectNote(null)
          } else {
            handleSelectNote(selectedNote)
          }
        }}
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
