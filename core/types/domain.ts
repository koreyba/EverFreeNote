import type { FtsSearchResult, Tables, TablesInsert, TablesUpdate } from '@/supabase/types'

export type Note = Tables<'notes'>
export type NoteInsert = TablesInsert<'notes'>
export type NoteUpdate = TablesUpdate<'notes'>

export type SearchResult = FtsSearchResult

export type Tag = string

export type NoteViewModel = Note & {
  content?: string | null
  headline?: string | null
  rank?: number | null
}
