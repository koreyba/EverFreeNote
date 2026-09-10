// MCP server exposing the user's notebook: list/search, read, create, update.
//
// Runtime-agnostic: depends only on a NotebookRepository. The Supabase Edge
// Function wires it to a Streamable HTTP transport; tests wire it to an
// in-memory transport with a fake repository.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

import { buildExcerpt, htmlToPlainText } from './noteContent.ts'
import { sanitizeNoteHtml } from './noteHtml.ts'
import { describeEmptyResult, type SemanticSearch } from './semanticSearch.ts'
import { filterTags } from './tagVocabulary.ts'
import type { EditNoteTagsInput, NotebookRepository, NoteRecord, TagMatch } from './types.ts'

export const NOTEBOOK_MCP_SERVER_INFO = {
  name: 'everfreenote-notebook',
  title: 'EverFreeNote notebook',
  version: '1.0.0',
} as const

export const NOTEBOOK_MCP_INSTRUCTIONS = [
  "This server gives access to the signed-in user's EverFreeNote notebook.",
  'Finding notes: list_notes matches text and tags, search_notes_semantic matches meaning when it is available.',
  'Both return short summaries; call get_note for the full body of the ones that look right.',
  'Use list_tags to learn which tags exist before filtering by one.',
  'Writing: create_note adds a note, update_note replaces fields, and edit_note_tags adds or removes',
  'individual tags without touching the others. Prefer it over update_note when only tags change.',
  'Deleting notes is not available.',
  'Note bodies are HTML produced by the EverFreeNote editor; when writing, convert Markdown into that HTML.',
].join(' ')

export const DEFAULT_LIST_LIMIT = 20
export const MAX_LIST_LIMIT = 100
export const MAX_QUERY_LENGTH = 200
export const MAX_TITLE_LENGTH = 1000
export const MAX_TAGS = 50
export const MAX_TAG_LENGTH = 100
export const MAX_TAG_FILTERS = 20
export const DEFAULT_TAG_LIST_LIMIT = 100
export const MAX_TAG_LIST_LIMIT = 500
export const DEFAULT_SEMANTIC_LIMIT = 10
export const MAX_SEMANTIC_LIMIT = 50

const NOTE_BODY_FORMAT_HINT =
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
const contentHtmlSchema = z.string().describe(NOTE_BODY_FORMAT_HINT)

const listNotesInputShape = {
  query: z
    .string()
    .trim()
    .min(1)
    .max(MAX_QUERY_LENGTH)
    .optional()
    .describe('Text to look for in the title or body (substring match)'),
  tags: z
    .array(tagFilterSchema)
    .max(MAX_TAG_FILTERS)
    .optional()
    .describe('Only notes carrying these exact tags; use list_tags to get the exact spellings'),
  tag_match: z
    .enum(['all', 'any'])
    .default('all')
    .describe('With several tags: "all" requires every tag, "any" requires at least one'),
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

const listTagsInputShape = {
  query: z
    .string()
    .trim()
    .min(1)
    .max(MAX_TAG_LENGTH)
    .optional()
    .describe('Only tags containing this text (case-insensitive)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_TAG_LIST_LIMIT)
    .default(DEFAULT_TAG_LIST_LIMIT)
    .describe(`Maximum tags to return, 1-${MAX_TAG_LIST_LIMIT}`),
}
export const listTagsInputSchema = z.object(listTagsInputShape)

const listTagsOutputShape = {
  tags: z.array(
    z.object({
      name: z.string(),
      count: z.number().int().positive().describe('Notes carrying this tag'),
    }),
  ),
  total: z.number().int().nonnegative().describe('Distinct tags found before the limit was applied'),
  truncated: z.boolean().describe('True when not every note could be scanned, so the list may be incomplete'),
}

const editNoteTagsInputShape = {
  id: noteIdSchema,
  add: tagsSchema.optional().describe('Tags to add; ones already present are ignored'),
  remove: tagsSchema.optional().describe('Tags to remove, matched case-insensitively; absent ones are ignored'),
}
export const editNoteTagsInputSchema = z.object(editNoteTagsInputShape)

const searchNotesSemanticInputShape = {
  query: z.string().trim().min(1).max(MAX_QUERY_LENGTH).describe('What to look for, in natural language'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_SEMANTIC_LIMIT)
    .default(DEFAULT_SEMANTIC_LIMIT)
    .describe(`Maximum notes to return, 1-${MAX_SEMANTIC_LIMIT}`),
  min_similarity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Overrides the notebook's configured similarity threshold"),
  tag: tagFilterSchema.optional().describe('Restrict the search to notes carrying exactly this tag'),
}
export const searchNotesSemanticInputSchema = z.object(searchNotesSemanticInputShape)

const searchNotesSemanticOutputShape = {
  notes: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      tags: z.array(z.string()),
      similarity: z.number().describe('Similarity of the best matching passage, 0..1'),
      excerpts: z.array(z.string()).describe('Matching passages, as plain text'),
    }),
  ),
  total: z.number().int().nonnegative(),
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
export type ListTagsInput = z.infer<typeof listTagsInputSchema>
export type EditNoteTagsToolInput = z.infer<typeof editNoteTagsInputSchema>
export type SearchNotesSemanticInput = z.infer<typeof searchNotesSemanticInputSchema>
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
    excerpt: buildExcerpt(note.contentHtml),
  }
}

