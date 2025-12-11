import { useState, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'

import { useSupabase } from '@/lib/providers/SupabaseProvider'
import { useNotesQuery, useFlattenedNotes, useSearchNotes } from './useNotesQuery'
import { useCreateNote, useUpdateNote, useDeleteNote, useRemoveTag } from './useNotesMutations'
import { useInfiniteScroll } from './useInfiniteScroll'
import type { NoteViewModel, SearchResult } from '@/types/domain'
import { AuthService } from '@core/services/auth'
import { webStorageAdapter } from '@ui/web/adapters/storage'
import { webOAuthRedirectUri } from '@ui/web/config'
import { featureFlags } from '@ui/web/featureFlags'

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
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false)
  const [ftsOffset, setFtsOffset] = useState(0)
  const [ftsAccumulatedResults, setFtsAccumulatedResults] = useState<SearchResult[]>([])
  const ftsLimit = 20

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
    selectedTag: filterByTag,
    offset: ftsOffset,
    limit: ftsLimit
  })

  const ftsData = ftsSearchResult.data
  const ftsResultsRaw: SearchResult[] = ftsData?.results ?? []
  const filteredFtsResults: SearchResult[] = filterByTag
    ? ftsResultsRaw.filter(note => note.tags?.includes(filterByTag))
    : ftsResultsRaw

  // Accumulate FTS pages for "load more"
  useEffect(() => {
    // reset on query/tag change
    setFtsOffset(0)
    setFtsAccumulatedResults([])
  }, [ftsSearchQuery, filterByTag])

  useEffect(() => {
    if (!ftsSearchResult.data) return
    setFtsAccumulatedResults((prev) => {
      if (ftsOffset === 0) {
        if (prev.length === filteredFtsResults.length) {
          const prevIds = new Set(prev.map((n) => n.id))
          const same = filteredFtsResults.every((n) => prevIds.has(n.id))
          if (same) return prev
        }
        return filteredFtsResults
      }
      const next = [...prev]
      const seen = new Set(prev.map((item) => item.id))
      filteredFtsResults.forEach((item) => {
        if (!seen.has(item.id)) {
          next.push(item)
        }
      })
      return next
    })
  }, [ftsSearchResult.data, ftsOffset, filteredFtsResults, ftsSearchQuery, filterByTag])

  const ftsTotal = ftsData?.total ?? ftsAccumulatedResults.length
  const ftsHasMore = !!ftsData && (ftsAccumulatedResults.length < ftsTotal || ftsData.results.length === ftsLimit)
  const ftsLoadingMore = ftsSearchResult.isFetching && ftsOffset > 0

  // Total count of notes (from first page, falls back to loaded count)
  const totalNotes = useMemo(() => {
    const pages = notesQuery.data?.pages
    if (pages?.length) {
      const total = pages[0]?.totalCount
      if (typeof total === 'number') return total
    }
    return notes.length
  }, [notesQuery.data?.pages, notes.length]) ?? 0

  const showFTSResults = ftsSearchQuery.length >= 3 &&
    !!ftsData &&
    !ftsData.error

  const aggregatedFtsData = showFTSResults ? {
    ...ftsData,
    results: ftsAccumulatedResults,
    total: ftsTotal
  } : undefined

  const notesDisplayed = showFTSResults && aggregatedFtsData ? aggregatedFtsData.results.length : notes.length
  const baseTotal = showFTSResults && aggregatedFtsData ? aggregatedFtsData.total : totalNotes
  const notesTotal = baseTotal ?? notesDisplayed
  const selectedCount = selectedNoteIds.size

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
    if (!featureFlags.testAuth) {
      toast.error('Test authentication is disabled in this environment')
      return
    }

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
    if (!featureFlags.testAuth) {
      toast.error('Test authentication is disabled in this environment')
      return
    }

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

  const handleDeleteAccount = async () => {
    if (!user) return
    setDeleteAccountLoading(true)
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("Unable to get session token for deletion")
      }
      const token = sessionData.session.access_token
      const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!functionsUrl) {
        throw new Error("Functions URL is not configured (set NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL)")
      }

      const response = await fetch(`${functionsUrl}/functions/v1/delete-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deleteNotes: true }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = payload?.error || `Delete function error (${response.status})`
        throw new Error(message)
      }

      toast.success("Account deleted")
      await handleSignOut()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete account"
      toast.error(message)
    } finally {
      setDeleteAccountLoading(false)
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

    const enterSelectionMode = () => {
      setSelectionMode(true)
      setSelectedNoteIds(new Set())
      setIsEditing(false)
      setSelectedNote(null)
    }

    const exitSelectionMode = () => {
      setSelectionMode(false)
      setSelectedNoteIds(new Set())
    }

    const toggleNoteSelection = (noteId: string) => {
      setSelectionMode(true)
      setSelectedNoteIds(prev => {
        const next = new Set(prev)
        if (next.has(noteId)) {
          next.delete(noteId)
        } else {
          next.add(noteId)
        }
        return next
      })
    }

    const selectAllVisible = () => {
      const source = showFTSResults && aggregatedFtsData
        ? aggregatedFtsData.results
        : notes
      setSelectionMode(true)
      setSelectedNoteIds(new Set(source.map((n) => n.id)))
    }

    const clearSelection = () => {
      setSelectedNoteIds(new Set())
    }

    const loadMoreFts = () => {
      if (ftsLoadingMore || !ftsHasMore) return
      setFtsOffset((prev) => prev + ftsLimit)
    }

    const deleteSelectedNotes = async () => {
      if (!selectedNoteIds.size) return
      setBulkDeleting(true)
      try {
        const ids = Array.from(selectedNoteIds)
        const results = await Promise.allSettled(ids.map(id => deleteNoteMutation.mutateAsync(id)))
        const failed = results.filter(r => r.status === 'rejected').length
        if (failed > 0) {
          toast.error(`Failed to delete ${failed} notes`)
        } else {
          toast.success(`Deleted ${ids.length} notes`)
        }
        exitSelectionMode()
        await queryClient.invalidateQueries({ queryKey: ['notes'] })
        setSelectedNote(null)
      } catch (error) {
        console.error('Bulk delete error:', error)
        toast.error('Failed to delete selected notes')
      } finally {
        setBulkDeleting(false)
      }
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
      selectionMode,
      selectedNoteIds,
      selectedCount,
      bulkDeleting,
      deleteAccountLoading,

      // Data
      notes,
      notesQuery,
      ftsSearchResult,
    ftsData: aggregatedFtsData,
    ftsResults: ftsAccumulatedResults,
    ftsHasMore,
    ftsLoadingMore,
    showFTSResults,
    observerTarget,
      totalNotes: notesTotal,
      notesDisplayed,
      notesTotal,

    // Handlers
    handleSearch,
    handleTagClick,
    handleClearTagFilter,
    handleSignInWithGoogle,
    handleTestLogin,
      handleSkipAuth,
      handleSignOut,
      handleDeleteAccount,
      handleCreateNote,
      handleEditNote,
      handleSaveNote,
    handleDeleteNote,
    confirmDeleteNote,
    handleRemoveTagFromNote,
    handleSelectNote,
      handleSearchResultClick,
      enterSelectionMode,
      exitSelectionMode,
      toggleNoteSelection,
      selectAllVisible,
      clearSelection,
      loadMoreFts,
      deleteSelectedNotes,

      // Helpers
      invalidateNotes: () => queryClient.invalidateQueries({ queryKey: ['notes'] })
    }
  }

export type NoteAppController = ReturnType<typeof useNoteAppController>
