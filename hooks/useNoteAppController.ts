import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'

import { useSupabase } from '@/lib/providers/SupabaseProvider'
import { useNotesQuery, useFlattenedNotes, useSearchNotes } from '@/hooks/useNotesQuery'
import { useCreateNote, useUpdateNote, useDeleteNote, useRemoveTag } from '@/hooks/useNotesMutations'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import type { NoteViewModel, SearchResult } from '@/types/domain'
import { AuthService } from '@core/services/auth'
import { webStorageAdapter } from '@ui/web/adapters/storage'
import { webOAuthRedirectUri } from '@ui/web/config'

export type EditFormState = {
  title: string
  description: string
  tags: string
}

export function useNoteAppController() {
  // -- State --
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false) // Local loading state for auth operations
  const [selectedNote, setSelectedNote] = useState<NoteViewModel | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [ftsSearchQuery, setFtsSearchQuery] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditFormState>({
    title: "",
    description: "",
    tags: "",
  })
  const [saving, setSaving] = useState(false)
  const [filterByTag, setFilterByTag] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<NoteViewModel | null>(null)

  // -- Dependencies --
  const { supabase, loading: providerLoading } = useSupabase()
  const queryClient = useQueryClient()
  const authService = new AuthService(supabase)
  
  // Combine provider loading with local auth loading
  const combinedLoading = loading || providerLoading || authLoading

  // -- Queries --
  const notesQuery = useNotesQuery({
    userId: user?.id,
    searchQuery,
    selectedTag: filterByTag,
    enabled: !!user,
  })

  const notes: NoteViewModel[] = useFlattenedNotes(notesQuery)

  const ftsSearchResult = useSearchNotes(ftsSearchQuery, user?.id, {
    enabled: !!user && ftsSearchQuery.length >= 3,
    selectedTag: filterByTag
  })

  const ftsData = ftsSearchResult.data
  const ftsResultsRaw: SearchResult[] = ftsData?.results ?? []
  const filteredFtsResults: SearchResult[] = filterByTag
    ? ftsResultsRaw.filter(note => note.tags?.includes(filterByTag))
    : ftsResultsRaw

  // Create filtered ftsData object
  const filteredFtsData = ftsData ? {
    ...ftsData,
    results: filteredFtsResults,
    total: filteredFtsResults.length
  } : undefined

  const showFTSResults = ftsSearchQuery.length >= 3 &&
    !!filteredFtsData &&
    filteredFtsData.method === 'fts' &&
    !filteredFtsData.error &&
    filteredFtsResults.length > 0

  // -- Infinite Scroll --
  const observerTarget = useInfiniteScroll(
    notesQuery.fetchNextPage,
    notesQuery.hasNextPage,
    notesQuery.isFetchingNextPage,
    { threshold: 0.8, rootMargin: '200px' }
  )

  // -- Mutations --
  const createNoteMutation = useCreateNote()
  const updateNoteMutation = useUpdateNote()
  const deleteNoteMutation = useDeleteNote()
  const removeTagMutation = useRemoveTag()

  // -- Auth Effects --
  useEffect(() => {
    const checkAuth = async () => {
      await webStorageAdapter.removeItem('testUser')
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user || null)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  // -- Handlers --

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setFtsSearchQuery(query)
  }

  const handleTagClick = (tag: string) => {
    setFilterByTag(tag)
    // Don't reset search - preserve search state when clicking tags
    setSelectedNote(null)
    setIsEditing(false)
  }

  const handleClearTagFilter = () => {
    setFilterByTag(null)
  }

  const handleSignInWithGoogle = async () => {
    try {
      const { error } = await authService.signInWithGoogle(webOAuthRedirectUri)
      if (error) console.error('Error signing in:', error)
    } catch (error) {
      console.error('Error signing in:', error)
    }
  }

  const handleTestLogin = async () => {
    try {
      setAuthLoading(true) // Show loading indicator immediately
      const { data, error } = await authService.signInWithPassword(
        'test@example.com',
        'testpassword123'
      )

      if (error) {
        toast.error('Failed to login as test user: ' + error.message)
        setAuthLoading(false)
        return
      }

      if (data?.user) {
        setUser(data.user)
        toast.success('Logged in as test user!')
        // loading from SupabaseProvider will be updated via onAuthStateChange
      }
    } catch {
      toast.error('Failed to login as test user')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSkipAuth = async () => {
    try {
      setAuthLoading(true) // Show loading indicator immediately
      const { data, error } = await authService.signInWithPassword(
        'skip-auth@example.com',
        'testpassword123'
      )

      if (error) {
        toast.error('Failed to login as skip-auth user: ' + error.message)
        setAuthLoading(false)
        return
      }

      if (data?.user) {
        setUser(data.user)
        toast.success('Logged in as skip-auth user!')
        // loading from SupabaseProvider will be updated via onAuthStateChange
      }
    } catch {
      toast.error('Failed to login as skip-auth user')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await authService.signOut()
      await webStorageAdapter.removeItem('testUser')
      setUser(null)
      queryClient.removeQueries({ queryKey: ['notes'] })
      setSelectedNote(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleCreateNote = () => {
    setSelectedNote(null)
    setIsEditing(true)
    setEditForm({ title: '', description: '', tags: '' })
  }

  const handleEditNote = (note: NoteViewModel) => {
    setSelectedNote(note)
    setIsEditing(true)
    setEditForm({
      title: note.title,
      description: note.description ?? note.content ?? '',
      tags: note.tags?.join(', ') ?? '',
    })
  }

  const handleSaveNote = async () => {
    if (!user) return

    setSaving(true)
    try {
      let savedNote: NoteViewModel | null = null
      const tags = editForm.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      const noteData = {
        title: editForm.title.trim() || 'Untitled',
        description: editForm.description.trim(),
        tags,
      }

      if (selectedNote) {
        const updated = await updateNoteMutation.mutateAsync({
          id: selectedNote.id,
          ...noteData,
        })
        savedNote = { ...selectedNote, ...updated }
      } else {
        const created = await createNoteMutation.mutateAsync({
          ...noteData,
          userId: user.id,
        })
        savedNote = created as NoteViewModel
      }

      setIsEditing(false)
      if (savedNote) {
        setSelectedNote(savedNote)
      }
      setEditForm({ title: '', description: '', tags: '' })
    } catch (error) {
      console.error('Error saving note:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNote = (note: NoteViewModel) => {
    setNoteToDelete(note)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return

    try {
      await deleteNoteMutation.mutateAsync(noteToDelete.id)

      if (selectedNote?.id === noteToDelete.id) {
        setSelectedNote(null)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error deleting note:', error)
    } finally {
      setDeleteDialogOpen(false)
      setNoteToDelete(null)
    }
  }

  const handleRemoveTagFromNote = async (noteId: string, tagToRemove: string) => {
    try {
      const noteToUpdate = notes.find(note => note.id === noteId)
      if (!noteToUpdate || !noteToUpdate.tags) return

      const updatedTags = noteToUpdate.tags.filter(tag => tag !== tagToRemove)
      await removeTagMutation.mutateAsync({ noteId, updatedTags })

      if (selectedNote?.id === noteId) {
        setSelectedNote({
          ...selectedNote,
          tags: updatedTags,
          updated_at: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error removing tag:', error)
    }
  }

  const handleSelectNote = (note: NoteViewModel | null) => {
    setSelectedNote(note)
    setIsEditing(false)
  }

  const handleSearchResultClick = (note: SearchResult) => {
    // Don't reset search - keep search results visible when viewing a note
    setSelectedNote(note)
    setIsEditing(false)
  }

  return {
    // State
    user,
    loading: combinedLoading,
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
    ftsData: filteredFtsData,
    ftsResults: filteredFtsResults,
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

    // Helpers
    invalidateNotes: () => queryClient.invalidateQueries({ queryKey: ['notes'] })
  }
}

export type NoteAppController = ReturnType<typeof useNoteAppController>
