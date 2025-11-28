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

import { Sidebar } from "@/components/features/notes/Sidebar"
import { NoteList } from "@/components/features/notes/NoteList"
import { NoteEditor } from "@/components/features/notes/NoteEditor"
import { NoteView } from "@/components/features/notes/NoteView"
import { EmptyState } from "@/components/features/notes/EmptyState"
import type { Note } from "@/types/domain"
import type { NoteAppController } from "@/hooks/useNoteAppController"

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
    filterByTag,
    searchQuery,
    handleSearch,
    handleClearTagFilter,
    handleCreateNote,
    handleSignOut,
    invalidateNotes,
  } = controller

  return (
    <div className="flex h-screen bg-muted/20">
      <Sidebar
        user={user!}
        filterByTag={filterByTag}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onClearTagFilter={handleClearTagFilter}
        onCreateNote={handleCreateNote}
        onSignOut={handleSignOut}
        onImportComplete={invalidateNotes}
      >
        <ListPane controller={controller} />
      </Sidebar>

      <EditorPane controller={controller} />

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
    observerTarget,
    handleSelectNote,
    handleTagClick,
    handleSearchResultClick,
  } = controller

  return (
    <>
      <NoteList
        notes={notes as NoteRecord[]}
        isLoading={notesQuery.isLoading}
        selectedNoteId={selectedNote?.id}
        onSelectNote={handleSelectNote}
        onTagClick={handleTagClick}
        onLoadMore={() => notesQuery.fetchNextPage()}
        hasMore={notesQuery.hasNextPage}
        isFetchingNextPage={notesQuery.isFetchingNextPage}
        ftsQuery={searchQuery}
        ftsLoading={ftsSearchResult.isLoading}
        showFTSResults={showFTSResults}
        ftsData={ftsData}
        onSearchResultClick={handleSearchResultClick}
      />

      {/* Infinite Scroll Sentinel */}
      {notesQuery.hasNextPage && !showFTSResults && (
        <div ref={observerTarget} className="h-1" />
      )}
    </>
  )
}

function EditorPane({ controller }: { controller: NoteAppController }) {
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
        isNew={!selectedNote}
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
