import { createClient } from '@/lib/supabase/client'

export class NoteCreator {
  constructor() {
    this.supabase = createClient()
  }

  async create(note, userId) {
    try {
      const title = await this.checkDuplicate(note.title, userId)

      const { data, error } = await this.supabase
        .from('notes')
        .insert({
          user_id: userId,
          title,
          description: note.content,
          tags: note.tags,
          created_at: note.created.toISOString(),
          updated_at: note.updated.toISOString()
        })
        .select('id')
        .single()

      if (error) throw error

      return data.id
    } catch (error) {
      console.error('Note creation failed:', error)
      throw new Error(`Failed to create note: ${error.message}`)
    }
  }

  async checkDuplicate(title, userId) {
    const { data, error } = await this.supabase
      .from('notes')
      .select('title')
      .eq('user_id', userId)
      .eq('title', title)
      .maybeSingle()

    if (error) {
      console.error('Duplicate check failed:', error)
      return title
    }

    return data ? `[duplicate] ${title}` : title
  }
}

