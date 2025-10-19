'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import RichTextEditor from '@/components/RichTextEditor'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Search, Plus, Edit2, Trash2, Tag, LogOut, Loader2, BookOpen } from 'lucide-react'
import InteractiveTag from '@/components/InteractiveTag'
import AuthForm from '@/components/AuthForm'
import { toast } from 'sonner'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState([])
  const [selectedNote, setSelectedNote] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', description: '', tags: '' })
  const [saving, setSaving] = useState(false)
  const [filterByTag, setFilterByTag] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState(null)
  
  const supabase = createClient()

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
        if (session?.user) {
          fetchNotes()
        } else {
          setNotes([])
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Fetch notes when user is authenticated
  useEffect(() => {
    if (user) {
      fetchNotes()
    }
  }, [user])

  const fetchNotes = async (search = '', tagFilter = null) => {
    try {
      let query = supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false })

      // Search functionality
      if (search) {
        const searchLower = search.toLowerCase()
        query = query.or(`title.ilike.%${searchLower}%,description.ilike.%${searchLower}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching notes:', error)
        toast.error('Failed to load notes: ' + error.message)
        return
      }

      // Additional filtering
      let filteredData = data
      
      // Filter by tag
      if (tagFilter) {
        filteredData = filteredData.filter(note => 
          note.tags && note.tags.includes(tagFilter)
        )
      }
      
      // Filter by search
      if (search) {
        filteredData = filteredData.filter(note => {
          const titleMatch = note.title.toLowerCase().includes(search.toLowerCase())
          const descMatch = note.description.toLowerCase().includes(search.toLowerCase())
          const tagMatch = note.tags?.some(tag => 
            tag.toLowerCase().includes(search.toLowerCase())
          )
          return titleMatch || descMatch || tagMatch
        })
      }

      setNotes(filteredData)
    } catch (error) {
      console.error('Error fetching notes:', error)
      toast.error('An unexpected error occurred while loading notes')
    }
  }

  const handleSearch = (query) => {
    setSearchQuery(query)
    fetchNotes(query, filterByTag)
  }

  const handleTagClick = (tag) => {
    setFilterByTag(tag)
    setSearchQuery('')
    fetchNotes('', tag)
    setSelectedNote(null)
    setIsEditing(false)
  }

  const handleClearTagFilter = () => {
    setFilterByTag(null)
    setSearchQuery('')
    fetchNotes('', null)
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
      setNotes([])
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
        updated_at: new Date().toISOString(),
      }

      if (selectedNote) {
        // Update existing note
        const { error } = await supabase
          .from('notes')
          .update(noteData)
          .eq('id', selectedNote.id)

        if (error) {
          console.error('Error updating note:', error)
          toast.error('Failed to update note: ' + error.message)
          return
        }

        toast.success('Note updated successfully')
      } else {
        // Create new note
        const { error } = await supabase
          .from('notes')
          .insert({
            ...noteData,
            user_id: user.id,
          })

        if (error) {
          console.error('Error creating note:', error)
          toast.error('Failed to create note: ' + error.message)
          return
        }

        toast.success('Note created successfully')
      }

      await fetchNotes(searchQuery, filterByTag)
      setIsEditing(false)
      setSelectedNote(null)
      setEditForm({ title: '', description: '', tags: '' })
    } catch (error) {
      console.error('Error saving note:', error)
      toast.error('An unexpected error occurred while saving the note')
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
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteToDelete.id)

      if (error) {
        console.error('Error deleting note:', error)
        toast.error('Failed to delete note: ' + error.message)
        return
      }

      toast.success('Note deleted successfully')
      await fetchNotes(searchQuery, filterByTag)
      if (selectedNote?.id === noteToDelete.id) {
        setSelectedNote(null)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      toast.error('An unexpected error occurred while deleting the note')
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

      // Update the note in database
      const { error } = await supabase
        .from('notes')
        .update({
          tags: updatedTags,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId)

      if (error) {
        console.error('Error removing tag from note:', error)
        toast.error('Failed to remove tag: ' + error.message)
        return
      }

      // Update local state
      await fetchNotes(searchQuery, filterByTag)

      // Update selectedNote if it's the current note
      if (selectedNote?.id === noteId) {
        setSelectedNote({
          ...selectedNote,
          tags: updatedTags,
          updated_at: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error removing tag from note:', error)
      toast.error('An unexpected error occurred while removing the tag')
    }
  }

  const handleSelectNote = (note) => {
    setSelectedNote(note)
    setIsEditing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <BookOpen className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-800">EverFreeNote</CardTitle>
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-green-600" />
              <h1 className="text-xl font-bold text-gray-800">EverFreeNote</h1>
            </div>
          </div>

          {/* Tag Filter Badge */}
          {filterByTag && (
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
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
        <div className="p-4 border-b border-gray-200">
          <Button
            onClick={handleCreateNote}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Note
          </Button>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No notes yet</p>
              <p className="text-sm mt-2">Create your first note to get started!</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedNote?.id === note.id
                      ? 'bg-green-50 border border-green-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <h3 className="font-semibold text-gray-800 truncate">{note.title}</h3>
                  <p className="text-sm text-gray-600 truncate mt-1">
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
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-green-600">
                  {user.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-gray-700 truncate">{user.email}</span>
            </div>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {!selectedNote && !isEditing ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a note or create a new one</p>
            </div>
          </div>
        ) : isEditing ? (
          <div className="flex-1 flex flex-col">
            {/* Editor Header */}
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
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
                  className="bg-green-600 hover:bg-green-700"
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
            <div className="flex-1 overflow-y-auto p-6 bg-white">
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
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
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
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">{selectedNote.title}</h2>
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
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
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
                
                <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
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
