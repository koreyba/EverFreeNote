// MCP server exposing the user's notebook: list/search, read, create, update.
//
// Runtime-agnostic: depends only on a NotebookRepository. The Supabase Edge
// Function wires it to a Streamable HTTP transport; tests wire it to an
// in-memory transport with a fake repository.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

import { buildExcerpt, htmlToPlainText } from './noteContent.ts'
import type { NotebookRepository, NoteRecord } from './types.ts'

export const NOTEBOOK_MCP_SERVER_INFO = {
  name: 'everfreenote-notebook',
  title: 'EverFreeNote notebook',
  version: '1.0.0',
} as const

export const NOTEBOOK_MCP_INSTRUCTIONS = [
  "This server gives access to the signed-in user's EverFreeNote notebook.",
  'Use list_notes to find notes (optionally filtered by a text query or a tag), get_note to read one note,',
  'create_note to add a note and update_note to change an existing note. Deleting notes is not available.',
  'Note bodies are HTML produced by the EverFreeNote editor; when writing, convert Markdown into that HTML.',
].join(' ')

export const DEFAULT_LIST_LIMIT = 20
export const MAX_LIST_LIMIT = 100
export const MAX_QUERY_LENGTH = 200
export const MAX_TITLE_LENGTH = 1000
export const MAX_TAGS = 50
export const MAX_TAG_LENGTH = 100

const CONTENT_HTML_DESCRIPTION =
  'Note body as HTML understood by the EverFreeNote editor: <p>, <h1>-<h3>, <ul>/<ol>/<li>, <strong>, <em>, <u>, <s>, ' +
  '<a href>, <code>, <pre>, <blockquote>, <hr>, <img src>, <mark>. Convert Markdown to this HTML before sending; ' +
  'wrap plain paragraphs in <p> elements.'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const timestampSchema = z.string().nullable()

const noteSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  excerpt: z.string().describe('Plain-text preview of the note body'),
})

const noteDetailShape = {
  id: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  content_html: z.string().describe('Full note body as editor HTML'),
  content_text: z.string().describe('Full note body converted to plain text'),
}
export const noteDetailSchema = z.object(noteDetailShape)

const noteIdSchema = z.uuid().describe('Note id (UUID) as returned by list_notes')
const titleSchema = z.string().trim().min(1).max(MAX_TITLE_LENGTH)
const tagFilterSchema = z.string().trim().min(1).max(MAX_TAG_LENGTH)
// Individual tags may be blank: normalizeTags() drops them instead of failing the whole call.
const tagItemSchema = z.string().trim().max(MAX_TAG_LENGTH)
const tagsSchema = z.array(tagItemSchema).max(MAX_TAGS).describe('Tags; blanks and duplicates are dropped')
const contentHtmlSchema = z.string().describe(CONTENT_HTML_DESCRIPTION)

const listNotesInputShape = {
  query: z
    .string()
    .trim()
    .min(1)
    .max(MAX_QUERY_LENGTH)
    .optional()
    .describe('Text to look for in the title or body (substring match)'),
  tag: tagFilterSchema.optional().describe('Only notes carrying exactly this tag'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_LIST_LIMIT)
    .default(DEFAULT_LIST_LIMIT)
    .describe(`Page size, 1-${MAX_LIST_LIMIT}`),
  offset: z.number().int().min(0).default(0).describe('Number of notes to skip'),
}
export const listNotesInputSchema = z.object(listNotesInputShape)

const listNotesOutputShape = {
  notes: z.array(noteSummarySchema),
  total: z.number().int().nonnegative().describe('Total matches ignoring pagination'),
  has_more: z.boolean(),
}

const getNoteInputShape = { id: noteIdSchema }
export const getNoteInputSchema = z.object(getNoteInputShape)

const createNoteInputShape = {
  title: titleSchema.describe('Note title'),
  content_html: contentHtmlSchema.default(''),
  tags: tagsSchema.default([]),
}
export const createNoteInputSchema = z.object(createNoteInputShape)

const updateNoteInputShape = {
  id: noteIdSchema,
  title: titleSchema.optional().describe('New title'),
  content_html: contentHtmlSchema.optional(),
  tags: tagsSchema.optional().describe('Full replacement tag list'),
}
export const updateNoteInputSchema = z.object(updateNoteInputShape)