export function toNoteDetail(note: NoteRecord): NoteDetail {
  return {
    id: note.id,
    title: note.title,
    tags: note.tags,
    created_at: note.created_at,
    updated_at: note.updated_at,
    content_html: note.contentHtml,
    content_text: htmlToPlainText(note.contentHtml),
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

export function createNotebookMcpServer(
  repository: NotebookRepository,
  semanticSearch?: SemanticSearch,
): McpServer {
  const server = new McpServer(NOTEBOOK_MCP_SERVER_INFO, { instructions: NOTEBOOK_MCP_INSTRUCTIONS })

  // Callback arguments are annotated explicitly: the SDK's generic inference
  // works under Node's TypeScript but not under Deno's, which type-checks the
  // Edge Function.

  server.registerTool(
    'list_notes',
    {
      title: 'List or search notes',
      description:
        'Lists the most recently updated notes, newest first. Optionally filter by a case-insensitive ' +
        'text query (matched against title and body) and/or by tags. Returns summaries with a short ' +
        'excerpt, not full bodies: call get_note for the ones you need. Use offset for pagination.',
      inputSchema: listNotesInputShape,
      outputSchema: listNotesOutputShape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ query, tags, tag_match, limit, offset }: ListNotesInput) => {
      try {
        const result = await repository.listNotes({
          query: query ?? null,
          tags: tags ?? [],
          tagMatch: tag_match as TagMatch,
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
          contentHtml: sanitizeNoteHtml(content_html),
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
          ...(content_html === undefined ? {} : { contentHtml: sanitizeNoteHtml(content_html) }),
          ...(tags === undefined ? {} : { tags: normalizeTags(tags) }),
        })
        if (!note) return errorResult('Note not found')
        return successResult(toNoteDetail(note))
      } catch (error) {
        return errorResult(`Failed to update note: ${describeToolError(error)}`)
      }
    },
  )

  server.registerTool(
    'list_tags',
    {
      title: 'List tags',
      description:
        'Lists every tag used in the notebook with the number of notes carrying it, most used first. ' +
        'Call this before filtering by a tag so you use the exact spelling the notebook stores.',
      inputSchema: listTagsInputShape,
      outputSchema: listTagsOutputShape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ query, limit }: ListTagsInput) => {
      try {
        const vocabulary = await repository.listTags()
        const matching = filterTags(vocabulary.tags, query ?? null)

        return successResult({
          tags: matching.slice(0, limit),
          total: matching.length,
          truncated: vocabulary.truncated,
        })
      } catch (error) {
        return errorResult(`Failed to list tags: ${describeToolError(error)}`)
      }
    },
  )

  server.registerTool(
    'edit_note_tags',
    {
      title: 'Add or remove tags on a note',
      description:
        'Adds and/or removes individual tags on one note, leaving its other tags untouched. Prefer this ' +
        'over update_note whenever only tags change: update_note replaces the whole list and would drop ' +
        'tags added meanwhile. Adding a tag that is already present, or removing one that is absent, ' +
        'succeeds and changes nothing.',
      inputSchema: editNoteTagsInputShape,
      outputSchema: noteDetailShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ id, add, remove }: EditNoteTagsToolInput) => {
      const edit: EditNoteTagsInput = { add: normalizeTags(add), remove: normalizeTags(remove) }
      if (edit.add.length === 0 && edit.remove.length === 0) {
        return errorResult('Provide at least one tag to add or remove')
      }

      try {
        const note = await repository.editNoteTags(id, edit)
        if (!note) return errorResult('Note not found')
        return successResult(toNoteDetail(note))
      } catch (error) {
        return errorResult(`Failed to edit tags: ${describeToolError(error)}`)
      }
    },
  )

  if (semanticSearch) {
    server.registerTool(
      'search_notes_semantic',
      {
        title: 'Search notes by meaning',
        description:
          'Finds notes whose content is close in meaning to the query, even when the wording differs. ' +
          'Uses the notebook owner\'s own AI index and spends their embedding quota, so prefer list_notes ' +
          'when a literal word or tag would do. Returns one entry per note with matching passages; call ' +
          'get_note for the full text.',
        inputSchema: searchNotesSemanticInputShape,
        outputSchema: searchNotesSemanticOutputShape,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      },
      async ({ query, limit, min_similarity, tag }: SearchNotesSemanticInput) => {
        try {
          const outcome = await semanticSearch.search({
            query,
            limit,
            minSimilarity: min_similarity ?? null,
            tag: tag ?? null,
          })

          // A missing key or a stale index is a setup gap to relay, not a failure to retry.
          if (outcome.status === 'unavailable') return errorResult(outcome.message)

          if (outcome.notes.length === 0) {
            // Say why nothing came back, but keep structuredContent matching the schema.
            return {
              content: [{ type: 'text', text: describeEmptyResult(min_similarity ?? null) }],
              structuredContent: { notes: [], total: 0 },
            }
          }

          return successResult({ notes: outcome.notes, total: outcome.notes.length })
        } catch (error) {
          return errorResult(`Semantic search failed: ${describeToolError(error)}`)
        }
      },
    )
  }

  return server
}
