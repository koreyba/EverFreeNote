// Supabase-backed NotebookRepository.
//
// The client passed in MUST carry the end user's access token (anon key +
// `Authorization: Bearer <jwt>`) so Row Level Security is evaluated as that
// user. The explicit `user_id` filters are defence in depth, not the boundary.

import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  CreateNoteInput,
  ListNotesParams,
  ListNotesResult,
  NoteRecord,
  NotebookRepository,
  UpdateNotePatch,
} from './types.ts'

export const NOTE_COLUMNS = 'id, title, description, tags, created_at, updated_at'

/** Writable columns of `public.notes`. The note body lives in `description`. */
type NoteColumns = {
  title: string
  description: string
  tags: string[]
}

type NoteRow = {
  id: string
  title: string | null
  description: string | null
  tags: unknown
  created_at: string | null
  updated_at: string | null
}

/** Removes characters that would break PostgREST's quoted `or()` filter values. */
export function escapeIlikeValue(value: string): string {
  return value.replaceAll('"', '').replaceAll('\\', '').trim()
}

export function toNoteRecord(row: NoteRow): NoteRecord {
  return {
    id: row.id,
    title: row.title ?? '',
    contentHtml: row.description ?? '',
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  }
}

export function createSupabaseNotebookRepository(supabase: SupabaseClient, userId: string): NotebookRepository {
  const notes = () => supabase.from('notes')

  const getNote = async (id: string): Promise<NoteRecord | null> => {
    const { data, error } = await notes().select(NOTE_COLUMNS).eq('id', id).eq('user_id', userId).maybeSingle()

    if (error) throw error
    return data ? toNoteRecord(data as NoteRow) : null
  }

  return {
    async listNotes({ query, tag, limit, offset }: ListNotesParams): Promise<ListNotesResult> {
      let request = notes()
        .select(NOTE_COLUMNS, { count: 'exact' })
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (tag) {
        request = request.contains('tags', [tag])
      }

      const needle = query ? escapeIlikeValue(query) : ''
      if (needle) {
        request = request.or(`title.ilike."%${needle}%",description.ilike."%${needle}%"`)
      }

      const { data, error, count } = await request
      if (error) throw error

      const rows = (data ?? []) as NoteRow[]
      return {
        notes: rows.map(toNoteRecord),
        total: typeof count === 'number' ? count : offset + rows.length,
      }
    },

    getNote,

    async createNote(input: CreateNoteInput): Promise<NoteRecord> {
      const { data, error } = await notes()
        .insert([
          {
            title: input.title,
            description: input.contentHtml,
            tags: input.tags,
            user_id: userId,
          },
        ])
        .select(NOTE_COLUMNS)
        .single()

      if (error) throw error
      return toNoteRecord(data as NoteRow)
    },

    async updateNote(id: string, patch: UpdateNotePatch): Promise<NoteRecord | null> {
      const changes: Partial<NoteColumns> = {}
      if (patch.title !== undefined) changes.title = patch.title
      if (patch.contentHtml !== undefined) changes.description = patch.contentHtml
      if (patch.tags !== undefined) changes.tags = patch.tags

      if (Object.keys(changes).length === 0) {
        return getNote(id)
      }

      const { data, error } = await notes()
        .update(changes)
        .eq('id', id)
        .eq('user_id', userId)
        .select(NOTE_COLUMNS)
        .maybeSingle()

      if (error) throw error
      return data ? toNoteRecord(data as NoteRow) : null
    },
  }
}
