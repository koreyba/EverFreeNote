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

/** How several tags combine: every tag, or at least one of them. */
export type TagMatch = 'all' | 'any'

export type ListNotesParams = {
  /** Case-insensitive substring matched against title and body. */
  query: string | null
  /** Exact tag values; empty means no tag filter. */
  tags: string[]
  /** Only meaningful when more than one tag is given. */
  tagMatch: TagMatch
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

export type TagVocabulary = {
  tags: { name: string; count: number }[]
  /** Notes carrying at least one tag that were scanned. */
  total: number
  /** True when the scan hit its cap, so the vocabulary may be incomplete. */
  truncated: boolean
}

export type EditNoteTagsInput = {
  add: string[]
  remove: string[]
}

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
  /** Every tag the user has, with the number of notes carrying it. */
  listTags(): Promise<TagVocabulary>
  /**
   * Adds and removes individual tags without disturbing the rest.
   * Resolves `null` when the note does not exist or belongs to another user.
   */
  editNoteTags(id: string, edit: EditNoteTagsInput): Promise<NoteRecord | null>
}
