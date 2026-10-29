// Supabase-backed NotebookRepository.
//
// The client passed in MUST carry the end user's access token (anon key +
// `Authorization: Bearer <jwt>`) so Row Level Security is evaluated as that
// user. The explicit `user_id` filters are defence in depth, not the boundary.

import type { SupabaseClient } from '@supabase/supabase-js'

import { applyTagEdit, aggregateTags, tagsUnchanged } from './tagVocabulary.ts'
import type {
  CreateNoteInput,
  EditNoteTagsInput,
  TagVocabulary,
  ListNotesParams,
  ListNotesResult,
  NoteRecord,
  NotebookRepository,
  UpdateNotePatch,
} from './types.ts'

export const NOTE_COLUMNS = 'id, title, description, tags, created_at, updated_at'

/**
 * Upper bound on the notes scanned to build the tag vocabulary. There is no RPC
 * for it, so one small array column is read per note; the cap keeps a runaway
 * notebook from turning a tool call into a full table read.
 */
export const TAG_SCAN_NOTE_LIMIT = 5000
const TAG_SCAN_PAGE_SIZE = 1000

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

/** Encode literal search text for a regex inside PostgREST's quoted or() filter. */
export function escapeSearchValue(value: string): string {
  // Regex backslashes must themselves be escaped for PostgREST's filter parser.
  return value.trim().replace(/[.*+?^${}()|[\]\\"]/g, (character) => {
    if (character === '\\') return '\\\\\\\\'
    if (character === '"') return '\\"'
    return `\\\\${character}`
  })
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

// PostgREST accepts PostgreSQL array literals as equality operands. Quote every
// string so commas, quotes, backslashes and the string "NULL" stay literal.
function pgTextArrayLiteral(values: unknown[]): string {
  return `{${values.map((value) => value === null ? 'NULL' : `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`).join(',')}}`
}

export function createSupabaseNotebookRepository(supabase: SupabaseClient, userId: string): NotebookRepository {
  const notes = () => supabase.from('notes')

  const getNoteRow = async (id: string): Promise<NoteRow | null> => {
    const { data, error } = await notes().select(NOTE_COLUMNS).eq('id', id).eq('user_id', userId).maybeSingle()

    if (error) throw error
    return data as NoteRow | null
  }

  const getNote = async (id: string): Promise<NoteRecord | null> => {
    const row = await getNoteRow(id)
    return row ? toNoteRecord(row) : null
  }

  return {
    async listNotes({ query, tags, tagMatch, limit, offset }: ListNotesParams): Promise<ListNotesResult> {
      let request = notes()
        .select(NOTE_COLUMNS, { count: 'exact' })
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Both operators are served by idx_notes_tags (GIN): @> for "all", && for "any".
      const tagFilter = tags.filter((value) => value.trim().length > 0)
      if (tagFilter.length > 0) {
        request = tagMatch === 'any' ? request.overlaps('tags', tagFilter) : request.contains('tags', tagFilter)
      }

      const needle = query ? escapeSearchValue(query) : ''
      if (needle) {
        // imatch supports literal `*`, which PostgREST treats as a wildcard in ilike.
        request = request.or(`title.imatch."${needle}",description.imatch."${needle}"`)
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

    async listTags(): Promise<TagVocabulary> {
      const rows: { tags: unknown }[] = []
      let count: number | null = null
      while (rows.length < TAG_SCAN_NOTE_LIMIT) {
        const start = rows.length
        const size = Math.min(TAG_SCAN_PAGE_SIZE, TAG_SCAN_NOTE_LIMIT - start)
        const result = await notes()
          .select('tags', { count: 'exact' })
          .eq('user_id', userId)
          .not('tags', 'eq', '{}')
          .order('id', { ascending: true })
          .range(start, start + size - 1)
        if (result.error) throw result.error
        const page = (result.data ?? []) as { tags: unknown }[]
        rows.push(...page)
        count = result.count
        if (page.length === 0 || (count !== null && rows.length >= count) || (count === null && page.length < size)) break
      }

      let truncated = count !== null && count > rows.length
      // A missing count requires a one-row probe to distinguish exactly 5000
      // from a truncated scan. Real PostgREST normally supplies the count.
      if (count === null && rows.length === TAG_SCAN_NOTE_LIMIT) {
        const probe = await notes().select('tags').eq('user_id', userId).not('tags', 'eq', '{}')
          .order('id', { ascending: true }).range(TAG_SCAN_NOTE_LIMIT, TAG_SCAN_NOTE_LIMIT)
        if (probe.error) throw probe.error
        truncated = (probe.data?.length ?? 0) > 0
      }
      const tagLists = rows.map((row) => (Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : []))

      return {
        tags: aggregateTags(tagLists),
        total: rows.length,
        truncated,
      }
    },

    async editNoteTags(id: string, edit: EditNoteTagsInput): Promise<NoteRecord | null> {
      // Compare the raw array in the UPDATE predicate. A concurrent change
      // makes the update affect no rows; re-read and apply the edit again.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const row = await getNoteRow(id)
        if (!row) return null
        const note = toNoteRecord(row)
        const nextTags = applyTagEdit(note.tags, edit)
        if (tagsUnchanged(note.tags, nextTags)) return note

        let request = notes().update({ tags: nextTags }).eq('id', id).eq('user_id', userId)
        request = row.tags === null
          ? request.is('tags', null)
          : request.eq('tags', pgTextArrayLiteral(row.tags as unknown[]))
        const { data, error } = await request.select(NOTE_COLUMNS).maybeSingle()
        if (error) throw error
        if (data) return toNoteRecord(data as NoteRow)
      }
      throw new Error('Concurrent tag updates prevented applying changes; retry the operation')
    },
  }
}
