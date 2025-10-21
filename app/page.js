'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { useNotesQuery, useFlattenedNotes } from '@/hooks/useNotesQuery'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useCreateNote, useUpdateNote, useDeleteNote, useRemoveTag } from '@/hooks/useNotesMutations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import RichTextEditor from '@/components/RichTextEditor'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Search, Plus, Edit2, Trash2, Tag, LogOut, Loader2, BookOpen } from 'lucide-react'
import InteractiveTag from '@/components/InteractiveTag'
import AuthForm from '@/components/AuthForm'
import { ThemeToggle } from '@/components/theme-toggle'
import { ImportButton } from '@/components/ImportButton'
import { NoteListSkeleton } from '@/components/NoteListSkeleton'
import { VirtualNoteList } from '@/components/VirtualNoteList'
import { useSearchNotes } from '@/hooks/useNotesQuery'
import { toast } from 'sonner'
import DOMPurify from 'isomorphic-dompurify'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedNote, setSelectedNote] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [ftsSearchQuery, setFtsSearchQuery] = useState('') // New FTS search
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', description: '', tags: '' })
  const [saving, setSaving] = useState(false)
  const [filterByTag, setFilterByTag] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState(null)
  
  const supabase = createClient()
  const queryClient = useQueryClient()
  
  // Use React Query for notes fetching (only when user is authenticated)
  const notesQuery = useNotesQuery({
    userId: user?.id,
    searchQuery,
    selectedTag: filterByTag,
    enabled: !!user, // Only fetch when user is logged in
  })
  
  // Get flattened notes array from paginated data
  const notes = user ? useFlattenedNotes(notesQuery) : []

  // FTS search hook (only when user is authenticated and has search query)
  const ftsSearchResult = useSearchNotes(ftsSearchQuery, user?.id, {
    enabled: !!user && ftsSearchQuery.length >= 3
  })

  // Auto-load more notes on scroll (with 200px prefetch margin)
  const observerTarget = useInfiniteScroll(
    notesQuery.fetchNextPage,
    notesQuery.hasNextPage,
    notesQuery.isFetchingNextPage,
    { threshold: 0.8, rootMargin: '200px' }
  )
  
  // Optimistic mutations
  const createNoteMutation = useCreateNote()
  const updateNoteMutation = useUpdateNote()
  const deleteNoteMutation = useDeleteNote()
  const removeTagMutation = useRemoveTag()

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      // Clean up legacy test user storage
      localStorage.removeItem('testUser')

      // Check for real Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleSearch = (query) => {
    setSearchQuery(query)
    setFtsSearchQuery(query) // Also update FTS search
    // React Query will automatically refetch with new searchQuery
  }

  const handleTagClick = (tag) => {
    setFilterByTag(tag)
    setSearchQuery('')
    setFtsSearchQuery('') // Also clear FTS search
    // React Query will automatically refetch with new filterByTag
    setSelectedNote(null)
    setIsEditing(false)
  }

  const handleClearTagFilter = () => {
    setFilterByTag(null)
    setSearchQuery('')
    setFtsSearchQuery('') // Also clear FTS search
    // React Query will automatically refetch
  }

  const handleSignInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error('Error signing in:', error)
      }
    } catch (error) {
      console.error('Error signing in:', error)
    }
  }

  const handleTestLogin = async () => {
    try {
      setLoading(true)
      
      // Sign in with real Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'testpassword123'
      })

      if (error) {
        console.error('Test login error:', error)
        toast.error('Failed to login as test user: ' + error.message)
        setLoading(false)
        return
      }

      if (data?.user) {
        setUser(data.user)
        toast.success('Logged in as test user!')
      }
    } catch (error) {
      console.error('Test login exception:', error)
      toast.error('Failed to login as test user')
    } finally {
      setLoading(false)
    }
  }

  const handleSkipAuth = async () => {
    try {
      setLoading(true)
      
      // Sign in with real Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'skip-auth@example.com',
        password: 'testpassword123'
      })

      if (error) {
        console.error('Skip auth login error:', error)
        toast.error('Failed to login as skip-auth user: ' + error.message)
        setLoading(false)
        return
      }

      if (data?.user) {
        setUser(data.user)
        toast.success('Logged in as skip-auth user!')
      }
    } catch (error) {
      console.error('Skip auth login exception:', error)
      toast.error('Failed to login as skip-auth user')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      // Always use Supabase signOut for all users
      await supabase.auth.signOut()
      
      // Clean up local storage (legacy)
      localStorage.removeItem('testUser')
      
      setUser(null)
      // Clear React Query cache for notes
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

  const handleEditNote = (note) => {
    setSelectedNote(note)
    setIsEditing(true)
    setEditForm({
      title: note.title,
      description: note.description,
      tags: note.tags?.join(', ') || '',
    })
  }

  const handleSaveNote = async () => {
    setSaving(true)
    try {
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
        // Update existing note with optimistic update
        await updateNoteMutation.mutateAsync({
          id: selectedNote.id,
          ...noteData,
        })
      } else {
        // Create new note with optimistic update
        await createNoteMutation.mutateAsync({
          ...noteData,
          userId: user.id,
        })
      }

      setIsEditing(false)
      setSelectedNote(null)
      setEditForm({ title: '', description: '', tags: '' })
    } catch (error) {
      console.error('Error saving note:', error)
      // Error toast handled by mutation hooks
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNote = (note) => {
    setNoteToDelete(note)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return

    try {
      // Delete with optimistic update
      await deleteNoteMutation.mutateAsync(noteToDelete.id)
      
      if (selectedNote?.id === noteToDelete.id) {
        setSelectedNote(null)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      // Error toast handled by mutation hook
    } finally {
      setDeleteDialogOpen(false)
      setNoteToDelete(null)
    }
  }

  const handleRemoveTagFromNote = async (noteId, tagToRemove) => {
    try {
      // Find the note to get current tags
      const noteToUpdate = notes.find(note => note.id === noteId)
      if (!noteToUpdate || !noteToUpdate.tags) return

      // Remove the tag from the tags array
      const updatedTags = noteToUpdate.tags.filter(tag => tag !== tagToRemove)

      // Update with optimistic update
      await removeTagMutation.mutateAsync({ noteId, updatedTags })

      // Update selectedNote if it's the current note
      if (selectedNote?.id === noteId) {
        setSelectedNote({
          ...selectedNote,
          tags: updatedTags,
          updated_at: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error removing tag:', error)
      // Error toast handled by mutation hook
    }
  }

  const handleSelectNote = (note) => {
    setSelectedNote(note)
    setIsEditing(false)
  }

  const handleSearchResultClick = (note) => {
    // Clear search when selecting a result
    setSearchQuery('')
    setFtsSearchQuery('')
    setSelectedNote(note)
    setIsEditing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-muted/30 to-accent/20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-muted/30 to-accent/20">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-accent rounded-full">
                <BookOpen className="w-10 h-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">EverFreeNote</CardTitle>
            <CardDescription className="text-base">
              Your personal note-taking companion. Secure, simple, and synced.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AuthForm
              onTestLogin={handleTestLogin}
              onSkipAuth={handleSkipAuth}
              onGoogleAuth={handleSignInWithGoogle}
            />

            <p className="text-xs text-center text-gray-500">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-muted/20">
      {/* Sidebar */}
      <div className="w-80 bg-card border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">EverFreeNote</h1>
            </div>
            <ThemeToggle />
          </div>

          {/* Tag Filter Badge */}
          {filterByTag && (
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline" className="bg-accent text-accent-foreground">
                <Tag className="w-3 h-3 mr-1" />
                {filterByTag}
              </Badge>
              <Button
                onClick={handleClearTagFilter}
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
              >
                Clear filter
              </Button>
            </div>
          )}
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder={filterByTag ? `Search in "${filterByTag}" notes...` : "Search notes..."}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* New Note Button */}
        <div className="p-4 border-b space-y-2">
          <Button
            onClick={handleCreateNote}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Note
          </Button>
          <ImportButton onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['notes'] })} />
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto" id="notes-list-container">
          {/* Show FTS search results if available */}
          {ftsSearchQuery.length >= 3 && ftsSearchResult.data ? (
            <div className="p-4">
              {/* FTS Search Results Header */}
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <div>
                  Найдено: <span className="font-semibold">{ftsSearchResult.data.total}</span> {ftsSearchResult.data.total === 1 ? 'заметка' : 'заметок'}
                </div>
                {ftsSearchResult.data.executionTime !== undefined && (
                  <div className="flex items-center gap-2">
                    <span>{ftsSearchResult.data.executionTime}ms</span>
                    <Badge variant="outline" className="text-xs gap-1">
                      <Zap className="h-3 w-3" />
                      Быстрый поиск
                    </Badge>
                  </div>
                )}
              </div>

              {/* FTS Results List */}
              <div className="space-y-4">
                {ftsSearchResult.data.results.map((note) => (
                  <Card key={note.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-2">
                          {note.title || 'Без названия'}
                        </CardTitle>
                        <div className="flex gap-1 flex-shrink-0">
                          {note.rank > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {(note.rank * 100).toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Highlighted content preview */}
                      {note.headline && (
                        <div
                          className="text-sm text-muted-foreground line-clamp-3"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(note.headline, { ALLOWED_TAGS: ['mark'] })
                          }}
                          style={{
                            '--mark-bg': 'hsl(var(--primary) / 0.2)',
                            '--mark-color': 'hsl(var(--primary))'
                          }}
                        />
                      )}

                      {/* Tags */}
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {note.tags.slice(0, 5).map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {note.tags.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{note.tags.length - 5}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="text-xs text-muted-foreground">
                        {new Date(note.updated_at).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : notesQuery.isLoading ? (
            <NoteListSkeleton count={5} />
          ) : notes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No notes yet</p>
              <p className="text-sm mt-2">Create your first note to get started!</p>
            </div>
          ) : notes.length > 100 ? (
            // Virtual scrolling for large lists (>100 notes)
            <>
              <VirtualNoteList
                notes={notes}
                selectedNote={selectedNote}
                onSelectNote={handleSelectNote}
                onTagClick={handleTagClick}
                height={600} // Will be calculated dynamically
              />
              
              {/* Infinite Scroll Sentinel & Loading Indicator */}
              {notesQuery.hasNextPage && (
                <div className="p-4">
                  <div ref={observerTarget} className="h-1" />
                  {notesQuery.isFetchingNextPage && (
                    <div className="text-center py-2">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  )}
                  {!notesQuery.isFetchingNextPage && (
                    <div className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => notesQuery.fetchNextPage()}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Load More
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            // Regular scrolling for small lists (≤100 notes)
            <>
              <div className="space-y-1 p-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => handleSelectNote(note)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedNote?.id === note.id
                        ? 'bg-accent border'
                        : 'hover:bg-muted/50 border border-transparent'
                    }`}
                  >
                    <h3 className="font-semibold truncate">{note.title}</h3>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {note.description}
                    </p>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.tags.slice(0, 3).map((tag, index) => (
                          <InteractiveTag
                            key={index}
                            tag={tag}
                            onClick={handleTagClick}
                            showIcon={false}
                            className="text-xs px-2 py-0.5"
                          />
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(note.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
              
              {/* Infinite Scroll Sentinel & Loading Indicator */}
              {notesQuery.hasNextPage && (
                <div className="p-4">
                  <div ref={observerTarget} className="h-1" />
                  {notesQuery.isFetchingNextPage && (
                    <div className="text-center py-2">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  )}
                  {!notesQuery.isFetchingNextPage && (
                    <div className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => notesQuery.fetchNextPage()}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Load More
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* User Profile */}
        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-accent-foreground">
                  {user.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <span className="text-sm truncate">{user.email}</span>
            </div>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {!selectedNote && !isEditing ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a note or create a new one</p>
            </div>
          </div>
        ) : isEditing ? (
          <div className="flex-1 flex flex-col">
            {/* Editor Header */}
            <div className="p-4 border-b bg-card flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {selectedNote ? 'Edit Note' : 'New Note'}
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setIsEditing(false)
                    if (!selectedNote) {
                      setEditForm({ title: '', description: '', tags: '' })
                    }
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveNote}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            </div>

            {/* Editor Form */}
            <div className="flex-1 overflow-y-auto p-6 bg-card">
              <div className="max-w-4xl mx-auto space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Note title"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="text-2xl font-bold border-none focus-visible:ring-0 px-0"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Tag className="w-4 h-4" />
                    <span>Tags (comma-separated)</span>
                  </div>
                  <Input
                    type="text"
                    placeholder="work, personal, ideas"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  />
                </div>
                <div>
                  <RichTextEditor
                    content={editForm.description}
                    onChange={(html) =>
                      setEditForm({ ...editForm, description: html })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Note View Header */}
            <div className="p-4 border-b bg-card flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selectedNote.title}</h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleEditNote(selectedNote)}
                  variant="outline"
                  size="sm"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={() => handleDeleteNote(selectedNote)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Note Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-card">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-4">
                  {selectedNote.title}
                </h1>
                
                {selectedNote.tags && selectedNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedNote.tags.map((tag, index) => (
                      <InteractiveTag
                        key={index}
                        tag={tag}
                        onClick={handleTagClick}
                        onRemove={(tagToRemove) => handleRemoveTagFromNote(selectedNote.id, tagToRemove)}
                      />
                    ))}
                  </div>
                )}
                
                <div className="prose prose-lg max-w-none">
                  <div
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedNote.description }}
                  />
                </div>
                
                <div className="mt-8 pt-4 border-t text-sm text-muted-foreground">
                  <p>Created: {new Date(selectedNote.created_at).toLocaleString()}</p>
                  <p>Updated: {new Date(selectedNote.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Note</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{noteToDelete?.title}"? This action cannot be undone.
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
    </div>
  )
}
