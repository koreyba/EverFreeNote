import type { SupabaseClient } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'
import type { Database, TablesInsert } from '@/supabase/types'
import type { DuplicateStrategy, ParsedNote } from './types'

type DuplicateCheckResult =
  | { title: string; skip: true; replace: false; existingId?: string }
  | { title: string; skip: false; replace: true; existingId: string }
  | { title: string; skip: false; replace: false; existingId?: string }

export class NoteCreator {
  private readonly supabase: SupabaseClient<Database>

  constructor() {
    this.supabase = createClient()
  }

  async create(note: ParsedNote, userId: string, duplicateStrategy: DuplicateStrategy = 'prefix'): Promise<string | null> {
    try {
      const result = await this.handleDuplicate(note.title, userId, duplicateStrategy)

      if (result.skip) {
        console.log('Skipping duplicate note:', note.title)
        return null
      }

      const noteData: TablesInsert<'notes'> = {
        user_id: userId,
        title: result.title,
        description: note.content,
        tags: note.tags,
        created_at: note.created.toISOString(),
        updated_at: note.updated.toISOString(),
      }

      if (result.replace && result.existingId) {
        const { data, error } = await this.supabase
          .from('notes')
          .update(noteData)
          .eq('id', result.existingId)
          .select('id')
          .single()

        if (error) throw error
        return data?.id ?? null
      }

      const { data, error } = await this.supabase
        .from('notes')
        .insert(noteData)
        .select('id')
        .single()

      if (error) throw error
      return data?.id ?? null
    } catch (error: any) {
      console.error('Note creation failed:', error)
      throw new Error(`Failed to create note: ${error.message}`)
    }
  }

  private async handleDuplicate(title: string, userId: string, strategy: DuplicateStrategy): Promise<DuplicateCheckResult> {
    const { data, error } = await this.supabase
      .from('notes')
      .select('id, title')
      .eq('user_id', userId)
      .eq('title', title)

    if (error) {
      console.error('Duplicate check failed:', error)
      return { title, skip: false, replace: false }
    }

    if (!data || data.length === 0) {
      return { title, skip: false, replace: false }
    }

    const existingNote = data[0]

    switch (strategy) {
      case 'skip':
        return { title, skip: true, replace: false }
      case 'replace':
        return { title, skip: false, replace: true, existingId: existingNote.id }
      case 'prefix':
      default:
        return { title: `[duplicate] ${title}`, skip: false, replace: false }
    }
  }
}
