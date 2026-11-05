// MCP server exposing the user's notebook: list/search, read, create, update.
//
// Runtime-agnostic: depends only on a NotebookRepository. The Supabase Edge
// Function wires it to a Streamable HTTP transport; tests wire it to an
// in-memory transport with a fake repository.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

import { buildExcerpt, htmlToPlainText } from './noteContent.ts'
import { applyContentEdits, contentEditSchema } from './noteEdits.ts'
import {
  notebookSearchInputShape, notebookSearchInputSchema, notebookSearchOutputShape,
  type NotebookSearchInput, type NotebookSemanticSearch,
} from './notebookSearch.ts'
import { sanitizeNoteHtml } from './noteHtml.ts'
import { describeEmptyResult, type SemanticSearch } from './semanticSearch.ts'
import { filterTags } from './tagVocabulary.ts'
import type { EditNoteTagsInput, NotebookRepository, NoteRecord, TagMatch } from './types.ts'

export const NOTEBOOK_MCP_SERVER_INFO = {
  name: 'everfreenote-notebook',
  title: 'EverFreeNote notebook',
  version: '1.1.0',
} as const

export const NOTEBOOK_MCP_INSTRUCTIONS = [
  "This server gives access to the signed-in user's EverFreeNote notebook.",
  'Finding notes: list_notes matches text and tags, search_notes_semantic matches meaning when it is available.',
  'search_notes adds ranked text/semantic/hybrid search with date ranges and multiple tags. Search results are summaries; use get_note or get_notes to read bodies.',
  'Use list_tags to learn which tags exist before filtering by one.',
  'Writing: create_note adds a note; update_note supports content_edits for partial block edits with expected_updated_at from a prior read. Legacy fields replace values. edit_note_tags adds or removes',
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
  expected_updated_at: z.iso.datetime({ offset: true }).nullable().optional().describe('Exact updated_at from get_note; required for content_edits. A stale version causes a conflict.'),
  content_edits: z.array(contentEditSchema).min(1).max(20).optional().describe('Sequential HTML block edits; anchors must match exactly once and contain complete top-level blocks. Cannot combine with content_html.'),
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
  notebookSemanticSearch?: NotebookSemanticSearch,
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

  server.registerTool('get_notes', {
    title: 'Read several notes',
    description: 'Read up to 50 unique note ids in one call, in requested order. Text by default. max_chars bounds total body characters; every id receives ok, not_found or limit_exceeded. Bodies are never silently truncated; use get_note for an over-budget note.',
    inputSchema: {
      ids: z.array(noteIdSchema).min(1).max(50).refine(ids => new Set(ids).size === ids.length, 'ids must be unique'),
      format: z.enum(['text', 'html']).default('text'),
      max_chars: z.number().int().min(1000).max(500_000).default(100_000),
    },
    outputSchema: {
      notes: z.array(z.object({
        id: z.string(),
        status: z.enum(['ok', 'not_found', 'limit_exceeded']),
        title: z.string().optional(), tags: z.array(z.string()).optional(),
        created_at: timestampSchema.optional(), updated_at: timestampSchema.optional(),
        content: z.string().optional(), content_format: z.enum(['text', 'html']).optional(),
        content_length: z.number().int().nonnegative().optional(),
      })),
      partial: z.boolean(), total_requested: z.number().int().positive(),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ ids, format, max_chars }: { ids: string[]; format: 'text' | 'html'; max_chars: number }) => {
    try {
      const rows = await repository.getNotes(ids)
      const byId = new Map(rows.map(note => [note.id, note]))
      let remaining = max_chars
      const notes = ids.map(id => {
        const note = byId.get(id)
        if (!note) return { id, status: 'not_found' as const }
        const content = format === 'html' ? note.contentHtml : htmlToPlainText(note.contentHtml)
        const metadata = {
          id, title: note.title, tags: note.tags,
          created_at: note.created_at, updated_at: note.updated_at,
          content_format: format, content_length: content.length,
        }
        if (content.length > remaining) return { ...metadata, status: 'limit_exceeded' as const }
        remaining -= content.length
        return { ...metadata, status: 'ok' as const, content }
      })
      return successResult({ notes, partial: notes.some(note => note.status !== 'ok'), total_requested: ids.length })
    } catch (error) { return errorResult(`Failed to read notes: ${describeToolError(error)}`) }
  })

  server.registerTool('search_notes', {
    title: 'Search and rank notebook notes',
    description: 'Search by words, meaning or both. Filter by creation/update timestamps and several case-insensitive tags before ranking and pagination. Text mode is free; semantic/hybrid spend Gemini quota and require an index. Hybrid falls back to text with a warning only when AI search is not configured.',
    inputSchema: notebookSearchInputShape, outputSchema: notebookSearchOutputShape,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (args: NotebookSearchInput) => {
    try {
      const parsed = notebookSearchInputSchema.safeParse(args)
      if (!parsed.success) return errorResult(parsed.error.issues.map(issue => issue.message).join('; '))
      const input = parsed.data
      if (input.mode === 'text') return successResult(await repository.searchNotes(input))
      const outcome = notebookSemanticSearch
        ? await notebookSemanticSearch.searchNotes(input)
        : { status: 'unavailable' as const, message: 'Semantic search is not configured on this server.' }
      if (outcome.status === 'ok') return successResult(outcome.result)
      if (input.mode === 'semantic') return errorResult(outcome.message)
      const fallback = await repository.searchNotes({ ...input, mode: 'text' })
      return successResult({ ...fallback, warnings: [outcome.message] })
    } catch (error) { return errorResult(`Failed to search notes: ${describeToolError(error)}`) }
  })

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
        'Updates title, body or tags. content_html replaces the whole body. Prefer content_edits to append/prepend, insert before/after or replace exact complete HTML blocks. Read with get_note first and pass its exact expected_updated_at to detect conflicts. Edits apply sequentially and cannot combine with content_html. Returns the updated note.',
      inputSchema: updateNoteInputShape,
      outputSchema: noteDetailShape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ id, title, content_html, tags, content_edits, expected_updated_at }: UpdateNoteToolInput) => {
      if (content_html !== undefined && content_edits !== undefined) return errorResult('content_html and content_edits cannot be combined')
      if (content_edits !== undefined && expected_updated_at === undefined) return errorResult('content_edits requires expected_updated_at from get_note')
      if (title === undefined && content_html === undefined && tags === undefined && content_edits === undefined) {
        return errorResult('Provide at least one of title, content_html or tags')
      }

      try {
        let body = content_html === undefined ? undefined : sanitizeNoteHtml(content_html)
        if (content_edits !== undefined) {
          const current = await repository.getNote(id)
          if (!current) return errorResult('Note not found')
          body = applyContentEdits(current.contentHtml, content_edits)
        }
        const patch = {
          ...(title === undefined ? {} : { title }),
          ...(body === undefined ? {} : { contentHtml: body }),
          ...(tags === undefined ? {} : { tags: normalizeTags(tags) }),
        }
        const note = expected_updated_at === undefined
          ? await repository.updateNote(id, patch)
          : await repository.updateNoteIfVersion(id, patch, expected_updated_at)
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
