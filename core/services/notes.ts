import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/supabase/types'

type Note = Tables<'notes'>
export type TrashEntry = Omit<Note, 'id'> & {
  trash_id: string
  original_note_id: string
  deleted_at: string
  body_bytes: number
}
export type TrashSummary = Omit<TrashEntry, 'description'> & { preview_html: string }
export const TRASH_CARD_PREVIEW_LENGTH = 2048
export type TrashActionResult = {
  trash_id: string
  id?: string
  status: 'restored' | 'purged' | 'missing' | 'conflict'
}
export type DeleteNoteOptions = {
  snapshot?: Partial<Note>
  expectedUpdatedAt?: string
  operationId?: string
}
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
      signal?: AbortSignal
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

    if (options.signal) query = query.abortSignal(options.signal)
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

  async deleteNote(id: string, options?: DeleteNoteOptions) {
    if (
      options?.snapshot ||
      options?.expectedUpdatedAt ||
      options?.operationId
    ) {
      const { data, error } = await this.supabase.rpc('trash_notes', {
        p_notes: [
          {
            id,
            ...(options.snapshot ? { snapshot: options.snapshot } : {}),
            ...(options.expectedUpdatedAt
              ? { expected_updated_at: options.expectedUpdatedAt }
              : {}),
            ...(options.operationId
              ? { operation_id: options.operationId }
              : {}),
          },
        ],
      })
      if (error) throw error
      const outcome = Array.isArray(data)
        ? data.find((row) => row.id === id)
        : undefined
      if (outcome?.status === 'conflict')
        throw new Error(
          'The note changed on another device. Your local draft remains in Trash pending sync.',
        )
      if (!outcome || !['trashed', 'already_trashed'].includes(outcome.status))
        throw new Error(
          'The server could not confirm that the note was saved in Trash.',
        )
      return id
    }
    // Older ID-only callers are protected by the archive-before-delete database trigger.
    const { error } = await this.supabase.from('notes').delete().eq('id', id)
    if (error) throw error
    return id
  }

  async getTrash(userId: string, page = 0) {
    const { data, error, count } = await this.supabase
      .from('notes_trash_list')
      .select(
        'trash_id, original_note_id, user_id, title, tags, created_at, updated_at, deleted_at, body_bytes, preview_html',
        { count: 'exact' },
      )
      .eq('user_id', userId)
      .order('deleted_at', { ascending: false })
      .order('trash_id', { ascending: false })
      .range(page * 50, page * 50 + 49)
    if (error) throw error
    return {
      notes: (data ?? []) as TrashSummary[],
      totalCount: count ?? 0,
      hasMore: (page + 1) * 50 < (count ?? 0),
    }
  }

  async trashNotesBatch(
    ids: string[],
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    if (ids.length > 100)
      throw new Error('Process at most 100 notes at a time.')
    const { data, error } = await this.supabase.rpc('trash_notes', {
      p_notes: ids.map((id) => ({ id })),
    })
    if (error) throw error
    const succeeded: string[] = [],
      failed: string[] = []
    for (const id of ids) {
      const row = Array.isArray(data)
        ? data.find((item) => item.id === id)
        : undefined
      if (
        !row ||
        !['trashed', 'already_trashed', 'missing', 'conflict'].includes(
          row.status,
        )
      )
        throw new Error('Incomplete Trash confirmation.')
      if (row.status === 'conflict') failed.push(id)
      else succeeded.push(id)
    }
    return { succeeded, failed }
  }

  async getTrashedNote(trashId: string, userId: string): Promise<TrashEntry> {
    const { data, error } = await this.supabase
      .from('notes_trash')
      .select('*')
      .eq('trash_id', trashId)
      .eq('user_id', userId)
      .single()
    if (error) throw error
    return { ...data, description: data.description ?? '' } as TrashEntry
  }

  async getAllTrashIds(userId: string): Promise<string[]> {
    const ids = new Set<string>()
    let cursor: { trash_id: string; deleted_at: string } | undefined
    while (true) {
      let query = this.supabase
        .from('notes_trash')
        .select('trash_id, deleted_at')
        .eq('user_id', userId)
        .order('deleted_at', { ascending: false })
        .order('trash_id', { ascending: false })
        .limit(500)
      if (cursor)
        query = query.or(
          `deleted_at.lt.${cursor.deleted_at},and(deleted_at.eq.${cursor.deleted_at},trash_id.lt.${cursor.trash_id})`,
        )
      const { data, error } = await query
      if (error) throw error
      if (!data) throw new Error('Could not load the complete Trash selection.')
      const size = ids.size
      for (const row of data) ids.add(row.trash_id)
      if (data.length < 500) return [...ids]
      if (size === ids.size)
        throw new Error('Trash pagination did not advance. Refresh and retry.')
      cursor = data[data.length - 1]
    }
  }

  async restoreTrashedNotes(ids: string[]): Promise<TrashActionResult[]> {
    return this.trashEntryAction('restore_notes', ids)
  }

  async cleanupExpiredTrash(
    run: string,
    isCurrent: () => boolean = () => true,
  ): Promise<number> {
    const started = Date.now()
    let removed = 0
    for (
      let batch = 0;
      batch < 5 && isCurrent() && Date.now() - started < 2000;
      batch++
    ) {
      const { data, error } = await this.supabase.rpc('cleanup_my_trash', {
        p_run: run,
      })
      if (error) throw error
      if (typeof data !== 'number' || data < 0 || data > 100)
        throw new Error('Invalid cleanup confirmation.')
      removed += data
      if (data < 100) break
    }
    return removed
  }

  async purgeTrashedNotes(ids: string[]): Promise<TrashActionResult[]> {
    return this.trashEntryAction('purge_notes', ids)
  }

  private async trashEntryAction(
    action: 'restore_notes' | 'purge_notes',
    ids: string[],
  ): Promise<TrashActionResult[]> {
    if (ids.length > 100)
      throw new Error('Process at most 100 Trash entries at a time.')
    const { data, error } = await this.supabase.rpc(action, { p_ids: ids })
    if (error) throw error
    const statuses =
      action === 'restore_notes'
        ? ['restored', 'missing', 'conflict']
        : ['purged', 'missing']
    if (
      !Array.isArray(data) ||
      data.length !== new Set(ids).size ||
      data.some(
        (row) =>
          !row || !ids.includes(row.trash_id) || !statuses.includes(row.status),
      ) ||
      ids.some((id) => !data.some((row) => row.trash_id === id))
    )
      throw new Error('Incomplete Trash confirmation. Refresh before retrying.')
    return data as TrashActionResult[]
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

  async getNoteStatus(id: string, signal?: AbortSignal): Promise<NoteLookupResult> {
    let query = this.supabase
      .from('notes')
      .select('id, title, description, tags, created_at, updated_at, user_id')
      .eq('id', id)
    if (signal) query = query.abortSignal(signal)
    const { data, error } = await query.maybeSingle()

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

  async getExistingNoteIds(noteIds: string[], userId: string, signal?: AbortSignal): Promise<string[]> {
    const existing: string[] = []
    for (let offset = 0; offset < noteIds.length; offset += 100) {
      let query = this.supabase.from('notes').select('id', { count: 'exact' })
        .eq('user_id', userId).in('id', noteIds.slice(offset, offset + 100))
      if (signal) query = query.abortSignal(signal)
      const { data, error, count } = await query
      if (error) throw error
      // A server row limit must never turn a truncated result into false deletions.
      if (!data || count !== data.length) throw new Error('Incomplete note existence response')
      existing.push(...data.map(note => note.id))
    }
    return existing
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
