import { createClient } from '@/lib/supabase/client'

export class NoteCreator {
  constructor() {
    this.supabase = createClient()
  }

  async create(note, userId, duplicateStrategy = 'prefix') {
    try {
      const result = await this.handleDuplicate(note.title, userId, duplicateStrategy)
      
      if (result.skip) {
        console.log('Skipping duplicate note:', note.title)
        return null
      }

      const noteData = {
        user_id: userId,
        title: result.title,
        description: note.content,
        tags: note.tags,
        created_at: note.created.toISOString(),
        updated_at: note.updated.toISOString()
      }

      if (result.replace && result.existingId) {
        // Update existing note
        const { data, error } = await this.supabase
          .from('notes')
          .update(noteData)
          .eq('id', result.existingId)
          .select('id')
          .single()

        if (error) throw error
        return data.id
      } else {
        // Insert new note
        const { data, error } = await this.supabase
          .from('notes')
          .insert(noteData)
          .select('id')
          .single()

        if (error) throw error
        return data.id
      }
    } catch (error) {
      console.error('Note creation failed:', error)
      throw new Error(`Failed to create note: ${error.message}`)
    }
  }

  async handleDuplicate(title, userId, strategy) {
    const { data, error } = await this.supabase
      .from('notes')
      .select('id, title')
      .eq('user_id', userId)
      .eq('title', title)
      .maybeSingle()

    if (error) {
      console.error('Duplicate check failed:', error)
      return { title, skip: false, replace: false }
    }

    if (!data) {
      // No duplicate
      return { title, skip: false, replace: false }
    }

    // Handle duplicate based on strategy
    switch (strategy) {
      case 'skip':
        return { title, skip: true, replace: false }
      
      case 'replace':
        return { title, skip: false, replace: true, existingId: data.id }
      
      case 'prefix':
      default:
        return { title: `[duplicate] ${title}`, skip: false, replace: false }
    }
  }
}