export type NoteSummary = z.infer<typeof noteSummarySchema>
export type NoteDetail = z.infer<typeof noteDetailSchema>
export type ListNotesInput = z.infer<typeof listNotesInputSchema>
export type GetNoteInput = z.infer<typeof getNoteInputSchema>
export type CreateNoteToolInput = z.infer<typeof createNoteInputSchema>
export type UpdateNoteToolInput = z.infer<typeof updateNoteInputSchema>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Trims tags, drops blanks and exact duplicates while keeping the original order. */
export function normalizeTags(tags: readonly string[] | undefined): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const rawTag of tags ?? []) {
    const tag = rawTag.trim()
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    normalized.push(tag)
  }

  return normalized
}

export function toNoteSummary(note: NoteRecord): NoteSummary {
  return {
    id: note.id,
    title: note.title,
    tags: note.tags,
    created_at: note.created_at,
    updated_at: note.updated_at,
    excerpt: buildExcerpt(note.description),
  }
}

export function toNoteDetail(note: NoteRecord): NoteDetail {
  return {
    id: note.id,
    title: note.title,
    tags: note.tags,
    created_at: note.created_at,
    updated_at: note.updated_at,
    content_html: note.description,
    content_text: htmlToPlainText(note.description),
  }
}

export function describeToolError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return 'Unexpected error'
}

function successResult(structured: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(structured, null, 2) }],
    structuredContent: structured,
  }
}

function errorResult(message: string): CallToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text: message }],
  }
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

export function createNotebookMcpServer(repository: NotebookRepository): McpServer {
  const server = new McpServer(NOTEBOOK_MCP_SERVER_INFO, { instructions: NOTEBOOK_MCP_INSTRUCTIONS })

  // Callback arguments are annotated explicitly: the SDK's generic inference
  // works under Node's TypeScript but not under Deno's, which type-checks the
  // Edge Function.

  server.registerTool(
    'list_notes',
    {
      title: 'List or search notes',
      description:
        'Lists the most recently updated notes. Optionally filter by a case-insensitive text query ' +
        '(matched against title and body) and/or by an exact tag. Use offset for pagination.',
      inputSchema: listNotesInputShape,
      outputSchema: listNotesOutputShape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ query, tag, limit, offset }: ListNotesInput) => {
      try {
        const result = await repository.listNotes({
          query: query ?? null,
          tag: tag ?? null,
          limit,
          offset,
        })

        return successResult({
          notes: result.notes.map(toNoteSummary),
          total: result.total,
          has_more: offset + result.notes.length < result.total,
        })
      } catch (error) {
        return errorResult(`Failed to list notes: ${describeToolError(error)}`)
      }
    },
  )

  server.registerTool(
    'get_note',
    {
      title: 'Read a note',
      description: 'Returns the full content of one note (HTML and plain text) together with its title and tags.',
      inputSchema: getNoteInputShape,
      outputSchema: noteDetailShape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ id }: GetNoteInput) => {
      try {
        const note = await repository.getNote(id)
        if (!note) return errorResult('Note not found')
        return successResult(toNoteDetail(note))
      } catch (error) {
        return errorResult(`Failed to read note: ${describeToolError(error)}`)
      }
    },
  )

  server.registerTool(
    'create_note',
    {
      title: 'Create a note',
      description: 'Creates a new note in the notebook and returns it.',
      inputSchema: createNoteInputShape,
      outputSchema: noteDetailShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ title, content_html, tags }: CreateNoteToolInput) => {
      try {
        const note = await repository.createNote({
          title,
          description: content_html,
          tags: normalizeTags(tags),
        })
        return successResult(toNoteDetail(note))
      } catch (error) {
        return errorResult(`Failed to create note: ${describeToolError(error)}`)
      }
    },
  )

  server.registerTool(
    'update_note',
    {
      title: 'Update a note',
      description:
        'Updates the title, body and/or tags of an existing note. Provided fields replace the current ' +
        'values entirely (send the full new body, not a diff). Returns the updated note.',
      inputSchema: updateNoteInputShape,
      outputSchema: noteDetailShape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ id, title, content_html, tags }: UpdateNoteToolInput) => {
      if (title === undefined && content_html === undefined && tags === undefined) {
        return errorResult('Provide at least one of title, content_html or tags')
      }

      try {
        const note = await repository.updateNote(id, {
          ...(title === undefined ? {} : { title }),
          ...(content_html === undefined ? {} : { description: content_html }),
          ...(tags === undefined ? {} : { tags: normalizeTags(tags) }),
        })
        if (!note) return errorResult('Note not found')
        return successResult(toNoteDetail(note))
      } catch (error) {
        return errorResult(`Failed to update note: ${describeToolError(error)}`)
      }
    },
  )

  return server
}
