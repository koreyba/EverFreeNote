'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, ArrowLeft, Tag, LogOut, Loader2, BookOpen } from 'lucide-react'
import InteractiveTag from '@/components/InteractiveTag'

export default function TagPage() {
  const params = useParams()
  const router = useRouter()
  const tag = decodeURIComponent(params.tag)

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState([])
  const [selectedNote, setSelectedNote] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const supabase = createClient()

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null)
        if (session?.user) {
          fetchNotesByTag()
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
      fetchNotesByTag()
    }
  }, [user])

  const fetchNotesByTag = async (search = '') => {
    try {
      let query = supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error('Error fetching notes:', error)
        return
      }

      // Filter by tag
      let filteredData = data.filter(note =>
        note.tags && note.tags.includes(tag)
      )

      // Additional search filtering
      if (search) {
        filteredData = filteredData.filter(note => {
          const titleMatch = note.title.toLowerCase().includes(search.toLowerCase())
          const descMatch = note.description.toLowerCase().includes(search.toLowerCase())
          const tagMatch = note.tags?.some(noteTag =>
            noteTag.toLowerCase().includes(search.toLowerCase())
          )
          return titleMatch || descMatch || tagMatch
        })
      }

      setNotes(filteredData)
    } catch (error) {
      console.error('Error fetching notes:', error)
    }
  }

  const handleSearch = (query) => {
    setSearchQuery(query)
    fetchNotesByTag(query)
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleSelectNote = (note) => {
    setSelectedNote(note)
  }

  const handleBackToMain = () => {
    router.push('/')
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
            <Button
              onClick={() => router.push('/')}
              className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
            >
              Go to Home
            </Button>
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
            <Button
              onClick={handleBackToMain}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-green-600" />
            <h1 className="text-lg font-bold text-gray-800">Notes tagged with</h1>
          </div>
          <div className="mb-4">
            <Badge variant="outline" className="text-sm px-3 py-1 bg-green-50 text-green-700 border-green-200">
              {tag}
            </Badge>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search in these notes..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No notes found with this tag</p>
              <p className="text-sm mt-2">Try searching for a different tag or create a new note.</p>
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
                      {note.tags.slice(0, 3).map((noteTag, index) => (
                        <InteractiveTag
                          key={index}
                          tag={noteTag}
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
        {!selectedNote ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Tag className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a note to view</p>
              <p className="text-sm mt-2">Showing notes tagged with "{tag}"</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Note View Header */}
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">{selectedNote.title}</h2>
              <div className="flex gap-2">
                <Button
                  onClick={handleBackToMain}
                  variant="outline"
                  size="sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to All Notes
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
                    {selectedNote.tags.map((noteTag, index) => (
                      <InteractiveTag
                        key={index}
                        tag={noteTag}
                      />
                    ))}
                  </div>
                )}

                <div className="prose prose-lg max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedNote.description}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-500">
                  <p>Created: {new Date(selectedNote.created_at).toLocaleString()}</p>
                  <p>Updated: {new Date(selectedNote.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
