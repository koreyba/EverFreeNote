import { useState, useCallback } from 'react'
import type { NoteViewModel, SearchResult } from '@core/types/domain'
import { clearSelection as clearSelectionSet, selectAll as selectAllSet, toggleSelection } from '@core/services/selection'

export function useNoteSelection() {
    const [selectedNote, setSelectedNote] = useState<NoteViewModel | null>(null)
    const [isEditing, setIsEditing] = useState(false)

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [noteToDelete, setNoteToDelete] = useState<NoteViewModel | null>(null)

    const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set())
    const [selectionMode, setSelectionMode] = useState(false)
    const [bulkDeleting, setBulkDeleting] = useState(false)

    const handleSelectNote = useCallback((note: NoteViewModel | null) => {
        setSelectedNote(note)
        setIsEditing(false)
    }, [])

    const handleSearchResultClick = useCallback((note: SearchResult) => {
        // Don't reset search - keep search results visible when viewing a note
        setSelectedNote(note)
        setIsEditing(false)
    }, [])

    const handleEditNote = useCallback((note: NoteViewModel) => {
        setSelectedNote(note)
        setIsEditing(true)
    }, [])

    const handleCreateNote = useCallback(() => {
        setSelectedNote(null)
        setIsEditing(true)
    }, [])

    const handleDeleteNote = (note: NoteViewModel) => {
        setNoteToDelete(note)
        setDeleteDialogOpen(true)
    }

    const enterSelectionMode = useCallback(() => {
        setSelectionMode(true)
        setSelectedNoteIds(new Set())
        setIsEditing(false)
        setSelectedNote(null)
    }, [])

    const exitSelectionMode = useCallback(() => {
        setSelectionMode(false)
        setSelectedNoteIds(new Set())
    }, [])

    const toggleNoteSelection = useCallback((noteId: string) => {
        setSelectionMode(true)
        setSelectedNoteIds(prev => toggleSelection(prev, noteId))
    }, [])

    const selectAllVisible = useCallback((source: (NoteViewModel | SearchResult)[]) => {
        setSelectionMode(true)
        setSelectedNoteIds(selectAllSet(source.map((n) => n.id)))
    }, [])

    const clearSelection = useCallback(() => {
        setSelectedNoteIds(clearSelectionSet())
    }, [])

    return {
        selectedNote,
        setSelectedNote,
        isEditing,
        setIsEditing,
        deleteDialogOpen,
        setDeleteDialogOpen,
        noteToDelete,
        setNoteToDelete,
        selectedNoteIds,
        setSelectedNoteIds,
        selectionMode,
        setSelectionMode,
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
        selectAllVisible,
        clearSelection,
    }
}
