// Shared contracts for the notebook MCP server.
//
// This directory is consumed by both Node (Jest, web) and Deno (Supabase Edge
// Function `mcp`). Keep imports relative with explicit `.ts` extensions and do
// not use `@/` path aliases, otherwise Deno cannot resolve them.

/** A note row as exposed to MCP tools. `contentHtml` is the editor's HTML (DB column `description`). */
export type NoteRecord = {
  id: string
  title: string
  contentHtml: string
  tags: string[]
  created_at: string | null
  updated_at: string | null
}

export type ListNotesParams = {
  /** Case-insensitive substring matched against title and body. */
  query: string | null
  /** Exact tag filter. */
  tag: string | null
  /** 1..100 */
  limit: number
  /** >= 0 */
  offset: number
}

export type ListNotesResult = {
  notes: NoteRecord[]
  /** Total number of notes matching the filters (ignores pagination). */
  total: number
}

export type CreateNoteInput = {
  title: string
  contentHtml: string
  tags: string[]
}

export type UpdateNotePatch = Partial<CreateNoteInput>

/**
 * Data access boundary for the MCP tools. Implementations must already be
 * scoped to a single user (the Supabase implementation relies on RLS plus an
 * explicit `user_id` filter).
 */
export interface NotebookRepository {
  listNotes(params: ListNotesParams): Promise<ListNotesResult>
  /** Resolves `null` when the note does not exist or belongs to another user. */
  getNote(id: string): Promise<NoteRecord | null>
  createNote(input: CreateNoteInput): Promise<NoteRecord>
  /** Resolves `null` when nothing was updated (missing or foreign note). */
  updateNote(id: string, patch: UpdateNotePatch): Promise<NoteRecord | null>
}
