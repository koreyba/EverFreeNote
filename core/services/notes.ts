import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/supabase/types'
import { deleteTagFromNotes, renameTagInNotes } from './tags'

type Note = Tables<'notes'>
const ALL_NOTES_PAGE_SIZE = 1000
export type NoteLookupResult =
  | { status: 'found'; note: Note }
  | { status: 'not_found' }
  | { status: 'transient_error'; error: unknown }

// Sanitize value for PostgREST OR syntax: strip commas to avoid breaking the logic tree
const sanitizeOrValue = (value: string) => value.replaceAll(',', ' ')

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

  async getNoteStatus(id: string): Promise<NoteLookupResult> {
    const { data, error } = await this.supabase
      .from('notes')
      .select('id, title, description, tags, created_at, updated_at, user_id')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      return {
        status: 'transient_error',
        error,
      }
    }

    if (!data) {
      return {
        status: 'not_found',
      }
    }

    return {
      status: 'found',
      note: data as Note,
    }
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

  async getAllNotes(userId: string): Promise<Note[]> {
    const notes: Note[] = []

    for (let page = 0; ; page += 1) {
      const start = page * ALL_NOTES_PAGE_SIZE
      const end = start + ALL_NOTES_PAGE_SIZE - 1
      const { data, error } = await this.supabase
        .from('notes')
        .select('id, title, description, tags, created_at, updated_at, user_id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .range(start, end)

      if (error) throw error

      const pageNotes = (data as Note[]) || []
      notes.push(...pageNotes)
      if (pageNotes.length < ALL_NOTES_PAGE_SIZE) return notes
    }
  }

  async renameTag(userId: string, sourceTag: string, replacementTag: string): Promise<Note[]> {
    const notes = await this.getAllNotes(userId)
    const updatedNotes = renameTagInNotes(notes, sourceTag, replacementTag)
    const changedNotes = updatedNotes.filter((note, index) => note !== notes[index])
    const persistedNotes: Note[] = []

    for (const note of changedNotes) {
      persistedNotes.push(await this.updateNote(note.id, { tags: note.tags }))
    }

    return persistedNotes
  }

  async deleteTag(userId: string, sourceTag: string): Promise<Note[]> {
    const notes = await this.getAllNotes(userId)
    const updatedNotes = deleteTagFromNotes(notes, sourceTag)
    const changedNotes = updatedNotes.filter((note, index) => note !== notes[index])
    const persistedNotes: Note[] = []

    for (const note of changedNotes) {
      persistedNotes.push(await this.updateNote(note.id, { tags: note.tags }))
    }

    return persistedNotes
  }

  async getAllTagsWithCounts(userId: string): Promise<{ tags: string[]; counts: Record<string, number> }> {
    const { data, error } = await this.supabase
      .from('notes')
      .select('tags')
      .eq('user_id', userId)

    if (error) throw error

    const counts: Record<string, number> = {}
    for (const row of data || []) {
      if (!row.tags) continue
      const seen = new Set<string>()
      for (const rawTag of row.tags) {
        if (typeof rawTag !== 'string') continue
        const trimmed = rawTag.trim().replace(/\s+/g, ' ').toLowerCase()
        if (trimmed && !seen.has(trimmed)) {
          seen.add(trimmed)
          counts[trimmed] = (counts[trimmed] || 0) + 1
        }
      }
    }
    const tags = Object.keys(counts).sort((a, b) => a.localeCompare(b))
    return { tags, counts }
  }
}
