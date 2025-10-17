import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// Auth endpoints
export async function POST(request) {
  const url = new URL(request.url)
  const path = url.pathname.replace('/api/', '')

  try {
    const supabase = createSupabaseServer()

    // Sign in with Google OAuth
    if (path === 'auth/signin/google') {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${url.origin}/auth/callback`,
        },
      })

      if (error) {
        return handleCORS(
          NextResponse.json({ error: error.message }, { status: 400 })
        )
      }

      return handleCORS(NextResponse.json({ url: data.url }))
    }

    // Sign out
    if (path === 'auth/signout') {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return handleCORS(
          NextResponse.json({ error: error.message }, { status: 400 })
        )
      }

      return handleCORS(
        NextResponse.json({ message: 'Signed out successfully' })
      )
    }

    // Create note
    if (path === 'notes') {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (!user) {
        return handleCORS(
          NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        )
      }

      const body = await request.json()
      const { title, description, tags } = body

      if (!title || !description) {
        return handleCORS(
          NextResponse.json(
            { error: 'Title and description are required' },
            { status: 400 }
          )
        )
      }

      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          tags: tags || [],
        })
        .select()
        .single()

      if (error) {
        return handleCORS(
          NextResponse.json({ error: error.message }, { status: 400 })
        )
      }

      return handleCORS(NextResponse.json(data, { status: 201 }))
    }

    return handleCORS(
      NextResponse.json({ error: 'Not found' }, { status: 404 })
    )
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(
      NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      )
    )
  }
}

export async function GET(request) {
  const url = new URL(request.url)
  const path = url.pathname.replace('/api/', '')

  try {
    const supabase = createSupabaseServer()

    // Get current user
    if (path === 'auth/user') {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        return handleCORS(
          NextResponse.json({ user: null }, { status: 200 })
        )
      }

      return handleCORS(NextResponse.json({ user }))
    }

    // Get all notes for user
    if (path === 'notes') {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (!user) {
        return handleCORS(
          NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        )
      }

      const searchQuery = url.searchParams.get('search')
      let query = supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      // Search functionality
      if (searchQuery) {
        const search = searchQuery.toLowerCase()
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
      }

      const { data, error } = await query

      if (error) {
        return handleCORS(
          NextResponse.json({ error: error.message }, { status: 400 })
        )
      }

      // Additional tag filtering on client if needed
      let filteredData = data
      if (searchQuery) {
        filteredData = data.filter(note => {
          const titleMatch = note.title.toLowerCase().includes(searchQuery.toLowerCase())
          const descMatch = note.description.toLowerCase().includes(searchQuery.toLowerCase())
          const tagMatch = note.tags?.some(tag => 
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
          return titleMatch || descMatch || tagMatch
        })
      }

      return handleCORS(NextResponse.json(filteredData))
    }

    return handleCORS(
      NextResponse.json({ error: 'Not found' }, { status: 404 })
    )
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(
      NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      )
    )
  }
}

export async function PUT(request) {
  const url = new URL(request.url)
  const path = url.pathname.replace('/api/', '')

  try {
    const supabase = createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (!user) {
      return handleCORS(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      )
    }

    // Update note
    if (path.startsWith('notes/')) {
      const noteId = path.split('/')[1]
      const body = await request.json()
      const { title, description, tags } = body

      if (!title || !description) {
        return handleCORS(
          NextResponse.json(
            { error: 'Title and description are required' },
            { status: 400 }
          )
        )
      }

      const { data, error } = await supabase
        .from('notes')
        .update({
          title: title.trim(),
          description: description.trim(),
          tags: tags || [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        return handleCORS(
          NextResponse.json({ error: error.message }, { status: 400 })
        )
      }

      if (!data) {
        return handleCORS(
          NextResponse.json({ error: 'Note not found' }, { status: 404 })
        )
      }

      return handleCORS(NextResponse.json(data))
    }

    return handleCORS(
      NextResponse.json({ error: 'Not found' }, { status: 404 })
    )
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(
      NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      )
    )
  }
}

export async function DELETE(request) {
  const url = new URL(request.url)
  const path = url.pathname.replace('/api/', '')

  try {
    const supabase = createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (!user) {
      return handleCORS(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      )
    }

    // Delete note
    if (path.startsWith('notes/')) {
      const noteId = path.split('/')[1]

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id)

      if (error) {
        return handleCORS(
          NextResponse.json({ error: error.message }, { status: 400 })
        )
      }

      return handleCORS(
        NextResponse.json({ message: 'Note deleted successfully' })
      )
    }

    return handleCORS(
      NextResponse.json({ error: 'Not found' }, { status: 404 })
    )
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(
      NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      )
    )
  }
}
