import type { Note } from '@core/types/domain'

type UpdatedAtCarrier = {
  updated_at?: string | null
}

export type NoteFields = Pick<Note, 'id' | 'title' | 'description' | 'tags' | 'created_at' | 'updated_at' | 'user_id'>

export const getUpdatedAtMs = (note?: UpdatedAtCarrier): number => {
  if (!note?.updated_at) return Number.NEGATIVE_INFINITY
  const timestamp = Date.parse(note.updated_at)
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
}

export const pickLatestNote = <T extends UpdatedAtCarrier>(
  candidates: Array<T | null | undefined>
): T | undefined => {
  const filtered = candidates.filter(Boolean) as T[]
  if (!filtered.length) return undefined
  return filtered.reduce((best, current) => (
    getUpdatedAtMs(current) > getUpdatedAtMs(best) ? current : best
  ))
}

export const mergeNoteFields = <T extends NoteFields, U extends Partial<NoteFields>>(base: T, override: U): T => {
  if (!override) return base

  return {
    ...base,
    ...(override.title !== undefined ? { title: override.title } : {}),
    ...(override.description !== undefined ? { description: override.description } : {}),
    ...(override.tags !== undefined ? { tags: override.tags } : {}),
    ...(override.created_at !== undefined ? { created_at: override.created_at } : {}),
    ...(override.updated_at !== undefined ? { updated_at: override.updated_at } : {}),
    ...(override.user_id !== undefined ? { user_id: override.user_id } : {}),
  }
}
