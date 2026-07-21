import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, TablesInsert } from '@/supabase/types'
import { normalizeNoteTitle } from './import-shared'
import type { DuplicateStrategy, ParsedNote } from './types'

type DuplicateContext = {
  skipFileDuplicates: boolean
  existingByTitle: Map<string, string> | null
  fallbackExistingByTitle: Map<string, string | null>
  seenTitlesInImport: Set<string>
}

type DuplicateCheckResult =
  | { title: string; skip: true; replace: false; existingId?: string }
  | { title: string; skip: false; replace: true; existingId: string }
  | { title: string; skip: false; replace: false; existingId?: string }

export class NoteCreator {
  private readonly supabase: SupabaseClient<Database>

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
  }

  private async updateExistingNote(
    existingId: string,
    noteData: TablesInsert<'notes'>
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('notes')
      .update(noteData)
      .eq('id', existingId)
      .select('id')
      .single()

    if (error) throw error
    if (!data?.id) throw new Error('Updated note id was not returned')
    return data.id
  }

  private async insertNewNote(noteData: TablesInsert<'notes'>): Promise<string> {
    const { data, error } = await this.supabase
      .from('notes')
      .insert(noteData)
      .select('id')
      .single()

    if (error) throw error
    if (!data?.id) throw new Error('Created note id was not returned')
    return data.id
  }

  private formatCreationError(error: unknown): never {
    let message = 'Unknown error'
    if (error instanceof Error) {
      message = error.message
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      message = (error as { message: string }).message
    }
    throw new Error(`Failed to create note: ${message}`)
  }

  async create(
    note: ParsedNote,
    userId: string,
    duplicateStrategy: DuplicateStrategy = 'prefix',
    duplicateContext?: DuplicateContext
  ): Promise<string | null> {
    try {
      const normalizedTitle = normalizeNoteTitle(note.title)
      const result = await this.handleDuplicate(note.title, userId, duplicateStrategy, duplicateContext)

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

      const noteId = result.replace && result.existingId
        ? await this.updateExistingNote(result.existingId, noteData)
        : await this.insertNewNote(noteData)

      if (duplicateContext?.skipFileDuplicates) {
        duplicateContext.seenTitlesInImport.add(normalizedTitle)
      }

      return noteId
    } catch (error: unknown) {
      this.formatCreationError(error)
    }
  }

  private async handleDuplicate(
    title: string,
    userId: string,
    strategy: DuplicateStrategy,
    context?: DuplicateContext
  ): Promise<DuplicateCheckResult> {
    const normalizedTitle = normalizeNoteTitle(title)

    if (context) {
      const { skipFileDuplicates, existingByTitle, seenTitlesInImport } = context

      if (skipFileDuplicates && seenTitlesInImport.has(normalizedTitle)) {
        return { title: normalizedTitle, skip: true, replace: false }
      }

      const existingId =
        existingByTitle === null
          ? await this.lookupExistingDuplicateIdWithCache(normalizedTitle, userId, context)
          : (existingByTitle.get(normalizedTitle) ?? null)

      return this.buildDuplicateResult(normalizedTitle, strategy, existingId)
    }

    const existingId = await this.lookupExistingDuplicateId(normalizedTitle, userId)
    return this.buildDuplicateResult(normalizedTitle, strategy, existingId)
  }

  private buildDuplicateResult(
    title: string,
    strategy: DuplicateStrategy,
    existingId?: string | null
  ): DuplicateCheckResult {
    if (!existingId) {
      return { title, skip: false, replace: false }
    }

    switch (strategy) {
      case 'skip':
        return { title, skip: true, replace: false }
      case 'replace':
        return { title, skip: false, replace: true, existingId }
      case 'prefix':
      default:
        return { title: `[duplicate] ${title}`, skip: false, replace: false }
    }
  }

  private async lookupExistingDuplicateIdWithCache(
    title: string,
    userId: string,
    context: DuplicateContext
  ): Promise<string | null> {
    if (context.fallbackExistingByTitle.has(title)) {
      return context.fallbackExistingByTitle.get(title) ?? null
    }

    const existingId = await this.lookupExistingDuplicateId(title, userId)
    context.fallbackExistingByTitle.set(title, existingId)

    return existingId
  }

  private async lookupExistingDuplicateId(title: string, userId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('notes')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('title', title)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    if (!data || data.length === 0) {
      return null
    }

    return data[0]?.id ?? null
  }
}
