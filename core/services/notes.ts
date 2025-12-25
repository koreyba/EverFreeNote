import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/supabase/types'

type Note = Tables<'notes'>

// Sanitize value for PostgREST OR syntax: strip commas to avoid breaking the logic tree
const sanitizeOrValue = (value: string) => value.replace(/,/g, ' ')

export class NoteService {
  constructor(private supabase: SupabaseClient) { }

  async getNotes(
    userId: string,
    options: {
      page?: number
      pageSize?: number
      tag?: string | null
      searchQuery?: string
    } = {}
  ) {
    const { page = 0, pageSize = 50, tag, searchQuery } = options
    const start = page * pageSize
    const end = start + pageSize - 1

    let query = this.supabase
      .from('notes')
      .select('id, title, description, tags, created_at, updated_at, user_id', { count: 'exact' })
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(start, end)

    if (tag) {
      query = query.contains('tags', [tag])
    }

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      const safeSearch = sanitizeOrValue(searchLower)
      query = query.or(`title.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`)
    }

    const { data, error, count } = await query
    if (error) throw error

    return {
      notes: (data as Note[]) || [],
      totalCount: count || 0,
      hasMore: !!(data && data.length === pageSize),
      nextCursor: data && data.length === pageSize ? page + 1 : undefined,
    }
  }

  async createNote(note: Pick<Note, 'title' | 'description' | 'tags'> & { userId: string; id?: string }) {
    const { data, error } = await this.supabase
      .from('notes')
      .insert([
        {
          ...(note.id ? { id: note.id } : {}),
          title: note.title,
          description: note.description,
          tags: note.tags,
          user_id: note.userId,
        },
      ])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateNote(id: string, updates: Partial<Pick<Note, 'title' | 'description' | 'tags'>>) {
    const { data, error } = await this.supabase
      .from('notes')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteNote(id: string) {
    const { error } = await this.supabase.from('notes').delete().eq('id', id)
    if (error) throw error
    return id
  }

  async getNote(id: string) {
    const { data, error } = await this.supabase
      .from('notes')
      .select('id, title, description, tags, created_at, updated_at, user_id')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Note
  }

  async getNotesByIds(noteIds: string[], userId: string) {
    if (!noteIds.length) return []

    const { data, error } = await this.supabase
      .from('notes')
      .select('id, title, description, tags, created_at, updated_at, user_id')
      .eq('user_id', userId)
      .in('id', noteIds)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return (data as Note[]) || []
  }
}
