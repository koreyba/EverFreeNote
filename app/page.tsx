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

import { AuthShell } from "@/components/features/auth/AuthShell"
import { Sidebar } from "@/components/features/notes/Sidebar"
import { NoteList } from "@/components/features/notes/NoteList"
import { NoteEditor } from "@/components/features/notes/NoteEditor"
import { NoteView } from "@/components/features/notes/NoteView"
import { EmptyState } from "@/components/features/notes/EmptyState"

import { useNoteAppController } from "@/hooks/useNoteAppController"

export default function App() {
  const {
    // State
    user,
    loading,
    selectedNote,
    searchQuery,
    isEditing,
    editForm,
    setEditForm,
    saving,
    filterByTag,
    deleteDialogOpen,
    setDeleteDialogOpen,
    noteToDelete,
    
    // Data
    notes,
    notesQuery,
    ftsSearchResult,
    ftsData,
    showFTSResults,
    observerTarget,

    // Handlers
    handleSearch,
    handleTagClick,
    handleClearTagFilter,
    handleSignInWithGoogle,
    handleTestLogin,
    handleSkipAuth,
    handleSignOut,
    handleCreateNote,
    handleEditNote,
    handleSaveNote,
    handleDeleteNote,
    confirmDeleteNote,
    handleRemoveTagFromNote,
    handleSelectNote,
    handleSearchResultClick,
    invalidateNotes
  } = useNoteAppController()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-muted/30 to-accent/20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <AuthShell
        onTestLogin={handleTestLogin}
        onSkipAuth={handleSkipAuth}
        onGoogleAuth={handleSignInWithGoogle}
      />
    )
  }

  return (
    <div className="flex h-screen bg-muted/20">
      <Sidebar
        user={user}
        filterByTag={filterByTag}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onClearTagFilter={handleClearTagFilter}
        onCreateNote={handleCreateNote}
        onSignOut={handleSignOut}
        onImportComplete={invalidateNotes}
      >
        <NoteList
          notes={notes}
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
      </Sidebar>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {!selectedNote && !isEditing ? (
          <EmptyState />
        ) : isEditing ? (
          <NoteEditor
            title={editForm.title}
            description={editForm.description}
            tags={editForm.tags}
            isSaving={saving}
            isNew={!selectedNote}
            onTitleChange={(val) => setEditForm(prev => ({ ...prev, title: val }))}
            onDescriptionChange={(val) => setEditForm(prev => ({ ...prev, description: val }))}
            onTagsChange={(val) => setEditForm(prev => ({ ...prev, tags: val }))}
            onSave={handleSaveNote}
            onCancel={() => {
              // If cancelling a new note, go back to empty state
              // If cancelling edit, go back to view mode
              if (!selectedNote) {
                handleSelectNote(null)
              } else {
                // If we were editing an existing note, just stop editing
                // The controller doesn't expose setIsEditing directly, but handleSelectNote(selectedNote) 
                // will set isEditing to false as a side effect
                handleSelectNote(selectedNote)
              }
            }}
          />
        ) : selectedNote ? (
          <NoteView
            note={selectedNote}
            onEdit={() => handleEditNote(selectedNote)}
            onDelete={() => handleDeleteNote(selectedNote)}
            onTagClick={handleTagClick}
            onRemoveTag={(tag) => handleRemoveTagFromNote(selectedNote.id, tag)}
          />
        ) : null}
      </div>

      {/* Delete Confirmation Dialog */}
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
    </div>
  )
}
